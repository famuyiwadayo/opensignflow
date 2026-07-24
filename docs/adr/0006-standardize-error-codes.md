# ADR 0006: Standardize API error codes

## Status

Accepted.

## Context

OpenSignFlow has multiple backend domains: auth, users, organizations, documents, recipients, signing, storage, PDF processing, AI, billing, jobs, and webhooks. Without a consistent error-code system, different modules could return inconsistent codes and make frontend handling difficult.

The REST contract already defines a standard error envelope. We now need canonical error-code naming and backend implementation conventions.

## Decision

Use stable uppercase snake case error codes across the API.

The canonical backend code list lives in:

```txt
apps/api/src/common/errors/error-code.ts
```

The human-readable taxonomy is documented in:

```txt
docs/error-codes.md
```

API error responses must use:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document was not found.",
    "status": 404,
    "requestId": "req_123",
    "timestamp": "2026-07-23T12:00:00.000Z",
    "details": []
  }
}
```

Backend code should import `ErrorCode` instead of hardcoding strings.

Frontend code should use `error.code` for product behavior rather than relying only on HTTP status.

## Consequences

Positive:

- Consistent frontend handling.
- Better API client behavior.
- Easier testing.
- Easier support/debugging.
- Stable contract for open-source contributors.

Tradeoffs:

- New errors must be documented.
- Developers must avoid inventing one-off codes inline.
- Error codes become part of the public API contract and should not be renamed casually.
