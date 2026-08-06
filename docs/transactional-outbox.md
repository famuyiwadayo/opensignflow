# Transactional Outbox Pattern

**Status:** Architecture and contributor implementation guide  
**Scope:** durable API-to-worker handoff for signing email and all future asynchronous workflows.

---

## 1. Why this exists

OpenSignFlow changes durable business state in PostgreSQL and performs slow or failure-prone work asynchronously through Redis, BullMQ, email providers, PDF tooling, AI providers, and webhooks.

Those systems cannot share one atomic transaction.

A naive send flow is unsafe:

```txt
PostgreSQL transaction commits
  ├─ document → SENT
  ├─ signing requests created
  └─ audit event created
        ↓
API calls Redis/BullMQ queue.add()
        ↓
Redis is unavailable, waits indefinitely, or errors
```

That can leave a document marked `SENT` without a durable email-delivery request.

The transactional outbox pattern makes PostgreSQL the durable source of truth for the intent to perform asynchronous work.

---

## 2. Core guarantee

For a successful `POST /v1/documents/{documentId}/send`, one PostgreSQL transaction creates all of the following together:

```txt
Document status transition to SENT
SigningRequest records with token hashes
DOCUMENT_SENT audit event
Encrypted SEND_SIGNING_EMAIL OutboxEvent records
```

Therefore, after a successful HTTP response, the system guarantees either:

```txt
Nothing was committed
```

or:

```txt
The document is sent and durable dispatch work exists for every signer.
```

The API does not wait for Redis, BullMQ, a worker, Mailpit, Resend, or recipient inbox delivery.

---

## 3. What an outbox event is

`OutboxEvent` is a PostgreSQL persistence record representing durable asynchronous intent.

```txt
OutboxEvent
  id
  organizationId
  type
  status
  resourceType
  resourceId
  encryptedPayload
  encryptionKeyVersion
  attemptCount
  availableAt
  lockedAt
  lockedBy
  dispatchedAt
  lastError
  createdAt
  updatedAt
```

The Prisma schema lives in:

```txt
packages/database/prisma/schema.prisma
```

The initial event type is:

```txt
SEND_SIGNING_EMAIL
```

Future types may include:

```txt
SEND_CC_NOTIFICATION
FINALIZE_COMPLETED_DOCUMENT
SEND_COMPLETION_EMAIL
EXTRACT_DOCUMENT_TEXT
REQUEST_AI_SUMMARY
REQUEST_AI_FIELD_SUGGESTIONS
DELIVER_WEBHOOK
```

Event types are Prisma enums, not arbitrary strings. Adding one requires a migration, payload contract, handler, tests, and documentation.

---

## 4. End-to-end flow

### 4.1 API write-side flow

```txt
Authenticated owner calls POST /documents/{documentId}/send
        ↓
Validate organization, draft status, roles, recipients, and fields
        ↓
Generate one random signing token per signer
        ↓
One PostgreSQL transaction
  ├─ transition document DRAFT → SENT
  ├─ create signing requests with SHA-256(token)
  ├─ update signer recipient state
  ├─ write DOCUMENT_SENT audit event
  └─ encrypt and create one OutboxEvent per signer
        ↓
Commit
        ↓
Return 200 response immediately
```

The plaintext signing token is never stored in `SigningRequest`. It exists only in memory while the request is being built, encrypted in the outbox, and later in a short-lived BullMQ job payload.

### 4.2 Worker dispatch-side flow

```txt
Worker startup validates DATABASE_URL, REDIS_URL, and OUTBOX_ENCRYPTION_KEY
        ↓
OutboxDispatcherService polls eligible PENDING events
        ↓
Atomically claims one event
        ↓
Decrypts versioned payload
        ↓
Finds handler for event.type
        ↓
Handler validates payload and publishes BullMQ job
        ↓
Outbox event → DISPATCHED
        ↓
BullMQ processor performs provider work
```

### 4.3 Signing-email example

```txt
SEND_SIGNING_EMAIL OutboxEvent
        ↓
SigningEmailOutboxHandler
        ↓
opensignflow-signing-email BullMQ queue
        ↓
SigningEmailProcessor
        ↓
Mailpit locally / Resend in production
```

---

## 5. Encryption and token safety

Signing tokens are bearer credentials. Anyone holding one can access its associated public signing request.

### Database rules

```txt
SigningRequest.tokenHash
  stores SHA-256(plaintext token)

OutboxEvent.encryptedPayload
  stores AES-256-GCM ciphertext temporarily
```

The encrypted envelope contains:

```txt
keyVersion
initializationVector
authenticationTag
ciphertext
```

The crypto implementation lives in:

```txt
packages/crypto
```

The key comes from root environment configuration:

