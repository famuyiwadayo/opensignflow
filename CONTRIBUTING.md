# Contributing to OpenSignFlow

Thank you for contributing to OpenSignFlow. This repository is intentionally structured to demonstrate production-oriented API, worker, persistence, queue, and document-workflow design. Please preserve those boundaries when making changes.

## Local setup

OpenSignFlow uses one root local configuration source.

```bash
cp .env.example .env
bun install
bun run db:generate
bun run db:deploy
```

Start infrastructure:

```bash
docker compose up -d
```

Start applications:

```bash
bun run dev
bun run dev:worker
```

Run the canonical quality gate before opening a pull request:

```bash
bun run check
```

It performs:

```txt
Prisma client generation
full monorepo lint
full monorepo typecheck
```

Then run tests and build when applicable:

```bash
bun run test
bun run build
```

A Husky pre-push hook runs `bun run check` automatically. Do not bypass it with `--no-verify` unless diagnosing a hook/tooling failure; document any temporary bypass in the related issue or pull request.

## Read these documents first

| Topic                                                   | Required reference                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Repository and package boundaries                       | [Architecture](docs/architecture.md)                                                        |
| Backend module, DTO, entity, and repository conventions | [Backend Standards](docs/backend-standards.md)                                              |
| API response and error contract                         | [REST API Contract](docs/rest-api-contract.md) and [Error Codes](docs/error-codes.md)       |
| Prisma schema, migrations, and generated client         | [Database Workflow](docs/database-workflow.md)                                              |
| Root environment and Redis readiness                    | [Configuration and Dependency Readiness](docs/configuration-and-dependency-readiness.md)    |
| Recipients, fields, and signing workflow                | [Recipient, Field, and Signing Workflow](docs/recipient-field-and-signing-workflow.md)      |
| Signing token, delivery, and public signing security    | [Signing, Delivery, and Token-Security Architecture](docs/signing-delivery-architecture.md) |
| Transactional outbox and worker dispatch                | [Transactional Outbox Pattern](docs/transactional-outbox.md)                                |

## Architectural boundaries

```txt
packages/shared
  Framework-agnostic contracts only:
  IDs, queue names, job payloads, outbox payload shapes, API primitives.

packages/database
  Prisma schema, migrations, generated client, and database construction.

packages/queue
  Generic BullMQ/Redis connection and factory infrastructure.

packages/crypto
  Generic AES-256-GCM payload encryption primitives.

apps/api
  HTTP API, authentication, business validation, database transactions,
  audit events, and transactional outbox writes.

apps/worker
  Outbox dispatch, BullMQ processing, provider delivery, retries, and DLQ work.
```

Do not introduce an application-to-application dependency such as:

```txt
apps/worker → apps/api
packages/* → apps/api
```

## Constants and types

Use the narrowest correct source of truth.

```txt
packages/shared
  ID prefix keys, queue names, job names, cross-process payload contracts

packages/database
  Prisma-generated enums and persistence types

feature module
  Feature-local timeouts, retries, lease periods, and processing policy
```

Use semantic ID names:

```ts
idGenerator.generate('document');
idGenerator.generate('outboxEvent');
```

Do not use raw prefix strings such as:

```ts
idGenerator.generate('doc');
```

## Prisma and migrations

Prisma is owned by `packages/database`.

```txt
packages/database/prisma/schema.prisma
packages/database/prisma/migrations/
packages/database/src/generated/
```

Use the root commands:

```bash
bun run db:generate
bun run db:migrate
bun run db:deploy
bun run db:status
```

Do not hand-edit generated Prisma files.

When adding a persistence change:

```txt
1. Update schema.prisma.
2. Generate a migration.
3. Review generated SQL.
4. Regenerate Prisma client.
5. Update affected repository select types/entities.
6. Add or update tests and documentation.
```

## Transactional outbox rules

Read the full [Transactional Outbox Pattern](docs/transactional-outbox.md) before adding asynchronous work.

```txt
Write OutboxEvent records inside the transaction that creates business intent.
Use Prisma enum event types, never free-text event names.
Use versioned shared payload contracts.
Encrypt sensitive durable payloads.
Create one specialized worker handler per event type.
Never add event-specific switch statements to the generic dispatcher.
Use stable downstream idempotency keys.
Never log signing tokens, signing URLs, or recipient email payloads.
```

## Pull request expectations

A pull request should explain:

```txt
What changed
Why the change belongs in its selected package/module
Database migration impact, if any
API contract impact, if any
Queue/outbox impact, if any
Security or token-handling impact, if any
How it was tested
Documentation updated
```

For architectural changes, add or amend an ADR under:

```txt
docs/adr/
```
