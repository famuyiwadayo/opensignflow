# ADR 0007: Use a dedicated worker and job-capability folders

## Decision

OpenSignFlow runs asynchronous work in `apps/worker`, independently of `apps/api`. Both the API producer and worker consumer organize job code by capability (`signing-email`, `pdf-finalization`, `ai-analysis`). Mail providers and templates live in `apps/worker/src/mail`.

## Consequences

The API only enqueues jobs. It does not execute processors. Queue payload contracts are framework-agnostic types in `packages/shared/src/jobs`. Signing tokens can exist only in the short-lived primary BullMQ job; they must not be stored in PostgreSQL or a DLQ payload.

## DLQ policy

Signing-email uses bounded retries and a dead-letter queue for exhausted jobs. DLQ payloads retain only operational identifiers and failure information, never plaintext signing tokens.
