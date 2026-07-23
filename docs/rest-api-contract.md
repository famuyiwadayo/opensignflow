# REST API Contract Standard

## Purpose

This document defines the REST API style for OpenSignFlow.

The goal is consistency. Every endpoint should look and feel like it belongs to the same product, regardless of which module implements it.

The backend will be built with NestJS and documented with OpenAPI/Swagger. The frontend will consume the API through a typed client and TanStack Query mutations/queries.

## Base URL and versioning

All customer-facing API routes must be versioned.

```txt
/v1
```

Examples:

```txt
GET  /v1/documents
POST /v1/documents
GET  /v1/documents/{documentId}
```

Swagger should be available locally at:

```txt
http://localhost:4000/docs
```

Internal provider webhooks may sit outside `/v1` if useful, for example:

```txt
/webhooks/paystack
/webhooks/resend
```

## Transport and content type

Default request and response content type:

```txt
application/json
```

File uploads use:

```txt
multipart/form-data
```

Downloads and signed URLs are handled through temporary URLs rather than returning large files inline by default.

## Naming conventions

### Paths

- Use lowercase plural nouns.
- Use kebab-case for multi-word path segments.
- Use nested paths when the child resource does not make sense outside the parent.
- Use command endpoints sparingly for domain actions.

Good:

```txt
GET  /v1/documents
GET  /v1/documents/{documentId}/fields
POST /v1/documents/{documentId}/recipients
POST /v1/documents/{documentId}/send
```

Avoid:

```txt
GET /v1/getDocuments
POST /v1/create_document
GET /v1/document/{id}
```

### Path parameters

Use descriptive camelCase parameter names in OpenAPI:

```txt
{documentId}
{recipientId}
{fieldId}
{jobId}
```

### JSON fields

Use camelCase:

```json
{
  "documentId": "doc_123",
  "createdAt": "2026-07-23T12:00:00.000Z"
}
```

Do not use kebab-case JSON property names such as `document-id`. They are valid JSON, but they are awkward in JavaScript/TypeScript because they require bracket access.

Use `id` for the current resource's own identifier. Use `documentId`, `recipientId`, `fieldId`, etc. only when referencing another resource.

### Enums

Use uppercase snake case values:

```json
{
  "status": "PARTIALLY_SIGNED",
  "fieldType": "SIGNATURE"
}
```

## IDs

IDs exposed through the API must be opaque strings.

Rules:

- Do not expose sequential database IDs.
- Do not require the frontend to parse meaning from IDs.
- Public signing tokens must be high-entropy and opaque.
- Use route parameter names that identify the resource type.

Examples:

```json
{
  "id": "doc_01J4X...",
  "recipientId": "rcp_01J4X..."
}
```

ID prefixes are optional but useful for debugging. If prefixes are adopted, they must be consistent.

Suggested prefixes:

```txt
usr_ user
org_ organization
doc_ document
fld_ document field
rcp_ recipient
sig_ signing request/submission
aud_ audit event
job_ background job
```

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <accessToken>
```

Recommended browser auth strategy:

- short-lived access token;
- refresh token stored in an HttpOnly, Secure cookie;
- refresh endpoint issues a new access token;
- logout invalidates refresh token/session.

Public signing endpoints do not require user login, but they require an opaque signing token in the URL.

## Tenant/workspace scoping

OpenSignFlow should use an organization/workspace tenant model from day one, even if the MVP UI only creates one personal workspace per user. This prevents a painful migration when team accounts are added later.

Protected document, recipient, field, AI, usage, and billing endpoints are scoped to the authenticated user's active organization.

For MVP:

- each registered user gets one default personal organization;
- if the user belongs to only one organization, the backend may infer it;
- if the user belongs to multiple organizations later, the client should send `X-Organization-Id`;
- the backend must always verify membership before accessing organization-scoped resources.

```http
X-Organization-Id: org_123
```

Public signing endpoints do not require `X-Organization-Id`; the organization is derived from the signing token.

## Standard headers

### Client may send

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
X-Organization-Id: organization/workspace scope for protected tenant resources
X-Request-Id: optional-client-generated-request-id
Idempotency-Key: required-for-sensitive-create-or-submit-operations
```

### Server should return

```http
X-Request-Id: request-id
```

For rate-limited endpoints:

```http
Retry-After: seconds
X-RateLimit-Limit: number
X-RateLimit-Remaining: number
X-RateLimit-Reset: unix-timestamp
```

## Request IDs

Every request should have a request ID.

If the client sends `X-Request-Id`, the backend may use it after validation. Otherwise the backend generates one.

The request ID should appear in:

- logs;
- API error responses;
- support/debug messages;
- audit metadata where useful.

## Idempotency

Sensitive POST endpoints should support `Idempotency-Key`.

Use it for:

