# ADR 0009: Standardize configuration and dependency readiness

## Decision

OpenSignFlow uses one repository-root `.env` file for local development. In `development`, root dotenv values override inherited shell variables; in test/production, process/deployment environment values remain authoritative.

Redis readiness is a standardized queue-infrastructure concern. Workers fail fast before processor startup when Redis is unavailable. The API starts degraded, exposes readiness through health endpoints, and rejects queue-backed send operations before mutating document state.

## Rationale

A stale shell export and a changed Docker host port previously allowed a worker to appear started without an active Redis consumer. Explicit precedence, bounded probes, named connections, and capability-aware health status prevent that silent failure class.

## Consequences

Developers configure shared infrastructure values once in root `.env`. `@opensignflow/config` owns local load precedence; `@opensignflow/queue` owns safe Redis readiness probing. Transactional outbox work remains necessary for failures that occur after an API preflight succeeds.

## Amendment: single local root environment source

Local development uses a single repository-root `.env` file rather than per-app files. This eliminates duplicated Redis, database, SMTP, and object-storage values. API, worker, and web tooling load the root file through `@opensignflow/config`; app-level examples are migration pointers only.
