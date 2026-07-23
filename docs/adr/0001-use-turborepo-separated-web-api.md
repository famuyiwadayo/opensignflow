# ADR 0001: Use Turborepo with separated frontend and backend

## Status

Accepted.

## Context

OpenSignFlow should demonstrate real full-stack engineering skills. A single full-stack Next.js application would be faster initially, but it would hide backend architecture, API design, and service boundaries.

The project also needs to be open-source friendly and scalable enough to add shared packages, generated clients, background workers, and documentation apps later.

## Decision

Use a Turborepo monorepo with pnpm workspaces.

Initial applications:

```txt
apps/web  Next.js frontend
apps/api  NestJS backend
```

Initial packages:

```txt
packages/shared      shared enums, types, schemas, constants
packages/api-client  typed API client later
packages/config      shared tooling config later
packages/database    optional Prisma package after schema stabilizes
```

The frontend must call the backend over HTTP. It must not import backend services directly.

## Consequences

Positive:

- Clear backend skills are visible to recruiters.
- API contract becomes explicit.
- Frontend/backend can be deployed independently.
- Shared types and tooling can still live in one repo.
- Future worker/docs/mobile apps can be added cleanly.

Tradeoffs:

- More setup work than a single Next.js app.
- Authentication and CORS require more care.
- Local development needs multiple services.
- Type sharing must be controlled to avoid tight coupling.