- sending a document;
- submitting a signing response;
- starting checkout;
- creating payment-related records;
- finalizing a document;
- retryable AI/job creation endpoints.

Example:

```http
POST /v1/documents/doc_123/send
Idempotency-Key: send-doc_123-2026-07-23T12:00:00Z
```

The same idempotency key for the same user and same endpoint should return the same result or a safe conflict response.

## Success response envelope

All JSON success responses should use a `data` envelope.

### Single resource

```json
{
  "data": {
    "id": "doc_123",
    "title": "Service Agreement",
    "status": "DRAFT"
  }
}
```

### List response

```json
{
  "data": [
    {
      "id": "doc_123",
      "title": "Service Agreement",
      "status": "DRAFT"
    }
  ],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2...",
    "hasMore": true
  }
}
```

### Command accepted for async processing

Use `202 Accepted` when the operation continues in the background.

```json
{
  "data": {
    "jobId": "job_123",
    "type": "AI_DOCUMENT_SUMMARY",
    "status": "QUEUED",
    "resourceId": "doc_123"
  },
  "meta": {
    "pollUrl": "/v1/jobs/job_123"
  }
}
```

### No body

Use `204 No Content` for successful deletes or operations where no response body is useful.

## Error response envelope

All JSON error responses should use the same shape.

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

