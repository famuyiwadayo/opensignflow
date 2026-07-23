# ADR 0002: Standardize the REST API contract before implementation

## Status

Accepted.

## Context

OpenSignFlow will have several backend modules: auth, users, documents, fields, recipients, signing, audit, AI, billing, and jobs. Without an API standard, endpoints can become inconsistent and harder for the frontend to consume.

A consistent contract also improves OpenAPI documentation, generated API clients, tests, and recruiter review.

## Decision

Adopt a standardized REST contract for `/v1` routes.

Key decisions:

- use `/v1` path versioning;
- use plural lowercase resource paths;
- use camelCase JSON fields;
- use uppercase snake case enum values;
- use opaque string IDs;
- use `data` envelope for JSON success responses;
- use a standard `error` envelope for failures;
- use cursor pagination;
- use ISO 8601 UTC timestamps;
- use OpenAPI/Swagger as the source of truth;
- support idempotency for sensitive commands;
- keep command endpoints rare and consistent.

Full standard: [REST API Contract Standard](../rest-api-contract.md).

## Consequences

Positive:

- Frontend API hooks become predictable.
- Error handling becomes consistent.
- API docs are easier to understand.
- Contract testing becomes possible.
- Future generated API clients are easier.

Tradeoffs:

- Slightly more upfront discipline.
- Some endpoints may use pragmatic command actions, such as `/send`, instead of pure resource-only REST.
- Developers must update documentation and OpenAPI schemas when endpoints change.
