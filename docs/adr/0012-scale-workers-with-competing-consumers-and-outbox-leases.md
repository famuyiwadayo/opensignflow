# ADR 0012: Scale workers with competing consumers and outbox leases

## Context

OpenSignFlow needs to scale background processing independently of the HTTP API. A fixed polling-only outbox dispatcher adds idle database cost and latency; a notification-only dispatcher can miss events while workers are offline.

## Decision

Workers are deployed as background consumer replicas, not behind an HTTP load balancer. PostgreSQL remains the durable outbox source of truth.

The intended dispatcher model is:

```txt
PostgreSQL LISTEN / NOTIFY
  → low-latency wake-up with safe event ID

atomic conditional outbox claim
  → one worker owns one event

periodic safety sweep
  → missed notifications, delayed retries, restart recovery

lease expiration recovery
  → crashed worker claims become available again

stable downstream idempotency key
  → safe queue/provider retries
```

## Consequences

Multiple workers may receive the same PostgreSQL notification; this is safe because only one conditional claim succeeds. Worker IDs must be observable and derived from `WORKER_ID` or Kubernetes hostname. The current interval dispatcher is a correctness baseline and will be replaced by notification-driven dispatch plus a lower-frequency recovery sweep before production horizontal scaling.
