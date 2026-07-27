# ADR 0008: Use a queue infrastructure package

## Decision

OpenSignFlow standardizes BullMQ and Redis connection construction in `packages/queue` (`@opensignflow/queue`). The package exposes generic queue/worker factories and role-aware connection settings.

## Rationale

The API, worker processors, DLQ producers, and later outbox dispatcher all use BullMQ. Centralizing connection parsing, connection names, timeout defaults, producer offline-queue policy, and consumer retry requirements avoids subtle infrastructure drift.

## Boundaries

`@opensignflow/queue` contains no NestJS modules, Prisma code, signing tokens, domain queue names, domain retry policies, or mail/provider logic. `packages/shared` owns queue names and payload contracts. Feature producers remain in `apps/api/src/jobs`; processors remain in `apps/worker/src/processors`.
