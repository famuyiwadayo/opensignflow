# Configuration and Dependency Readiness

## Intent

OpenSignFlow must not silently run against stale, missing, or unreachable infrastructure configuration. This document defines root local configuration precedence and dependency readiness policy for Redis-backed queue work.

## One local source of truth

OpenSignFlow uses one repository-root local environment file:

```txt
opensignflow/.env
```

Create it with:

```bash
cp .env.example .env
```

API, worker, scripts, and web tooling load this file during development. Shared infrastructure therefore has one value:

```env
REDIS_URL=redis://localhost:6380
DATABASE_URL=postgresql://opensignflow:opensignflow@localhost:5432/opensignflow?schema=public
SMTP_HOST=localhost
SMTP_PORT=1025
```

The Docker host port is not assumed. `REDIS_URL` must match the `ports` mapping in `docker-compose.yml`; for a mapping of `6380:6379`, host-run processes use `redis://localhost:6380`.

App-level `.env.example` files are migration pointers only. They are not local configuration sources.

## Precedence rules

`@opensignflow/config` finds the workspace root through its `package.json` workspaces declaration.

| Environment   | Authoritative source                    | Why                                                                                              |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `development` | root `.env`                             | A single deterministic local configuration prevents API/worker drift and stale terminal exports. |
| `test`        | explicit test environment               | Keeps runner-controlled values deterministic.                                                    |
| `production`  | deployment environment / secret manager | Prevents repository files from overriding deployment secrets.                                    |

Development dotenv loading uses `override: true`, so a root `.env` value replaces inherited terminal exports. Test and production do not load local `.env` values over deployment configuration.

## Package responsibilities

```txt
packages/config
  workspace-root discovery and local root .env loading.

packages/queue
  Redis URL parsing, BullMQ connection construction, and bounded Redis readiness probes.

packages/shared
  Queue names and framework-agnostic job payload contracts.
```

No package may log passwords, raw secret-bearing Redis URLs, signing tokens, or email content.

## Redis readiness model

`@opensignflow/queue` provides a bounded Redis `PING` probe. It returns safe state:

```ts
{
  ready: boolean;
  target: 'localhost:6380/0';
  reason?: string;
}
```

The target excludes credentials.

### Worker policy: fail fast

The worker cannot process jobs without Redis. Before Nest initializes processors, worker bootstrap:

1. loads root `.env` in development;
2. requires a syntactically valid `REDIS_URL`;
3. probes Redis with a bounded timeout;
4. exits non-zero if Redis is unavailable;
5. only creates processors after readiness succeeds.

A worker must never report that it is listening on a queue before Redis is ready.

### API policy: degraded mode

The API can serve non-queue capabilities when Redis is unavailable. It starts in a degraded state and refreshes Redis readiness every 15 seconds.

`GET /health` and `GET /v1/health` expose readiness. A degraded example:

```json
{
  "data": {
    "status": "degraded",
    "dependencies": {
      "redis": {
        "status": "unavailable",
        "target": "localhost:6380/0"
      }
    },
    "capabilities": {
      "signingEmail": "unavailable"
    }
  }
}
```

When Redis is unavailable, `POST /v1/documents/{documentId}/send` returns `503 SERVICE_UNAVAILABLE` before document or signing-request database mutation.

## Producer and consumer connection rules

```txt
producer
  API-side queue client
  bounded connection timeout
  offline Redis command queue disabled
  finite command retry budget

consumer
  worker-side BullMQ consumer
  long-lived connection
  BullMQ-required unlimited command retry setting
```

## Operational checks

```bash
# Show the one local Redis configuration value.
grep '^REDIS_URL' .env

# Confirm Redis itself responds.
docker compose exec redis redis-cli ping

# Inspect named API/worker Redis clients.
docker compose exec redis redis-cli CLIENT LIST

# Inspect queue keys.
docker compose exec redis redis-cli --scan --pattern 'bull:opensignflow-signing-email:*'
```

Expected named clients include:

```txt
api-signing-email-producer
worker-signing-email-consumer
worker-signing-email-dlq-producer
```

## Remaining reliability boundary

Readiness prevents the API from beginning a send operation when Redis is currently unavailable. It does not replace the transactional outbox. A Redis failure after preflight remains possible, so encrypted outbox persistence and worker dispatch are still the next reliability implementation.
