# Signing, Delivery, and Token-Security Architecture

**Status:** Design and implementation reference  
**Scope:** authenticated document sending, signing requests, signing tokens, email delivery, queues, DLQ handling, transactional outbox, and the later public-signing flow.

This document describes how OpenSignFlow turns a draft document into a secure recipient signing experience. It distinguishes what is implemented today from the production-grade workflow that the next implementation slice will complete.

---

## 1. Goals

The signing workflow must provide the following properties:

1. **Authorization:** only an authenticated workspace member can send a document in their active organization.
2. **Document integrity:** a document cannot be edited after it has been sent.
3. **Recipient isolation:** each recipient receives a unique, unguessable signing link.
4. **Token confidentiality:** plaintext signing tokens are never stored in PostgreSQL, returned by the authenticated API, written to audit logs, or retained in DLQ payloads.
5. **Delivery reliability:** a successful database transaction cannot silently lose its associated email-delivery work when Redis or a provider is unavailable.
6. **Traceability:** workflow and delivery decisions are auditable without exposing secrets.
7. **Recoverability:** transient delivery failures retry automatically; exhausted failures enter a safe dead-letter workflow.
8. **Separation of concerns:** the API creates workflow state; a dedicated worker performs asynchronous delivery.

---

## 2. Terms and responsibilities

| Term | Meaning |
|---|---|
| **Document** | The workspace-owned PDF workflow resource. Its lifecycle starts in `DRAFT`. |
| **Recipient** | A person invited to complete fields on a document. A document can have multiple recipients. |
| **Document field** | A positioned signing/editor field, such as `SIGNATURE`, `TEXT`, or `DATE`, assigned to a document recipient. |
| **Signing request** | The server-side authorization record for one recipient to sign one document. It is not the email itself. |
| **Signing token** | A secret, random bearer credential embedded in a recipient’s signing link. Possession grants access only to that signing request’s public flow. |
| **Signing link** | The web URL containing the plaintext signing token, for example `https://app.example.com/sign/<token>`. |
| **Outbox event** | A durable database record created in the same transaction as business state. It guarantees later dispatch to asynchronous infrastructure. |
| **Primary queue** | The BullMQ queue used for active signing-email work. |
| **DLQ** | A dead-letter queue containing minimized operational information for jobs whose retry budget is exhausted. |
| **Worker** | The separate process that dispatches outbox records and processes queue jobs. |

### API responsibilities

`apps/api` is authoritative for request validation and durable business state:

- authenticate the sender;
- resolve the active organization;
- validate the document’s send requirements;
- transition document workflow state;
- create signing requests and token hashes;
- record audit events;
- create transactional outbox records.

The API must **not** send SMTP/Resend messages directly in an HTTP request and must **not** run BullMQ processors.

### Worker responsibilities

`apps/worker` owns asynchronous execution:

- dispatch pending outbox records to BullMQ;
- process signing-email jobs;
- render signing-request emails;
- deliver through Mailpit or Resend;
- retry transient failures;
- publish safe DLQ records after retries are exhausted;
- update operational job/outbox status.

---

## 3. Current repository layout

```txt
apps/api/src/
  signing/                    # authenticated document-send workflow
  jobs/
    queues/                   # API-side queue configuration/names
    signing-email/            # API producer boundary
    pdf-finalization/         # reserved producer boundary
    ai-analysis/              # reserved producer boundary

apps/worker/src/
  processors/
    signing-email/            # BullMQ signing-email consumer
    pdf-finalization/         # reserved
    ai-analysis/              # reserved
  mail/
    providers/                # Mailpit and Resend adapters
    templates/                # signing-request template

packages/shared/src/jobs/
  queue-names.ts              # framework-agnostic stable queue names
  signing-email.job.ts        # producer/consumer payload contracts
```

Queue names use hyphens, not colons. BullMQ reserves `:` when it generates internal Redis keys.

```txt
opensignflow-signing-email
opensignflow-pdf-finalization
opensignflow-ai-analysis
opensignflow-signing-email-dlq
```

---

## 4. Document workflow state

The relevant `DocumentStatus` values are:

```txt
DRAFT
SENT
VIEWED
PARTIALLY_SIGNED
COMPLETED
CANCELLED
```

The initial supported transition is:

```txt
DRAFT ── POST /v1/documents/{documentId}/send ──► SENT
```

A document may be sent only when all of these are true:

