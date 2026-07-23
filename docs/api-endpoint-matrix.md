# API Endpoint Matrix

## Purpose

This matrix translates the REST contract into concrete endpoints for the MVP and near-future roadmap.

The source of truth during implementation will be NestJS controllers plus the generated OpenAPI document, but this file keeps the intended API surface clear before coding.

## Global conventions

- Base path: `/v1`.
- Protected routes require `Authorization: Bearer <accessToken>`.
- Organization-scoped protected routes may use `X-Organization-Id` once multiple workspaces exist.
- JSON success responses use `{ "data": ... }`.
- JSON errors use `{ "error": ... }`.
- IDs use `id` for the current resource and `documentId`, `recipientId`, etc. for references.
- Sensitive commands should support `Idempotency-Key`.
- Public signing routes are aggressively rate-limited.

## Legend

| Column | Meaning |
|---|---|
| Auth | `User` means logged-in user, `PublicToken` means signing token, `Public` means no auth |
| MVP | `Yes` for first complete release, `Later` for post-MVP |
| Idem | Should support `Idempotency-Key` |
| Audit | Should create an audit event |

## Health

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/health` | Public | Yes | No | No | Infrastructure health check |
| GET | `/v1/health` | Public | Optional | No | No | Versioned API health check |

## Auth

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| POST | `/v1/auth/register` | Public | Yes | Optional | Optional | Create user and default personal organization |
| POST | `/v1/auth/login` | Public | Yes | No | Optional | Authenticate and create session |
| POST | `/v1/auth/refresh` | Refresh cookie | Yes | No | No | Rotate/refresh access token |
| POST | `/v1/auth/logout` | User | Yes | Yes | Optional | Revoke current session |
| GET | `/v1/auth/me` | User | Yes | No | No | Return current user and active organization context |

## Organizations / workspaces

MVP can create a default personal organization on registration and hide most organization UI.

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/organizations` | User | Yes | No | No | List organizations the user belongs to |
| GET | `/v1/organizations/{organizationId}` | User | Later | No | No | Get organization details |
| PATCH | `/v1/organizations/{organizationId}` | User | Later | No | Yes | Update organization name/settings |
| GET | `/v1/organizations/{organizationId}/members` | User | Later | No | No | List members |
| POST | `/v1/organizations/{organizationId}/invitations` | User | Later | Yes | Yes | Invite team member |
| DELETE | `/v1/organizations/{organizationId}/members/{memberId}` | User | Later | Yes | Yes | Remove team member |

## Documents

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/documents` | User | Yes | No | No | List documents with cursor pagination |
| POST | `/v1/documents` | User | Yes | Yes | Yes | Create document by uploading PDF with multipart form data |
| GET | `/v1/documents/{documentId}` | User | Yes | No | No | Get document details |
| PATCH | `/v1/documents/{documentId}` | User | Yes | No | Yes | Update title or editable metadata |
| DELETE | `/v1/documents/{documentId}` | User | Yes | Yes | Yes | Soft-delete draft/cancelled document |
| POST | `/v1/documents/{documentId}/send` | User | Yes | Yes | Yes | Send document to recipients |
| POST | `/v1/documents/{documentId}/cancel` | User | Yes | Yes | Yes | Cancel a non-completed signing workflow |
| GET | `/v1/documents/{documentId}/download-url?variant=original` | User | Yes | No | Optional | Get signed URL for original PDF |
| GET | `/v1/documents/{documentId}/download-url?variant=completed` | User | Yes | No | Optional | Get signed URL for completed PDF |

### `POST /v1/documents` MVP request

`multipart/form-data`:

```txt
file: PDF file
title: optional document title
```

Success:

```http
201 Created
```

```json
{
  "data": {
    "id": "doc_123",
    "title": "Service Agreement",
    "status": "DRAFT",
    "organizationId": "org_123",
    "createdById": "usr_123"
  }
}
```

## Document fields

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/documents/{documentId}/fields` | User | Yes | No | No | List fields for editor |
| POST | `/v1/documents/{documentId}/fields` | User | Yes | Optional | Yes | Create one field |
| PUT | `/v1/documents/{documentId}/fields` | User | Yes | Yes | Yes | Replace full field collection for autosave/batch save |
| PATCH | `/v1/documents/{documentId}/fields/{fieldId}` | User | Yes | No | Yes | Update a field |
| DELETE | `/v1/documents/{documentId}/fields/{fieldId}` | User | Yes | Yes | Yes | Delete a field |

### Field create request

```json
{
  "recipientId": "rcp_123",
  "type": "SIGNATURE",
  "pageNumber": 1,
  "x": 0.64,
  "y": 0.78,
  "width": 0.22,
  "height": 0.06,
  "required": true,
  "label": "Client signature"
}
```

