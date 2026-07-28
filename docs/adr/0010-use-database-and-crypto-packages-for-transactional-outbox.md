# ADR 0010: Use database and crypto packages for transactional outbox

## Decision

`@opensignflow/database` owns backend-only Prisma client construction with the PostgreSQL driver adapter. API and worker processes each own a lifecycle-managed client created from the same factory.

`@opensignflow/crypto` owns AES-256-GCM encrypted-payload envelopes. Transactional outbox payloads store ciphertext, IV, authentication tag, and key version; plaintext signing tokens are never stored in normal database columns.

## Rationale

The API writes outbox events and the worker later claims and dispatches them. Sharing construction/encryption rules prevents drift without coupling the worker to API feature modules.

## Consequences

The Prisma schema now contains `OutboxEvent`, `OutboxEventType`, and `OutboxEventStatus`; migration `20260728120000_add_transactional_outbox` must be deployed. Root `.env` requires `OUTBOX_ENCRYPTION_KEY` and `OUTBOX_ENCRYPTION_KEY_VERSION`. Dispatcher and API outbox-writer implementation follow this persistence foundation.

## Amendment: Prisma schema ownership

The Prisma 7 schema, migrations, configuration, and generated client live in `packages/database`. The generator uses `prisma-client` with output `../src/generated` and CJS module format. Applications import Prisma client, enums, and Prisma types through `@opensignflow/database`; no application imports generated paths directly.
