# ADR 0005: Backend contract and type ownership

## Status

Accepted.

## Context

OpenSignFlow uses a separated Next.js frontend and NestJS backend inside a Turborepo/Bun monorepo. This creates a natural temptation to share all types through `packages/shared`.

However, blindly sharing types can make the codebase unsafe and redundant. Prisma models may contain sensitive fields. NestJS DTOs use backend-specific decorators. Frontend forms have UX-specific validation needs. API response resources should be generated from the backend contract rather than manually duplicated.

## Decision

Use one source of truth per boundary:

| Boundary | Source of truth |
|---|---|
| Persistence | Prisma schema and Prisma Client |
| Request validation | NestJS DTOs |
| API response contract | NestJS API entities |
| API documentation | NestJS Swagger/OpenAPI |
| Frontend API types | Generated OpenAPI client |
| Generic envelopes/errors | Small shared package |

`packages/shared` must remain framework-agnostic and small. It should not contain NestJS DTOs, NestJS entities, Prisma types, manually duplicated API resources, or manually duplicated domain enums.

The frontend should eventually consume API types through a generated package:

```txt
packages/api-client
```

Generated from:

```txt
apps/api OpenAPI JSON
```

## Consequences

Positive:

- Clear backend architecture for recruiters.
- Prisma internals do not leak to the frontend.
- Frontend API types can be generated instead of manually duplicated.
- DTO/entity patterns remain idiomatic NestJS.
- Shared package stays small and safe.

Tradeoffs:

- Some mapping code is required between Prisma records and API entities.
- DTOs and frontend form schemas may overlap until OpenAPI schema generation is added.
- OpenAPI generation becomes an important part of the workflow.

## Follow-up tasks

- Add backend standards documentation.
- Keep `packages/shared` limited to generic API primitives and constants.
- Add `packages/api-client` after core backend endpoints stabilize.
- Add CI checks to ensure generated API client stays up to date.