Validation error example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "status": 422,
    "requestId": "req_123",
    "timestamp": "2026-07-23T12:00:00.000Z",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid email address."
      },
      {
        "field": "recipients.0.name",
        "issue": "Name is required."
      }
    ]
  }
}
```

## Standard HTTP status codes

| Status | Meaning |
|---:|---|
| 200 | Successful read/update/action with response body |
| 201 | Resource created |
| 202 | Accepted for async processing |
| 204 | Success with no response body |
| 400 | Malformed request or invalid query syntax |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not allowed |
| 404 | Resource not found or intentionally hidden |
| 409 | Conflict with current resource state |
| 413 | Uploaded file too large |
| 415 | Unsupported media type |
| 422 | Semantic validation error |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
| 503 | Temporary service unavailable |

## Standard error codes

Error codes should be stable, uppercase snake case strings.

Examples:

```txt
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
DOCUMENT_NOT_FOUND
DOCUMENT_NOT_EDITABLE
DOCUMENT_ALREADY_SENT
DOCUMENT_ALREADY_COMPLETED
RECIPIENT_NOT_FOUND
SIGNING_TOKEN_INVALID
SIGNING_TOKEN_EXPIRED
SIGNING_ALREADY_SUBMITTED
FILE_TOO_LARGE
UNSUPPORTED_FILE_TYPE
PDF_PROCESSING_FAILED
AI_PROVIDER_UNAVAILABLE
AI_USAGE_LIMIT_EXCEEDED
PLAN_LIMIT_EXCEEDED
RATE_LIMITED
CONFLICT
INTERNAL_SERVER_ERROR
```

## Pagination

Use cursor pagination for list endpoints.

Query params:

```txt
limit=20
cursor=opaque-cursor
```

Rules:

- Default limit: 20.
- Maximum limit: 100.
- Cursor values are opaque to the client.
- Do not use offset pagination for primary dashboard lists.

Example:

```http
GET /v1/documents?limit=20&cursor=eyJjcmVhdGVkQXQiOiIyMDI2...
```

Response:

```json
{
  "data": [],
  "pagination": {
    "limit": 20,
    "nextCursor": null,
    "hasMore": false
  }
}
```

## Sorting

Use a `sort` query parameter.

```txt
sort=-createdAt
sort=title
sort=-updatedAt,title
```

Rules:

- Prefix with `-` for descending.
- No prefix means ascending.
- Backend must whitelist sortable fields per endpoint.

## Filtering and search

Use simple query parameters for MVP.

Examples:

```http
GET /v1/documents?status=DRAFT
GET /v1/documents?q=agreement
GET /v1/audit-events?documentId=doc_123&actorType=RECIPIENT
```

Avoid complex filtering syntax until needed.

## Includes and expansions

Use `include` sparingly to avoid too many endpoints or overfetching.

Example:

```http
GET /v1/documents/doc_123?include=fields,recipients,latestAiAnalysis
```

Rules:

- Includes must be explicitly whitelisted.
- Unknown includes should return `400`.
- Default responses should remain reasonably small.

## Timestamps

All timestamps must be ISO 8601 strings in UTC.

Example:

```json
{
  "createdAt": "2026-07-23T12:00:00.000Z",
  "updatedAt": "2026-07-23T12:15:00.000Z"
}
```

Do not return local timezone timestamps from the API.

## Money and billing values

Represent money in minor units.

Example:

```json
{
  "amount": 1200,
  "currency": "USD"
}
```

This means `$12.00`.

For NGN, `amount: 120000` means ₦1,200.00 if using kobo/minor units.

## Resource shape conventions

Common fields:

```json
{
  "id": "doc_123",
  "createdAt": "2026-07-23T12:00:00.000Z",
  "updatedAt": "2026-07-23T12:00:00.000Z"
}
```

Avoid returning `null` for arrays. Use empty arrays.

Use `null` only when a scalar value is intentionally absent.

## Initial resource contracts

### User

```json
{
  "id": "usr_123",
  "email": "ada@example.com",
  "name": "Ada Lovelace",
  "createdAt": "2026-07-23T12:00:00.000Z",
  "updatedAt": "2026-07-23T12:00:00.000Z"
}
```

### Document

```json
{
  "id": "doc_123",
  "title": "Service Agreement",
  "status": "DRAFT",
  "originalFileName": "service-agreement.pdf",
  "pageCount": 4,
  "organizationId": "org_123",
  "createdById": "usr_123",
  "completedAt": null,
  "createdAt": "2026-07-23T12:00:00.000Z",
  "updatedAt": "2026-07-23T12:00:00.000Z"
}
```

Suggested document statuses:

```txt
DRAFT
SENT
VIEWED
PARTIALLY_SIGNED
COMPLETED
CANCELLED
```

### Document field

Coordinates should be normalized so they are independent of the rendered PDF size.

```json
{
  "id": "fld_123",
  "documentId": "doc_123",
  "recipientId": "rcp_123",
  "type": "SIGNATURE",
  "pageNumber": 1,
  "x": 0.64,
  "y": 0.78,
  "width": 0.22,
  "height": 0.06,
  "required": true,
  "label": "Client signature",
  "createdAt": "2026-07-23T12:00:00.000Z",
  "updatedAt": "2026-07-23T12:00:00.000Z"
}
```

Coordinate rules:

- `pageNumber` starts at `1`.
- `x`, `y`, `width`, and `height` are decimals from `0` to `1` relative to page dimensions.
- `x` and `y` represent the top-left corner in viewer coordinates.
- PDF finalization must convert normalized coordinates to PDF coordinate space.

Field types:

```txt
SIGNATURE
INITIALS
TEXT
DATE
CHECKBOX
```

### Recipient

```json
{
  "id": "rcp_123",
  "documentId": "doc_123",
  "name": "Grace Hopper",
  "email": "grace@example.com",
  "status": "PENDING",
  "signingOrder": 1,
  "viewedAt": null,
  "signedAt": null,
  "createdAt": "2026-07-23T12:00:00.000Z",
  "updatedAt": "2026-07-23T12:00:00.000Z"
}
```

Recipient statuses:

```txt
PENDING
SENT
VIEWED
SIGNED
DECLINED
EXPIRED
```

### Audit event

```json
{
  "id": "aud_123",
  "documentId": "doc_123",
  "eventType": "DOCUMENT_SENT",
  "actorType": "USER",
  "actorEmail": "ada@example.com",
  "ipAddress": "203.0.113.10",
  "userAgent": "Mozilla/5.0...",
  "metadata": {},
  "createdAt": "2026-07-23T12:00:00.000Z"
}
```

Audit event types should be stable enum values.

Examples:

```txt
DOCUMENT_CREATED
DOCUMENT_UPLOADED
DOCUMENT_FIELD_CREATED
DOCUMENT_FIELD_UPDATED
DOCUMENT_FIELD_DELETED
RECIPIENT_CREATED
DOCUMENT_SENT
SIGNING_LINK_OPENED
RECIPIENT_VIEWED
RECIPIENT_SIGNED
DOCUMENT_COMPLETED
FINAL_PDF_GENERATED
AI_SUMMARY_GENERATED
AI_FIELD_SUGGESTIONS_GENERATED
SUBSCRIPTION_UPDATED
```

## Endpoint conventions by module

### Auth

```txt
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
POST   /v1/auth/logout
GET    /v1/auth/me
```

Register response:

```json
{
  "data": {
    "user": {
      "id": "usr_123",
      "email": "ada@example.com",
      "name": "Ada Lovelace"
    },
    "accessToken": "eyJ..."
  }
}
```

### Documents

```txt
GET    /v1/documents
POST   /v1/documents
GET    /v1/documents/{documentId}
PATCH  /v1/documents/{documentId}
DELETE /v1/documents/{documentId}
POST   /v1/documents/{documentId}/send
POST   /v1/documents/{documentId}/cancel
GET    /v1/documents/{documentId}/download-url?variant=original|completed
```

MVP document upload can use multipart form data:

```http
POST /v1/documents
Content-Type: multipart/form-data

