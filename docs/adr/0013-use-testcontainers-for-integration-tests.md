# ADR 0013: Use Testcontainers for integration tests

## Decision

OpenSignFlow uses Testcontainers-backed PostgreSQL and Redis for repository, API, worker, queue, and end-to-end integration tests.

## Rationale

The product relies on PostgreSQL constraints, Prisma transactions, Redis/BullMQ delivery, and outbox claim behavior that mocks cannot prove. Dedicated containers isolate tests from developer local databases and align local/CI behavior.

## Consequences

Test infrastructure belongs in `packages/testkit`; production packages must not depend on it. Unit tests remain container-free. Integration suites require Docker availability, apply database migrations to isolated databases, and clean state between tests.