1. it belongs to the authenticated user’s active organization;
2. it is currently `DRAFT`;
3. it has at least one recipient;
4. it has at least one document field;
5. every field is assigned to a recipient on that document.

The API returns these standardized errors where appropriate:

| Condition | Error code |
|---|---|
| Document does not exist in active organization | `DOCUMENT_NOT_FOUND` |
| Document is no longer editable | `DOCUMENT_NOT_EDITABLE` |
| Document is already no longer a draft | `DOCUMENT_ALREADY_SENT` |
| Recipient/field prerequisites are missing | `DOCUMENT_SEND_REQUIREMENTS_NOT_MET` |

Once sent, recipient and field mutations are rejected. This prevents an owner from changing the signer, field layout, or signing requirements after a recipient has been invited.

---

## 5. Signing requests

A `SigningRequest` is created per recipient when a document is sent.

```txt
Document
  └─ Recipient A → SigningRequest A
  └─ Recipient B → SigningRequest B
  └─ Recipient C → SigningRequest C
```

The existing persistence model includes:

```txt
SigningRequest
  id
  documentId
  recipientId
  tokenHash
  status
  expiresAt
  sentAt
  viewedAt
  completedAt
  createdAt
  updatedAt
```

Important distinctions:

- a **recipient** identifies who is expected to act;
- a **signing request** identifies one specific invitation and access capability;
- a **token** authenticates public access to that invitation;
- a **submission** will later record the recipient’s completed signing action.

A recipient must not receive a token that can access another recipient’s request, even for the same document.

### Signing-request lifecycle

Planned lifecycle:

```txt
PENDING
  └─ email delivery accepted/sent → SENT
       └─ recipient opens signing link → VIEWED
            └─ recipient submits all required fields → COMPLETED

PENDING/SENT/VIEWED
  └─ expiration date passes → EXPIRED
  └─ owner cancels or revokes → REVOKED
```

The exact update from `PENDING` to `SENT` should eventually occur after successful provider acceptance, not merely when the API creates the request. This lets operational status accurately reflect delivery state.

---

## 6. Signing tokens and signing links

### Token generation

For every signing request, OpenSignFlow generates a high-entropy random token:

```ts
randomBytes(32).toString('base64url')
```

This produces a URL-safe, cryptographically random secret. It is not derived from user IDs, recipient IDs, timestamps, document IDs, or predictable values.

### Token hashing

The API calculates:

```txt
tokenHash = SHA-256(plaintextSigningToken)
```

Only `tokenHash` is stored in `SigningRequest.tokenHash`.

When a public signing endpoint later receives a token, it will:

1. hash the supplied token with SHA-256;
2. find the signing request by `tokenHash`;
3. reject missing, revoked, expired, or completed requests;
4. return only public-safe signing data.

### Why store a hash instead of the token?

A signing token is a bearer credential. Anyone who has it can use the signing link. Storing it in plaintext would turn a database leak, backup leak, SQL log, or support export into a direct signing-link compromise.

Hash-only storage means an attacker with database access can see token hashes, but cannot feasibly recover the original random token.

### Signing-link shape

The browser-facing link is intentionally a web URL, not a direct API URL:

```txt
https://app.example.com/sign/<plaintext-token>
```

For local development:

```txt
http://localhost:3000/sign/<plaintext-token>
```

The web page will later call public API endpoints such as:

```http
GET  /v1/signing-requests/{token}
POST /v1/signing-requests/{token}/submit
```

The token should not be included in an `Authorization` header because it is a request-specific public capability, not a user login session.

### Token handling rules

Plaintext signing tokens may exist only in short-lived memory or short-lived primary-queue payloads. They must not appear in:

```txt
PostgreSQL SigningRequest rows
AuditEvent metadata
JobRecord rows
application logs
exception messages
analytics events
HTTP API responses
DLQ payloads
```

Email links are inherently sensitive. Recipients should be advised not to forward them. A future high-assurance mode may add recipient email verification, OTP verification, or access-code protection.

---

## 7. Sending a document: desired durable flow

### Current functional flow

The current implementation validates a draft, creates signing requests, changes the document to `SENT`, writes `DOCUMENT_SENT`, and then enqueues signing-email jobs.

This demonstrates the API-to-worker boundary and local Mailpit delivery, but it has a reliability gap: a Redis outage after the database transaction commits can leave the document sent without a queued email.

