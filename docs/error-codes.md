# Error Codes

## Purpose

OpenSignFlow uses stable, machine-readable error codes so the frontend, API clients, tests, logs, and support workflows can handle failures consistently.

Every API error response must follow the standard REST error envelope:

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

## Rules

Error codes must be:

- stable;
- uppercase snake case;
- unique;
- user safe;
- documented;
- specific enough for client behavior;
- not overloaded with multiple unrelated meanings.

Do not include dynamic values inside error codes.

Good:

```txt
DOCUMENT_NOT_FOUND
PLAN_LIMIT_EXCEEDED
SIGNING_TOKEN_EXPIRED
```

Bad:

```txt
DOCUMENT_doc_123_NOT_FOUND
ErrorDocumentNotFound
not-found
```

## Source of truth

The backend source of truth is:

```txt
apps/api/src/common/errors/error-code.ts
```

This document explains the taxonomy. The code file is what backend implementation should import.

The frontend should not hardcode broad assumptions about HTTP status alone. It should use `error.code` for product-specific behavior.

Later, OpenAPI/client generation should expose the API error schema to the frontend.

## Error response fields

| Field | Meaning |
|---|---|
| `code` | Stable machine-readable code |
| `message` | Safe human-readable message |
| `status` | HTTP status code |
| `requestId` | Trace/debug ID |
| `timestamp` | UTC ISO timestamp |
| `details` | Optional field-level or structured details |

## Status code guidance

| HTTP status | Use for |
|---:|---|
| 400 | Malformed syntax, invalid query syntax, malformed multipart request |
| 401 | Missing/invalid/expired authentication |
| 403 | Authenticated but not allowed, when revealing existence is safe |
| 404 | Resource not found or intentionally hidden from caller |
| 409 | Conflict with current resource state or duplicate resource |
| 413 | File too large |
| 415 | Unsupported media type |
| 422 | Semantically invalid request body or domain validation failure |
| 429 | Rate limit exceeded |
| 500 | Unexpected server failure |
| 503 | Temporary dependency/provider outage |

## Security note: 403 vs 404

For tenant-scoped resources such as documents, recipients, signing requests, and audit events, prefer returning `404` when the caller should not know whether the resource exists.

Example:

```txt
DOCUMENT_NOT_FOUND
```

can mean either:

- the document does not exist; or
- it is not accessible to the current organization/user.

Use `403` only when the caller is allowed to know the resource exists but lacks permission for the action.

## Common/system codes

| Code | HTTP | Meaning |
|---|---:|---|
| `BAD_REQUEST` | 400 | Malformed request or unsupported query syntax |
| `VALIDATION_ERROR` | 422 | Request body/query is syntactically valid but semantically invalid |
| `UNAUTHORIZED` | 401 | Authentication is missing or invalid |
| `FORBIDDEN` | 403 | Caller is authenticated but not allowed |
| `RESOURCE_NOT_FOUND` | 404 | Generic fallback for missing resource |
| `CONFLICT` | 409 | Generic fallback for resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary service/dependency outage |

## Auth/session/user codes

| Code | HTTP | Meaning |
|---|---:|---|
| `EMAIL_ALREADY_REGISTERED` | 409 | Email is already registered |
| `INVALID_CREDENTIALS` | 401 | Login credentials are incorrect |
| `ACCESS_TOKEN_INVALID` | 401 | Access token is invalid or expired |
| `REFRESH_TOKEN_REQUIRED` | 401 | Refresh token cookie is missing |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token is invalid, revoked, or expired |
| `USER_NOT_FOUND` | 404 | User was not found or is inaccessible |
| `SESSION_NOT_FOUND` | 404 | Session was not found |
| `SESSION_REVOKED` | 401 | Session has been revoked |

## Organization/workspace codes

| Code | HTTP | Meaning |
|---|---:|---|
| `ORGANIZATION_REQUIRED` | 400 | Organization/workspace scope is required |
| `ORGANIZATION_NOT_FOUND` | 404 | Organization was not found or is inaccessible |
| `ORGANIZATION_ACCESS_DENIED` | 403 | Caller lacks permission in organization |
| `ORGANIZATION_MEMBER_NOT_FOUND` | 404 | Organization member was not found |
| `ORGANIZATION_INVITATION_NOT_FOUND` | 404 | Invitation was not found or expired |
| `ORGANIZATION_INVITATION_ALREADY_USED` | 409 | Invitation was already accepted/used |

## Document codes

| Code | HTTP | Meaning |
|---|---:|---|
| `DOCUMENT_NOT_FOUND` | 404 | Document was not found or is inaccessible |
| `DOCUMENT_NOT_EDITABLE` | 409 | Document can no longer be edited |
| `DOCUMENT_ALREADY_SENT` | 409 | Document has already been sent |
| `DOCUMENT_ALREADY_COMPLETED` | 409 | Document is already completed |
| `DOCUMENT_CANCELLED` | 409 | Document workflow has been cancelled |
| `DOCUMENT_SEND_REQUIREMENTS_NOT_MET` | 422 | Document cannot be sent because required fields/recipients are missing |
| `DOCUMENT_DELETE_NOT_ALLOWED` | 409 | Document cannot be deleted in its current state |

## File/storage/PDF codes

