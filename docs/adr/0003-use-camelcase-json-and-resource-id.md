# ADR 0003: Use camelCase JSON fields and `id` for current resource identifiers

## Status

Accepted.

## Context

The API contract needed a final decision on JSON field naming. One option considered was kebab-case response keys such as `document-id`.

Although kebab-case is valid JSON, this project uses a TypeScript-heavy stack: Next.js, NestJS, TanStack Query, TanStack Form, OpenAPI, and eventually a generated API client. Kebab-case JSON keys are inconvenient in TypeScript because they require bracket access:

```ts
response.data["document-id"]
```

instead of normal property access:

```ts
response.data.documentId
```

## Decision

Use camelCase for JSON fields.

Use `id` for the current resource's own identifier:

```json
{
  "data": {
    "id": "doc_123",
    "title": "Service Agreement"
  }
}
```

Use resource-specific ID names only when referencing another resource:

```json
{
  "data": {
    "id": "fld_123",
    "documentId": "doc_123",
    "recipientId": "rcp_123"
  }
}
```

Keep kebab-case for URL path segments where appropriate:

```txt
/v1/signing-requests/{token}
```

Use standard header casing for HTTP headers:

```http
X-Request-Id: req_123
Idempotency-Key: idem_123
```

## Consequences

Positive:

- Cleaner TypeScript usage.
- Better generated client ergonomics.
- Consistent with common JavaScript API conventions.
- Resource objects stay compact and predictable.

Tradeoffs:

- API JSON differs from path/header casing conventions, but that separation is intentional and documented.
