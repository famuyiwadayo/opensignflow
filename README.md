# OpenSignFlow

OpenSignFlow is an open-source, AI-assisted PDF signing and document workflow platform for small teams.

It is being built as both a serious backend/frontend portfolio project and a potential hosted SaaS product. The current implementation focuses on durable document workflow foundations: authenticated workspaces, PDF upload, recipients, signer-owned fields, secure signing requests, audit history, transactional outbox delivery, and independently scalable workers.

[Contributing Guide](CONTRIBUTING.md) · [Architecture](docs/architecture.md) · [Transactional Outbox](docs/transactional-outbox.md) · [Testing Strategy](docs/testing-strategy.md)

## Current implementation

### API foundation

```txt
✓ standardized /v1 API envelope and error codes
✓ request IDs, validation, Swagger/OpenAPI
✓ JWT access tokens and opaque refresh sessions
✓ personal organization/workspace on registration
✓ active organization scoping
✓ PostgreSQL via Prisma 7 generated client
```

### Document workflow foundation

```txt
✓ PDF upload, validation, page-count extraction, private MinIO/S3 storage
✓ document list, details, signed download URLs
✓ recipient management with SIGNER and CC roles
✓ signer-owned document fields and bulk field assignment
✓ draft-only recipient and field mutation rules
✓ audit-event listing
✓ document send validation and signer-specific signing requests
✓ SHA-256 signing-token storage
```

### Background delivery foundation

```txt
✓ dedicated apps/worker process
✓ BullMQ signing-email queue and Mailpit/Resend provider abstraction
✓ encrypted PostgreSQL transactional outbox
✓ generic outbox handler registry
✓ PostgreSQL LISTEN/NOTIFY wake-up path
✓ safety sweep, atomic claims, retries, and initial lease recovery
✓ signing-email DLQ contract
```

### In progress

```txt
• Testcontainers-backed test harness and feature test suite
• worker outbox hardening and operational visibility
• public signing-request APIs and signing page
• signing submission, field values, document completion, final PDF generation
• frontend dashboard/auth/document editor integration
• AI analysis and billing workflows
```

## Technology

| Area | Choice |
|---|---|
| Monorepo | Turborepo + Bun workspaces |
| Web | Next.js, TypeScript, Tailwind, TanStack tools |
| API | NestJS + TypeScript |
| Worker | NestJS application context + BullMQ consumers |
| Database | PostgreSQL + Prisma 7 |
| Queue | Redis + BullMQ |
| Storage | S3-compatible storage, MinIO locally |
| Email | Mailpit locally, Resend in production |
| Tests | Jest + Testcontainers for PostgreSQL/Redis integration tests |

## Repository structure

```txt
apps/
  api/          NestJS HTTP API and business transactions
  worker/       outbox dispatch and asynchronous processing
  web/          Next.js application

packages/
  config/       root-environment loading policy
  crypto/       AES-256-GCM payload encryption
  database/     Prisma schema, migrations, generated client
  queue/        BullMQ/Redis infrastructure
  shared/       IDs, queue names, job and outbox contracts
  testkit/      test-only containers, factories, builders, assertions
```

## Quick start

```bash
cp .env.example .env
bun install
docker compose up -d
bun run db:generate
bun run db:deploy
bun run dev
```

In a second terminal:

```bash
bun run dev:worker
```

Useful local URLs:

```txt
API:      http://localhost:4000
Swagger:  http://localhost:4000/docs
Web:      http://localhost:3000
Mailpit:  http://localhost:8025
MinIO:    http://localhost:9001
```

## Quality gates

Run the same deterministic checks used by the pre-push hook:

```bash
bun run check
bun run test
bun run build
```

See [Quality Gates](docs/quality-gates.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Backend Standards](docs/backend-standards.md)
- [REST API Contract](docs/rest-api-contract.md)
- [Error Codes](docs/error-codes.md)
- [Database Workflow](docs/database-workflow.md)
- [Configuration and Dependency Readiness](docs/configuration-and-dependency-readiness.md)
- [Recipient, Field, and Signing Workflow](docs/recipient-field-and-signing-workflow.md)
- [Signing, Delivery, and Token-Security Architecture](docs/signing-delivery-architecture.md)
- [Transactional Outbox Pattern](docs/transactional-outbox.md)
- [Testing Strategy](docs/testing-strategy.md)
- [Architecture Decisions](docs/adr/)

## Legal note

OpenSignFlow provides document workflow, signing, and audit tooling. It does not currently claim enterprise-grade identity verification, jurisdiction-specific legal compliance, or legal advice. AI-generated output is informational only.