```env
OUTBOX_ENCRYPTION_KEY=<base64 encoded 32-byte key>
OUTBOX_ENCRYPTION_KEY_VERSION=1
```

### Never log or persist plaintext tokens in

```txt
SigningRequest rows
AuditEvent metadata
JobRecord rows
DLQ payloads
API responses
application logs
exception messages
analytics payloads
```

---

## 6. Versioned payload contracts

All outbox plaintext is wrapped before encryption:

```ts
type OutboxPayloadEnvelope<TType extends string, TPayload> = {
  version: 1;
  type: TType;
  payload: TPayload;
};
```

Shared contracts live in:

```txt
packages/shared/src/outbox/
```

A signing-email example:

```json
{
  "version": 1,
  "type": "SEND_SIGNING_EMAIL",
  "payload": {
    "signingRequestId": "sreq_...",
    "documentId": "doc_...",
    "recipientId": "rcp_...",
    "recipientEmail": "grace@example.com",
    "recipientName": "Grace Hopper",
    "documentTitle": "Service Agreement",
    "signingToken": "secret"
  }
}
```

The worker verifies:

```txt
Database event type = decrypted envelope type
Envelope version is supported
All handler-required fields are present and valid
```

A malformed payload is never queued. It retries or eventually fails with safe operational diagnostics.

---

## 7. Generic dispatcher and event handlers

The dispatcher must not contain domain-specific queue logic.

```txt
OutboxDispatcherService
  owns claiming, decrypting, routing, retries, and status updates

OutboxEventHandler
  owns one event type's payload validation and dispatch behavior
```

The worker handler contract is:

```ts
interface OutboxEventHandler<TPayload> {
  readonly type: OutboxEventType;
  parse(serializedPayload: string): TPayload;
  dispatch(input: { eventId: string; payload: TPayload }): Promise<void>;
}
```

The registry maps event type to one handler:

```txt
SEND_SIGNING_EMAIL
  → SigningEmailOutboxHandler

FINALIZE_COMPLETED_DOCUMENT
  → PdfFinalizationOutboxHandler

REQUEST_AI_SUMMARY
  → AiSummaryOutboxHandler
```

The current worker implementation lives in:

```txt
apps/worker/src/outbox/
  outbox-dispatcher.service.ts
  outbox-handler.interface.ts
  outbox-handler.registry.ts
  handlers/signing-email.outbox-handler.ts
```

A missing handler must not silently drop an event. It causes a safe dispatch failure that remains visible in the outbox record.

---

## 8. Claiming, retries, and idempotency

### Claiming

Multiple worker replicas may run concurrently. A worker claims an event by atomically changing:

```txt
PENDING → PROCESSING
```

with:

```txt
lockedAt
lockedBy
attemptCount increment
```

Only the worker whose conditional update succeeds may dispatch the event.

### Retry

On temporary dispatch failure:

```txt
PROCESSING → PENDING
availableAt → future retry time
attemptCount → incremented
```

After the maximum attempt count:

```txt
PROCESSING → FAILED
```

### Idempotent BullMQ job IDs

Handlers use stable job IDs such as:

```txt
signing-request-<signingRequestId>
```

This avoids unlimited duplicate queue jobs if a worker receives an uncertain Redis response and retries dispatch.

### Remaining hardening work

The current dispatcher establishes atomic claiming but still needs lease-expiration recovery:

```txt
PROCESSING event with expired lockedAt
  → eligible for safe recovery by another worker
```

This is required before production-scale worker replicas.

---

## 9. Status meaning

| Outbox status | Meaning                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| `PENDING`     | Durable dispatch work exists and can be claimed.                                           |
| `PROCESSING`  | One worker currently holds a lease/claim.                                                  |
| `DISPATCHED`  | The matching handler successfully handed work to its downstream mechanism, usually BullMQ. |
| `FAILED`      | Dispatch attempts were exhausted or a non-recoverable failure occurred.                    |

`DISPATCHED` does not mean email inbox delivery succeeded. It means:

```txt
PostgreSQL outbox → BullMQ handoff succeeded
```

Email-provider delivery is tracked later by the BullMQ job/processor lifecycle.

---

## 10. Responsibility boundaries

```txt
packages/database
  Prisma schema, migrations, generated client, OutboxEvent persistence

packages/crypto
  AES-256-GCM envelope encryption/decryption

packages/shared
  queue names, job contracts, versioned outbox payload contracts

packages/queue
  BullMQ/Redis connection and queue-worker infrastructure

apps/api
  validates business workflow and writes outbox records transactionally

apps/worker
  claims, decrypts, routes, dispatches, and processes asynchronous work
```

Do not place NestJS services, Prisma clients, BullMQ instances, email providers, or signing business logic in `packages/shared`.

