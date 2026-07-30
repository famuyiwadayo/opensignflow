# Architecture

## Goal

OpenSignFlow should be built as a production-style SaaS application while remaining approachable for open-source contributors.

The architecture should demonstrate clear frontend/backend separation, real API design, background processing, secure file handling, PDF processing, and AI orchestration.

## High-level system

```txt
                    ┌──────────────────────────┐
                    │      Browser Client      │
                    └─────────────┬────────────┘
                                  │ HTTPS / REST
                                  ▼
┌──────────────────────────────────────────────────────────────┐
│ apps/web                                                     │
│ Next.js, TypeScript, Tailwind, shadcn/ui, TanStack tools      │
└───────────────────────┬──────────────────────────────────────┘
                        │ REST API
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ apps/api                                                     │
│ NestJS API, auth, documents, signing, AI, billing, audit      │
└───────┬───────────────┬───────────────┬───────────────┬──────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐
│ PostgreSQL │  │ Redis      │  │ S3/R2      │  │ AI Providers │
│ Prisma     │  │ BullMQ     │  │ MinIO dev  │  │ OpenAI/etc.  │
└────────────┘  └────────────┘  └────────────┘  └──────────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────┐
│ External services                                             │
│ Email provider, payment provider, logging/monitoring later    │
└──────────────────────────────────────────────────────────────┘
```

## Monorepo layout

```txt
opensignflow/
  apps/
    web/
    api/
    worker/
  packages/
    shared/
    database/
    queue/
    crypto/
    config/
    api-client/
  docs/
  docker-compose.yml
  turbo.json
  package.json
```

## Application boundaries

### `apps/web`

The frontend is responsible for:

- landing and marketing pages;
- authentication screens;
- dashboard and document list;
- PDF upload UI;
- PDF preview/editor;
- field placement interactions;
- recipient management UI;
- public signing page;
- completed document and audit views;
- billing and pricing UI.

The frontend must call the backend over HTTP. It must not import NestJS services, repositories, Prisma clients, or backend-only logic.

### `apps/api`

The backend is responsible for:

- authentication and authorization;
- users and organizations later;
- document CRUD;
- upload validation;
- storage access control;
- recipient and signing workflows;
- PDF finalization;
- audit logging;
- background jobs;
- AI provider orchestration;
- subscription and usage enforcement;
- OpenAPI/Swagger contract generation.

### `packages/shared`

Shared code must be limited to small framework-agnostic primitives:

- generic API envelope types;
- pagination/error types;
- stable public ID prefixes;
- small constants that are not domain-resource duplicates.

Do not place NestJS DTOs, NestJS entities, Prisma types, domain resource types, manually duplicated domain enums, backend services, database access, secrets, storage providers, or AI provider logic here.

Backend DTO/entity/type ownership is documented in [Backend Standards](./backend-standards.md).

### `packages/api-client`

This package should eventually contain a typed API client generated from the OpenAPI spec or a carefully maintained typed fetch wrapper.

The frontend should depend on this package instead of scattering raw `fetch` calls throughout the app.

### `packages/database`

The database package owns:

- Prisma 7 schema and migrations;
- generated Prisma client output;
- PostgreSQL driver-adapter client construction;
- persistence enums and Prisma types.

Both API and worker create independent process-local database clients from this package. Applications do not import generated Prisma paths directly.

## Backend modules

Initial NestJS modules:

```txt
src/
  auth/
  users/
  documents/
  document-fields/
  recipients/
  signing/
  pdf/
  storage/
  email/
  audit/
  ai/
  billing/
  usage/
  jobs/
  common/
  config/
```

## Local development services

Use Docker Compose for dependencies:

```txt
postgres    PostgreSQL database
redis       BullMQ queue backend
minio       S3-compatible local object storage
mailpit     local email inbox for development
```

Expected local URLs:

```txt
Web:      http://localhost:3000
API:      http://localhost:4000
Swagger:  http://localhost:4000/docs
Mailpit:  http://localhost:8025
MinIO:    http://localhost:9001
```

## Deployment direction

Suggested low-cost production setup:

| Component | Possible provider |
|---|---|
| Web | Vercel |
| API | Render, Railway, Fly.io, DigitalOcean, or VPS |
| Database | Neon, Supabase, Railway, or managed Postgres |
| Redis | Upstash or managed Redis |
| Storage | Cloudflare R2 or S3-compatible storage |
| Email | Resend |
| Payments | Paystack, Flutterwave, Paddle, Lemon Squeezy, or Stripe depending on availability |

## Security principles

- Never expose permanent public PDF URLs.
- Use private object storage.
- Generate short-lived signed URLs for downloads/previews.
- Use audit logging for sensitive actions.
- Use signed opaque tokens for public signing links.
- Validate file type and size on upload.
- Do not let the frontend talk directly to AI providers.
- Rate-limit public endpoints.
- Keep all timestamps in UTC ISO 8601 format.

## Worker and scalability decision

Background work runs in the dedicated `apps/worker` process. API replicas are request-serving infrastructure and may sit behind an Ingress/load balancer; worker replicas are competing consumers and do not require a public service.

```txt
apps/api
  HTTP API, business transactions, encrypted outbox writes

apps/worker
  outbox dispatch, BullMQ processing, email/PDF/AI capability handlers
```

Workers scale horizontally through PostgreSQL conditional outbox claims and BullMQ consumer distribution. PostgreSQL LISTEN/NOTIFY is the planned low-latency wake-up mechanism; periodic safety sweeps and lease recovery preserve durability. See [Transactional Outbox Pattern](./transactional-outbox.md).