## Recipients

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/documents/{documentId}/recipients` | User | Yes | No | No | List recipients |
| POST | `/v1/documents/{documentId}/recipients` | User | Yes | Optional | Yes | Create recipient |
| PATCH | `/v1/documents/{documentId}/recipients/{recipientId}` | User | Yes | No | Yes | Update recipient while document is draft |
| DELETE | `/v1/documents/{documentId}/recipients/{recipientId}` | User | Yes | Yes | Yes | Delete recipient while document is draft |

### Recipient create request

```json
{
  "name": "Grace Hopper",
  "email": "grace@example.com",
  "signingOrder": 1
}
```

## Public signing

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/signing-requests/{token}` | PublicToken | Yes | No | Optional | Get signing request data for recipient |
| POST | `/v1/signing-requests/{token}/viewed` | PublicToken | Yes | Yes | Yes | Mark request as viewed |
| POST | `/v1/signing-requests/{token}/submit` | PublicToken | Yes | Yes | Yes | Submit field values and signatures |
| POST | `/v1/signing-requests/{token}/decline` | PublicToken | Later | Yes | Yes | Recipient declines to sign |

### Signing request response should not leak unnecessary data

Return only what the signer needs:

```json
{
  "data": {
    "document": {
      "id": "doc_123",
      "title": "Service Agreement",
      "pageCount": 4,
      "previewUrl": "https://signed-temporary-url"
    },
    "recipient": {
      "id": "rcp_123",
      "name": "Grace Hopper",
      "email": "grace@example.com",
      "status": "SENT"
    },
    "fields": []
  }
}
```

## Audit

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/documents/{documentId}/audit-events` | User | Yes | No | No | List audit events for a document |
| GET | `/v1/audit-events` | User | Later | No | No | Organization-wide audit trail |

## AI

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| POST | `/v1/documents/{documentId}/ai/summary` | User | Yes | Yes | Yes | Queue or generate AI document summary |
| GET | `/v1/documents/{documentId}/ai/summary` | User | Yes | No | No | Get latest AI summary |
| POST | `/v1/documents/{documentId}/ai/field-suggestions` | User | Yes | Yes | Yes | Queue or generate AI field suggestions |
| GET | `/v1/documents/{documentId}/ai/field-suggestions` | User | Yes | No | No | Get latest field suggestions |
| POST | `/v1/documents/{documentId}/ai/email-draft` | User | Yes | Yes | Optional | Generate signing email draft |
| POST | `/v1/documents/{documentId}/ai/risk-check` | User | Later | Yes | Yes | Generate informational risk highlights |

### Async AI response

Longer AI tasks should return:

```http
202 Accepted
```

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

## Jobs

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/jobs/{jobId}` | User | Yes | No | No | Poll background job status |

## Billing and usage

Billing can be delayed until after the signing MVP works, but the endpoint shape should be planned now.

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| GET | `/v1/billing/plans` | Public | Later | No | No | List public SaaS plans |
| GET | `/v1/billing/subscription` | User | Later | No | No | Get current organization subscription |
| POST | `/v1/billing/checkout-sessions` | User | Later | Yes | Yes | Start subscription checkout |
| POST | `/v1/billing/portal-sessions` | User | Later | Yes | Optional | Create billing management portal session |
| GET | `/v1/usage/current-period` | User | Later | No | No | Get current usage against plan limits |

## Provider webhooks

Provider webhooks may live outside `/v1` because they are not customer-facing REST endpoints.

| Method | Path | Auth | MVP | Idem | Audit | Purpose |
|---|---|---|---|---|---|---|
| POST | `/webhooks/paystack` | Provider signature | Later | Yes | Yes | Paystack events |
| POST | `/webhooks/flutterwave` | Provider signature | Later | Yes | Yes | Flutterwave events |
| POST | `/webhooks/paddle` | Provider signature | Later | Yes | Yes | Paddle events |
| POST | `/webhooks/resend` | Provider signature | Later | Optional | Optional | Email delivery events |

## Endpoint implementation order

1. `GET /health`
2. `POST /v1/auth/register`
3. `POST /v1/auth/login`
4. `GET /v1/auth/me`
5. `GET /v1/organizations`
6. `POST /v1/documents`
7. `GET /v1/documents`
8. `GET /v1/documents/{documentId}`
9. field endpoints
10. recipient endpoints
11. `POST /v1/documents/{documentId}/send`
12. public signing endpoints
13. final PDF generation/job endpoint
14. audit events
15. AI endpoints
16. billing/usage endpoints

## Contract questions to revisit during implementation

- Should document upload remain multipart through the API, or should we add direct-to-storage upload intents earlier?
- Should `POST /v1/documents/{documentId}/send` always generate signing requests immediately, or should it support scheduled sending later?
- Should AI endpoints always be async for consistency, even when a provider responds quickly?
- Should completed PDF finalization be a separate command endpoint or always triggered automatically after all recipients sign?

Recommended defaults for MVP:

- multipart upload through API;
- send immediately;
- AI summary and field suggestions async;
- email draft can be synchronous;
- final PDF generation is automatic after the last required signature.