Until the transactional outbox replaces this direct handoff, the API producer uses a five-second connection/enqueue deadline, disables Redis offline queuing, and logs safe resource identifiers on failure. The request must return a standardized `503 SERVICE_UNAVAILABLE` response rather than spin indefinitely. That response explicitly states that the document was sent but delivery could not be queued; it is an observability guard, not the final reliability solution.

### Target production flow: transactional outbox

The intended durable flow is:

```txt
Authenticated owner
  │
  ▼
POST /v1/documents/{documentId}/send
  │
  ├─ validate organization, document, recipients, fields
  │
  ▼
ONE PostgreSQL transaction
  ├─ set Document.status = SENT and sentAt
  ├─ create one SigningRequest per recipient
  ├─ store only SHA-256 token hashes in signing requests
  ├─ update recipient workflow state as appropriate
  ├─ write DOCUMENT_SENT audit event
  └─ create one encrypted signing-email OutboxEvent per recipient
  │
  ▼
Commit succeeds
  │
  ▼
Worker outbox dispatcher claims pending events
  │
  ├─ decrypts short-lived job payload
  ├─ adds job to opensignflow-signing-email
  └─ marks outbox event dispatched
  │
  ▼
SigningEmailProcessor
  ├─ builds signing web URL
  ├─ renders email template
  ├─ sends through Mailpit or Resend
  └─ updates operational delivery state
```

The key property is that document state and the intent to deliver email are committed together. If PostgreSQL commits, the worker can eventually find the outbox event even if Redis was down at commit time.

---

## 8. Transactional outbox design

### Why an outbox is needed

PostgreSQL and Redis do not share a distributed transaction. The API cannot atomically commit both:

```txt
write to PostgreSQL
AND
write to Redis
```

The outbox avoids pretending that they do. It makes PostgreSQL the durable source of truth for the request to perform asynchronous work.

### Proposed persistence model

A future Prisma model should be narrow and operational:

```txt
OutboxEvent
  id                    outbox event ID
  type                  SEND_SIGNING_EMAIL
  aggregateType         DOCUMENT
  aggregateId           document ID
  organizationId        organization ID
  encryptedPayload      encrypted job data
  status                PENDING | PROCESSING | DISPATCHED | FAILED
  attemptCount          dispatch attempt count
  availableAt           next time the dispatcher may attempt work
  lockedAt              temporary claim lease timestamp
  lockedBy              worker identity
  dispatchedAt          successful queue dispatch timestamp
  lastError             safe operational error message
  createdAt
  updatedAt
```

Recommended indexes:

```txt
(status, availableAt)
(organizationId, createdAt)
(aggregateType, aggregateId)
```

### Claiming safely

Multiple worker replicas must not dispatch the same event indefinitely. The dispatcher should use an atomic database claim strategy, such as row locking with `FOR UPDATE SKIP LOCKED`, or a status/lease update that only succeeds for an eligible event.

A claimed event requires a lease. If a worker dies, a later dispatcher can reclaim records whose `lockedAt` lease has expired.

### Idempotency

Queue enqueueing should use a stable job ID:

```txt
signing-request-<signingRequestId>
```

If a dispatcher retries after an uncertain Redis response, BullMQ receives the same job ID rather than creating unlimited duplicate jobs.

The email provider integration should also use provider-side idempotency where available. Delivery must be designed as **at-least-once processing with idempotent effects**, not as exactly-once processing.

---

## 9. Encrypting outbox payloads

### Why an outbox payload must be encrypted

A signing-email job needs the plaintext token to construct the signing URL. A durable outbox record bridges the database transaction and later queue dispatch.

Therefore, unlike `SigningRequest.tokenHash`, an outbox event temporarily needs recoverable token material. It must be encrypted at rest.

### Payload contents

The plaintext payload before encryption resembles:

```ts
{
  signingRequestId: 'sreq_...',
  documentId: 'doc_...',
  recipientId: 'rcp_...',
  recipientEmail: 'recipient@example.com',
  recipientName: 'Grace Hopper',
  documentTitle: 'Service Agreement',
  signingToken: '<secret>'
}
```

This exact plaintext object must not be written into normal logs or unencrypted database columns.

### Encryption recommendation

Use authenticated encryption:

```txt
AES-256-GCM
```

Store the minimum decryption material alongside the ciphertext:

```txt
keyVersion
initializationVector (IV)
authenticationTag
ciphertext
```