---

## 11. Adding a new event type

Every new outbox event follows this checklist:

```txt
1. Add OutboxEventType enum value in Prisma schema.
2. Create and deploy migration.
3. Add versioned payload type in packages/shared/src/outbox.
4. Add API writer inside the relevant PostgreSQL business transaction.
5. Create worker handler implementing OutboxEventHandler.
6. Register handler in OutboxHandlerRegistry.
7. Add queue/job contract if downstream BullMQ work is needed.
8. Add retry/idempotency policy.
9. Add tests for success, malformed payload, missing handler, and retries.
10. Document the event's business and operational semantics.
```

---

## 12. Local operational workflow

```bash
bun run db:generate
bun run db:deploy
bun run dev
bun run dev:worker
```

Inspect local services:

```txt
Swagger:  http://localhost:4000/docs
Mailpit:  http://localhost:8025
Redis:    docker compose exec redis redis-cli CLIENT LIST
```

Inspect outbox records with Prisma Studio:

```bash
bun run db:studio
```

For local-only recovery, do not use `FLUSHDB` unless it is safe to clear every Redis key in the selected development database.

---

## 13. Horizontal worker scaling

I want the worker architecture to scale by adding worker replicas, not by placing workers behind an HTTP load balancer. The API is request-serving infrastructure and can sit behind an Ingress or Service. Workers are competing background consumers and need no public endpoint.

```txt
opensignflow-api
  Deployment + Service + Ingress

opensignflow-worker
  Deployment with one or more replicas
  no public Service required
```

Every worker replica has its own PostgreSQL LISTEN connection, its own outbox dispatcher, and its own BullMQ consumers.

### Notification is not ownership

PostgreSQL `NOTIFY` is a low-latency wake-up signal only. Multiple workers may receive the same event notification:

```txt
obx_123 committed
  ↓
worker-a receives notification
worker-b receives notification
worker-c receives notification
```

The conditional PostgreSQL claim establishes exclusive ownership:

```sql
UPDATE outbox_events
SET
  status = 'PROCESSING',
  locked_at = NOW(),
  locked_by = :workerId,
  attempt_count = attempt_count + 1
WHERE
  id = :eventId
  AND status = 'PENDING';
```

Exactly one worker gets `count = 1`; all others get `count = 0` and skip the event. Duplicate notifications are therefore safe.

### Recommended wake-up and recovery model

```txt
worker startup
  → catch-up scan for eligible events

PostgreSQL LISTEN / NOTIFY
  → direct conditional claim of notified event ID

periodic 30–60 second safety sweep
  → missed notifications
  → worker restart recovery
  → events whose availableAt has elapsed
  → expired processing leases
```

A notification payload contains only an outbox event ID. It must not contain signing tokens, recipient email addresses, or encrypted payload data.

### Leases and crash recovery

An event may be stranded when a worker crashes after claiming it:

```txt
PENDING → PROCESSING
worker crashes before dispatch
```

Outbox claims therefore require a lease. A future recovery query will identify events whose `lockedAt` is older than the configured lease duration and safely return them to `PENDING` for another worker to claim.

```txt
PROCESSING + expired lease
  → PENDING
  → another worker can dispatch
```

Worker identities should be observable. Kubernetes deployments should set `WORKER_ID` from the pod name or use `HOSTNAME`, rather than relying only on a process ID.

### Downstream idempotency

The database claim prevents normal duplicate ownership, but network uncertainty still exists. Every handler must define a stable downstream idempotency key.

For signing email:

```txt
signing-request-<signingRequestId>
```

BullMQ receives the same job ID on retry, preventing unlimited duplicate queue jobs.

### Scaling stages

Initially, one worker deployment may run both outbox dispatch and signing-email processing. As workload grows, capability-specific deployments can be introduced:

```txt
opensignflow-worker-delivery
  signing/completion emails and webhooks

opensignflow-worker-pdf
  final PDF generation and text extraction

opensignflow-worker-ai
  AI summaries, field suggestions, and risk checks
```

They share the durable outbox contract but consume only the queues/handlers appropriate to their capability.

## 14. Contributor rules

```txt
Never write an outbox event outside the transaction that creates its business intent.
Never put plaintext signing tokens in audit logs, DLQ payloads, or normal database columns.
Never add a free-text event type instead of a Prisma enum value.
Never add event-specific switch cases to the generic dispatcher.
Never mark an event DISPATCHED before the handler succeeds.
Never assume DISPATCHED means provider or inbox delivery succeeded.
Always add a shared payload contract and a handler for new event types.
Always make downstream job dispatch idempotent.
Use PostgreSQL notifications as a wake-up hint, never as durable event ownership.
Always implement lease recovery before relying on multiple worker replicas in production.
```