file=<PDF>
title=Service Agreement
```

Future large-file upload can add pre-signed upload intents without breaking the core document resource.

### Fields

```txt
GET    /v1/documents/{documentId}/fields
POST   /v1/documents/{documentId}/fields
PATCH  /v1/documents/{documentId}/fields/{fieldId}
DELETE /v1/documents/{documentId}/fields/{fieldId}
```

Batch replacement can be added for editor autosave:

```txt
PUT /v1/documents/{documentId}/fields
```

Use `PUT` here to replace the full field collection for a document.

### Recipients

```txt
GET    /v1/documents/{documentId}/recipients
POST   /v1/documents/{documentId}/recipients
PATCH  /v1/documents/{documentId}/recipients/{recipientId}
DELETE /v1/documents/{documentId}/recipients/{recipientId}
```

### Public signing

```txt
GET  /v1/signing-requests/{token}
POST /v1/signing-requests/{token}/viewed
POST /v1/signing-requests/{token}/submit
```

Public signing endpoint rules:

- no user JWT required;
- token must be high entropy;
- rate limit aggressively;
- never expose other recipients' private data;
- log audit events for open, view, and submit;
- signing submission should be idempotent.

### Audit

```txt
GET /v1/documents/{documentId}/audit-events
```

Later, admin/team-level audit can use:

```txt
GET /v1/audit-events
```

### AI

AI operations may be synchronous or asynchronous depending on cost and latency.

```txt
POST /v1/documents/{documentId}/ai/summary
GET  /v1/documents/{documentId}/ai/summary
POST /v1/documents/{documentId}/ai/field-suggestions
GET  /v1/documents/{documentId}/ai/field-suggestions
POST /v1/documents/{documentId}/ai/email-draft
```

If queued:

```http
202 Accepted
```

with a job response.

### Jobs

```txt
GET /v1/jobs/{jobId}
```

Job statuses:

```txt
QUEUED
PROCESSING
COMPLETED
FAILED
CANCELLED
```

### Billing and usage

```txt
GET  /v1/billing/plans
GET  /v1/billing/subscription
POST /v1/billing/checkout-sessions
POST /v1/billing/portal-sessions
GET  /v1/usage/current-period
```

Payment provider webhooks should verify provider signatures and use raw request bodies.

## Command endpoint rules

Some domain operations are commands because they trigger state transitions, emails, jobs, or external effects.

Examples:

```txt
POST /v1/documents/{documentId}/send
POST /v1/documents/{documentId}/cancel
POST /v1/signing-requests/{token}/submit
```

Rules for command endpoints:

- Use `POST`.
- Use a verb at the end of the path.
- Require idempotency when retrying could cause duplicates.
- Return the updated resource, a command result, or `202 Accepted` job response.
- Audit the action.

## Validation standard

Backend validation is authoritative.

Use DTOs with validation decorators or Zod-backed validation. OpenAPI must reflect request body expectations.

Validation errors should return `422 VALIDATION_ERROR` when the JSON is syntactically valid but semantically wrong.

Malformed JSON should return `400`.

## OpenAPI standard

Every controller must include:

- operation summary;
- operation description where useful;
- tags;
- auth requirement metadata;
- request body schema;
- response schema;
- error response references where possible.

The OpenAPI document is the source of truth for the generated frontend API client.

## Backward compatibility

Until `/v2` exists, do not make breaking changes to `/v1` after public release.

Breaking changes include:

- removing fields;
- changing field types;
- changing enum values;
- changing error code names;
- changing required request fields without default behavior;
- changing endpoint behavior incompatibly.

Safe changes include:

- adding optional response fields;
- adding optional request fields;
- adding new enum values if the frontend handles unknown values defensively;
- adding new endpoints.

## Frontend integration rules

TanStack Query hooks should map to API resources and use stable query keys.

Examples:

```txt
GET /v1/documents
  -> useDocumentsQuery(filters)

GET /v1/documents/{documentId}
  -> useDocumentQuery(documentId)

POST /v1/documents/{documentId}/fields
  -> useCreateDocumentFieldMutation(documentId)
```

Mutations should use API error codes for user-facing messages and form-level/field-level errors.

## Contract testing direction

Later CI should verify:

- API builds successfully;
- OpenAPI spec is generated;
- generated client compiles;
- frontend typecheck passes against the client;
- error response shape is tested in e2e tests;
- key endpoints have integration tests.

## REST contract checklist

Before adding a new endpoint, confirm:

- [ ] Is it under `/v1`?
- [ ] Is the path lowercase and resource-oriented?
- [ ] Are path params descriptive?
- [ ] Does it use the standard success envelope?
- [ ] Does it use the standard error envelope?
- [ ] Are status codes correct?
- [ ] Does it require auth, public token, or neither?
- [ ] Does it need idempotency?
- [ ] Is it documented in OpenAPI?
- [ ] Does it create an audit event if sensitive?
- [ ] Is it rate-limited if public or costly?
- [ ] Does the frontend have a typed query/mutation hook?
