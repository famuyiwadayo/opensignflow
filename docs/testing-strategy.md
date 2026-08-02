# Testing Strategy

**Status:** Contributor testing contract  
**Scope:** unit, service, API, database, worker, queue, and end-to-end workflow testing.

## Goals

Tests must protect OpenSignFlow's business and security guarantees, not merely maximize line coverage.

```txt
A test failure should identify a broken product guarantee.
Tests should be isolated and deterministic.
Real persistence/queue behavior must be tested against real services.
Mocks should not replace PostgreSQL, Redis, Prisma transactions, or outbox claiming tests.
```

## Test layers

### Pure unit tests

Use no Nest application, database, Redis, network, or filesystem dependency.

```txt
ID generation
cursor parsing
email normalization
field-coordinate validation
AES-256-GCM encryption/decryption
outbox envelope parsing
signing-token hashing
```

### Service unit tests

Use focused dependency fakes/mocks for policy-heavy behavior.

```txt
recipient role transitions
send eligibility
field assignment rules
error-code mapping
outbox handler routing
```

### Repository integration tests

Use real PostgreSQL and actual Prisma client/migrations.

```txt
unique constraints
transaction rollback
cursor ordering
organization scoping
outbox conditional claims
lease recovery
```

### API integration tests

Use real Nest modules, guard/pipes/filters, PostgreSQL, and HTTP requests. API-specific test bootstrapping lives in `apps/api/src/test/create-test-api.ts` so each suite mirrors `main.ts` validation/filter/cookie behavior rather than creating a divergent Nest app.

```txt
auth registration/login
DTO validation
success/error envelopes
organization access boundaries
recipient/field endpoints
send transaction outcomes
```

### Worker integration tests

Use real PostgreSQL, Redis, BullMQ, and the worker handler/dispatcher.

```txt
outbox claim
notification/catch-up dispatch
queue job creation
retry scheduling
malformed payload rejection
lease recovery
```

### End-to-end workflow tests

Use sparingly for the most valuable user journeys.

```txt
register → upload → recipients → fields → send → outbox → queue → Mailpit
```

## Testcontainers policy

Real integration tests use Testcontainers.

```txt
PostgreSQL container
Redis container
```

Each suite receives isolated service URLs. Tests never target root local development `DATABASE_URL` or `REDIS_URL`.

Lifecycle:

```txt
suite start
  → start containers
  → set test environment
  → apply packages/database migrations

before each test
  → clear test state

suite end
  → stop containers
```

## Testkit package

Reusable test-only code belongs in:

```txt
packages/testkit/
```

It may contain:

```txt
Testcontainers lifecycle helpers
migration/cleanup helpers
factories
workflow builders
HTTP test app builders
assertions
clock/UUID helpers
```

It must not become a hidden production abstraction. Production code must not depend on `@opensignflow/testkit`.

## Factories and builders

Factories create one valid focused record with overridable data:

```ts
recipientFactory({ role: RecipientRole.SIGNER });
documentFieldFactory({ recipientId: signer.id });
```

Builders compose meaningful workflows:

```ts
createDocumentWorkflow({
  signers: 2,
  ccRecipients: 1,
  fieldsPerSigner: 2,
});
```

Avoid opaque fixtures such as:

```ts
createEverything();
```

A test should make its important state visible.

## Assertions

Assert observable contracts, not incidental implementation details.

```txt
HTTP status and standard API error code
persisted business state
required audit event
outbox event type/status/encryption behavior
queue job ID/payload contract
```

Do not assert raw timestamps, random IDs, encrypted ciphertext, or internal Prisma query count unless that behavior is the actual contract.

## Initial coverage priorities

1. `packages/crypto`: encryption/authentication failure tests. **Implemented.**
2. auth service policy tests. **Started: duplicate registration and non-enumerable invalid credentials coverage.**
2. recipient role and field ownership tests. **Unit coverage plus real PostgreSQL signer-downgrade/reassignment and bulk-assignment coverage started.**
3. Testcontainers PostgreSQL/Redis + migration harness. **Started.**
4. signing send eligibility unit tests. **Started: signer/CC and field-assignment rejection coverage.**
5. signing send transaction + encrypted outbox integration tests. **Started: signer-only request/outbox persistence coverage.**
6. worker outbox dispatch integration tests. **Started: pending event → idempotent BullMQ job, malformed/dispatch retry, retry exhaustion, expired lease recovery, and concurrent claim coverage.**
4. worker outbox dispatch/claim/retry/lease integration tests.
5. auth API integration tests.
6. full signing-email delivery workflow test.

## Naming

Use behavior-oriented names:

```ts
it('creates encrypted signing-email outbox events only for eligible signers', async () => {});
it('rejects changing a signer with assigned fields to CC', async () => {});
```

Avoid:

```ts
it('works', async () => {});
it('test signing', async () => {});
```

## Commands

```bash
bun run test
bun run --filter=@opensignflow/api test
bun run --filter=@opensignflow/worker test
```

Integration suites require Docker/Testcontainers availability. Testcontainers currently loads ESM dependencies, so Jest integration scripts use `cross-env NODE_OPTIONS=--experimental-vm-modules jest --runInBand`. Unit-only packages may use plain Jest and remain container-free.