| Code | HTTP | Meaning |
|---|---:|---|
| `FILE_REQUIRED` | 422 | Required uploaded file is missing |
| `FILE_TOO_LARGE` | 413 | Uploaded file exceeds size limit |
| `UNSUPPORTED_FILE_TYPE` | 415 | Uploaded file type is not supported |
| `STORAGE_UPLOAD_FAILED` | 503 | Storage upload failed |
| `STORAGE_DOWNLOAD_URL_FAILED` | 503 | Signed download/preview URL could not be generated |
| `PDF_PROCESSING_FAILED` | 500 | Generic PDF processing failure |
| `PDF_ENCRYPTED_UNSUPPORTED` | 422 | Encrypted/password-protected PDF is not supported yet |
| `PDF_PAGE_COUNT_FAILED` | 500 | Could not determine PDF page count |
| `PDF_TEXT_EXTRACTION_FAILED` | 500 | Could not extract text from PDF |

## Document field codes

| Code | HTTP | Meaning |
|---|---:|---|
| `DOCUMENT_FIELD_NOT_FOUND` | 404 | Document field was not found |
| `DOCUMENT_FIELD_INVALID_POSITION` | 422 | Field coordinates are invalid |
| `DOCUMENT_FIELD_RECIPIENT_REQUIRED` | 422 | Field requires an assigned recipient |
| `DOCUMENT_FIELD_TYPE_UNSUPPORTED` | 422 | Field type is unsupported for the operation |

## Recipient codes

| Code | HTTP | Meaning |
|---|---:|---|
| `RECIPIENT_NOT_FOUND` | 404 | Recipient was not found |
| `RECIPIENT_ALREADY_EXISTS` | 409 | Recipient already exists for this document |
| `RECIPIENT_REQUIRED` | 422 | At least one recipient is required |
| `RECIPIENT_ALREADY_SIGNED` | 409 | Recipient has already signed |
| `RECIPIENT_EMAIL_INVALID` | 422 | Recipient email is invalid |

## Signing codes

| Code | HTTP | Meaning |
|---|---:|---|
| `SIGNING_REQUEST_NOT_FOUND` | 404 | Signing request was not found |
| `SIGNING_TOKEN_INVALID` | 401 | Signing token is invalid |
| `SIGNING_TOKEN_EXPIRED` | 401 | Signing token has expired |
| `SIGNING_ALREADY_SUBMITTED` | 409 | Signing request has already been submitted |
| `SIGNING_REQUIRED_FIELDS_MISSING` | 422 | Required signing fields are missing |
| `SIGNING_SUBMISSION_INVALID` | 422 | Signing submission payload is invalid |
| `SIGNING_REQUEST_REVOKED` | 409 | Signing request was revoked |

## Audit codes

| Code | HTTP | Meaning |
|---|---:|---|
| `AUDIT_EVENT_NOT_FOUND` | 404 | Audit event was not found |
| `AUDIT_LOG_UNAVAILABLE` | 503 | Audit log is temporarily unavailable |

## AI codes

| Code | HTTP | Meaning |
|---|---:|---|
| `AI_PROVIDER_UNAVAILABLE` | 503 | AI provider is unavailable |
| `AI_USAGE_LIMIT_EXCEEDED` | 429 | AI usage limit has been reached |
| `AI_ANALYSIS_NOT_FOUND` | 404 | AI analysis was not found |
| `AI_OUTPUT_INVALID` | 502 | AI provider returned invalid/unusable output |
| `AI_DOCUMENT_TEXT_UNAVAILABLE` | 422 | Document text is unavailable for AI operation |
| `AI_OPERATION_NOT_SUPPORTED` | 422 | Requested AI operation is unsupported |

## Billing/usage codes

| Code | HTTP | Meaning |
|---|---:|---|
| `PLAN_LIMIT_EXCEEDED` | 403 | Current plan limit has been reached |
| `SUBSCRIPTION_REQUIRED` | 402 | Paid subscription is required |
| `SUBSCRIPTION_INACTIVE` | 403 | Subscription is inactive or past due |
| `CHECKOUT_FAILED` | 503 | Checkout session could not be created |
| `BILLING_PROVIDER_ERROR` | 503 | Billing provider request failed |
| `USAGE_RECORD_FAILED` | 500 | Usage could not be recorded |

## Job/idempotency/webhook codes

| Code | HTTP | Meaning |
|---|---:|---|
| `JOB_NOT_FOUND` | 404 | Background job was not found |
| `JOB_FAILED` | 500 | Background job failed |
| `JOB_NOT_READY` | 409 | Background job has not completed yet |
| `JOB_CANCELLED` | 409 | Background job was cancelled |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | Endpoint requires an idempotency key |
| `IDEMPOTENCY_CONFLICT` | 409 | Same idempotency key was used with a different request |
| `IDEMPOTENCY_REPLAY_IN_PROGRESS` | 409 | Original idempotent request is still processing |
| `WEBHOOK_SIGNATURE_INVALID` | 401 | Webhook signature validation failed |
| `WEBHOOK_EVENT_UNSUPPORTED` | 422 | Webhook event type is unsupported |

## Frontend handling guidelines

Frontend code should branch on `error.code` for product behavior.

Examples:

- `INVALID_CREDENTIALS`: show login form error.
- `EMAIL_ALREADY_REGISTERED`: show registration form email error.
- `PLAN_LIMIT_EXCEEDED`: open upgrade prompt.
- `DOCUMENT_NOT_EDITABLE`: refresh document and show state message.
- `SIGNING_TOKEN_EXPIRED`: show expired signing-link page.

Do not rely only on HTTP status.

## Backend implementation checklist

Before adding a new error:

- [ ] Can an existing code accurately represent it?
- [ ] Is the code uppercase snake case?
- [ ] Is it stable and user safe?
- [ ] Is the HTTP status appropriate?
- [ ] Is the message safe to expose?
- [ ] Is it added to `apps/api/src/common/errors/error-code.ts`?
- [ ] Is it documented here?
- [ ] Does the frontend need special handling?