Use a dedicated environment variable or managed-secret reference, for example:

```env
OUTBOX_ENCRYPTION_KEY=<base64-encoded 32-byte key>
OUTBOX_ENCRYPTION_KEY_VERSION=1
```

Requirements:

- use a unique random IV for every encryption operation;
- do not reuse an IV with the same key;
- validate the GCM authentication tag during decryption;
- fail closed on tampering or malformed ciphertext;
- never log plaintext payloads on encryption/decryption failure;
- support `keyVersion` so keys can be rotated without invalidating existing pending events.

### Key management

For local development, the key comes from the repository-root `.env`.

For production, it should come from a managed secret system. The API and worker need access to the same active key set, but no browser, frontend runtime, email provider, or database role should receive it.

The encryption key is separate from:

```txt
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
S3_SECRET_ACCESS_KEY
RESEND_API_KEY
```

Each secret has a different purpose and rotation boundary.

---

## 10. BullMQ processing and delivery

### Primary queue

```txt
opensignflow-signing-email
```

The API produces jobs. `SigningEmailProcessor` consumes them in `apps/worker`.

Suggested signing-email options:

```txt
attempts: 5
backoff: exponential
initial delay: 30 seconds
completed-job retention: 7 days
failed-job retention: retained for operations
```

### Mail provider abstraction

The processor depends on `MailService`, not directly on a provider.

```txt
SigningEmailProcessor
  ↓
MailService
  ↓
MailProvider interface
  ├─ MailpitProvider (development)
  └─ ResendProvider (production)
```

This prevents email-provider details from leaking into signing workflow logic and enables provider replacement or testing.

### Provider configuration

Local:

```env
MAIL_PROVIDER=mailpit
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM="OpenSignFlow <no-reply@localhost>"
```

Production:

```env
MAIL_PROVIDER=resend
RESEND_API_KEY=re_...
SMTP_FROM="OpenSignFlow <signatures@example.com>"
```

### Delivery status

A later refinement should update the signing request only after provider acceptance:

```txt
PENDING ── provider accepted email ──► SENT
```

A provider acceptance is not proof of inbox delivery, reading, or recipient identity. It only means the configured provider accepted the message for delivery.

---

## 11. Dead-letter queue policy

### Queue

```txt
opensignflow-signing-email-dlq
```

A job enters the DLQ after its configured attempts are exhausted.

### What goes into the DLQ

Only operational identifiers and safe failure data:

```ts
{
  originalJobId,
  signingRequestId,
  documentId,
  recipientId,
  failureReason,
  failedAt
}
```

### What must never go into the DLQ

```txt
plaintext signing token
signing URL
recipient email address
rendered email body
email HTML
unencrypted provider response payload
```

### Why a DLQ exists in addition to BullMQ failed state

BullMQ’s failed state is useful, but a DLQ provides an explicit operational workflow for exhausted work:

- monitoring and alerting;
- restricted operational access;
- a future admin retry screen;
- reporting on delivery failures;
- safe replay after remediation.

### DLQ replay rule

Do not replay old signing-token payloads from the DLQ. A retry action should create a new delivery attempt and, if a new token is needed, create a fresh token under controlled workflow rules. This avoids retaining or reusing leaked credentials.

---

## 12. Audit trail versus operational logs

Audit records answer: **what happened in the business workflow, and who initiated it?**

Operational job records answer: **did background infrastructure process the requested work?**

They are not interchangeable.

### Audit events

Existing and planned relevant events:

```txt
DOCUMENT_SENT
SIGNING_LINK_OPENED
RECIPIENT_VIEWED
RECIPIENT_SIGNED
RECIPIENT_DECLINED
DOCUMENT_COMPLETED
```

Future delivery-specific events may include:

```txt
SIGNING_EMAIL_QUEUED
SIGNING_EMAIL_SENT
SIGNING_EMAIL_DELIVERY_FAILED
```

These must not contain a signing token or full signing URL in metadata.

### Job/outbox records

Job and outbox records may contain status, attempt counts, timestamps, safe error summaries, and resource IDs. They should not duplicate sensitive business data unnecessarily.

---

## 13. Future public signing API

The public signing flow is deliberately separate from authenticated workspace APIs.

### Read signing request

```http
GET /v1/signing-requests/{token}
```

Expected server checks:

1. hash the supplied token;
2. find the signing request by hash;
3. reject an absent request with `SIGNING_REQUEST_NOT_FOUND` or a deliberately non-enumerable public response;
4. reject expired tokens with `SIGNING_TOKEN_EXPIRED`;
5. reject revoked tokens with `SIGNING_REQUEST_REVOKED`;
6. reject completed requests with an appropriate completed-state response;
7. return only the recipient’s allowed fields and public document viewing data.

On first successful access, the system can record:

```txt
SIGNING_LINK_OPENED
RECIPIENT_VIEWED
```

### Submit signing data

```http
POST /v1/signing-requests/{token}/submit
```

Expected server checks:

- request is valid, unexpired, and active;
- recipient can submit only fields assigned to that recipient;
- all required fields are present;
- submitted values match field validation/type rules;
- field values are stored against a `SigningSubmission`;
- recipient and signing-request statuses are updated;
- document completion is evaluated after every submission;
- audit events record submission and completion without storing unnecessary sensitive values.

The public route must have rate limiting and abuse protection because it is accessible without a workspace login.

---

## 14. Operational runbook: local development

Start local services:

```bash
docker compose up -d
```

Install and generate Prisma artifacts:

```bash
bun install
bun run db:generate
bun run db:deploy
```

Create the worker environment file:

```bash
cp .env.example .env
```

Run API and worker in separate terminals:

```bash
bun run dev
```

```bash
bun run dev:worker
```

Inspect emails in Mailpit:

```txt
http://localhost:8025
```

At the current stage, receiving an email proves queue-to-worker-to-Mailpit delivery. The `/sign/<token>` web route and public signing APIs are a later implementation slice.

---

## 15. Implementation roadmap

### Completed foundation

- document, recipient, and field drafting;
- authenticated send validation;
- signing-request creation;
- SHA-256 token-hash storage;
- dedicated Nest worker application;
- shared queue contracts;
- Mailpit and Resend provider abstraction;
- signing-email primary queue;
- retry policy;
- minimized signing-email DLQ;
- signing-email email template.

### Next: reliability hardening

1. Add `OutboxEvent` Prisma model and migration.
2. Add authenticated encryption service with key versioning.
3. Write encrypted outbox events inside the document-send transaction.
4. Move queue enqueueing from the API send path to a worker outbox dispatcher.
5. Add claim leases, retry policy, idempotent queue job IDs, and operational status updates.
6. Add tests for Redis outage, duplicate dispatch, decrypt failure, and retry exhaustion.

### Then: public signing

1. Implement public signing-request lookup.
2. Implement token expiration and revocation checks.
3. Implement recipient field submission.
4. Implement document completion evaluation and final-PDF job enqueueing.
5. Build `/sign/[token]` in the web app.
6. Add public-route rate limiting, security headers, and audit coverage.

### Later: operations and AI

- internal delivery/job monitoring and DLQ replay controls;
- full PDF finalization processor;
- AI analysis processors and persisted analysis status;
- optional SSE for AI progress and generated-text streaming.

---

## 16. Security checklist

Before production release of signing delivery, verify all of the following:

- [ ] Signing tokens are generated with cryptographically secure randomness.
- [ ] Database stores only SHA-256 token hashes in `SigningRequest`.
- [ ] Outbox payload encryption uses AES-256-GCM and unique IVs.
- [ ] Encryption keys are managed separately from JWT, storage, and provider secrets.
- [ ] Plaintext tokens never enter logs, audit events, job records, or DLQ payloads.
- [ ] Public signing tokens are rate-limited and checked for expiry/revocation.
- [ ] Send operations are idempotent or protected from duplicate submission.
- [ ] Queue jobs have bounded retries and exponential backoff.
- [ ] DLQ access is restricted and replay does not reuse retained plaintext tokens.
- [ ] Document state, signing requests, audit event, and outbox events are created in one database transaction.
- [ ] Worker outbox dispatch uses leases/atomic claims and idempotent queue job IDs.
- [ ] Provider errors are safe for logs and do not reveal secrets or recipient content.

## 17. Queue infrastructure package

`packages/queue` (`@opensignflow/queue`) owns generic BullMQ connection parsing and queue/worker factories. It is intentionally named after its architectural purpose rather than Redis, which is an implementation detail. Producers use bounded, no-offline-queue connections so HTTP requests fail visibly; consumers use the BullMQ-required unlimited command-retry setting. Domain queue names and job payloads remain in `packages/shared`, while signing-email policies and processing remain in their API and worker feature folders.
