# Documents Module

## Implemented scope

The first Documents module slice supports authenticated PDF upload and basic document retrieval.

Implemented endpoints:

```txt
GET  /v1/documents
POST /v1/documents
GET  /v1/documents/{documentId}
GET  /v1/documents/{documentId}/audit-events
GET  /v1/documents/{documentId}/download-url?variant=original|completed
```

## Module structure

```txt
apps/api/src/documents/
  documents.module.ts
  documents.controller.ts
  documents.service.ts
  documents.repository.ts
  documents.select.ts
  dto/
    create-document.dto.ts
    download-url-query.dto.ts
    list-documents-query.dto.ts
  entities/
    document.entity.ts
    document-download-url.entity.ts
```

Supporting modules added:

```txt
apps/api/src/storage/
apps/api/src/pdf/
apps/api/src/audit/
  audit.repository.ts
  audit.service.ts
  audit.select.ts
  dto/list-audit-events-query.dto.ts
  entities/audit-event.entity.ts
```

## Upload flow

```txt
Authenticated user uploads PDF
        ↓
DocumentsController receives multipart/form-data
        ↓
DocumentsService validates file presence, size, and PDF type
        ↓
OrganizationsService resolves active organization/workspace
        ↓
PdfService extracts page count
        ↓
StorageService uploads original PDF to S3/MinIO
        ↓
DocumentsRepository creates Document row
        ↓
AuditService records DOCUMENT_UPLOADED
        ↓
API returns DocumentEntity in { data }
```

## Request

```http
POST /v1/documents
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

Form fields:

```txt
file: PDF file, required
title: optional document title
```

If no title is provided, the title is derived from the PDF file name.

## Response

```json
{
  "data": {
    "id": "doc_...",
    "organizationId": "org_...",
    "createdById": "usr_...",
    "title": "Service Agreement",
    "status": "DRAFT",
    "originalFileName": "service-agreement.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 153420,
    "pageCount": 4,
    "completedAt": null,
    "createdAt": "2026-07-24T12:00:00.000Z",
    "updatedAt": "2026-07-24T12:00:00.000Z"
  }
}
```

## Organization scope

Protected document endpoints are scoped to the active organization.

For MVP:

- if the user belongs to exactly one organization, the backend infers it;
- if the user belongs to more than one organization, the frontend should send:

```http
X-Organization-Id: org_...
```

If organization scope is ambiguous, the API returns:

```txt
ORGANIZATION_REQUIRED
```

If the user does not belong to the requested organization, the API returns:

```txt
ORGANIZATION_NOT_FOUND
```

## Pagination

`GET /v1/documents` uses cursor pagination.

Query params:

```txt
limit=20
cursor=<opaque cursor>
status=DRAFT
q=agreement
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

## Storage

Original PDFs are stored in private S3-compatible object storage.

Local development uses MinIO from Docker Compose.

Storage keys follow this structure:

```txt
organizations/{organizationId}/documents/{documentId}/original/{fileName}
```

The API does not expose permanent public file URLs.

Downloads use short-lived signed URLs:

```txt
GET /v1/documents/{documentId}/download-url?variant=original
```

Response:

```json
{
  "data": {
    "url": "https://...",
    "variant": "original",
    "expiresAt": "2026-07-24T12:05:00.000Z"
  }
}
```

## File limits

Current MVP limits:

```txt
File type: PDF
Max size: 10 MB
```

Relevant error codes:

```txt
FILE_REQUIRED
FILE_TOO_LARGE
UNSUPPORTED_FILE_TYPE
PDF_ENCRYPTED_UNSUPPORTED
PDF_PAGE_COUNT_FAILED
STORAGE_UPLOAD_FAILED
STORAGE_DOWNLOAD_URL_FAILED
DOCUMENT_NOT_FOUND
```

## Audit events

Successful upload records:

```txt
DOCUMENT_UPLOADED
```

Audit metadata includes:

```json
{
  "originalFileName": "service-agreement.pdf",
  "fileSizeBytes": 153420,
  "pageCount": 4
}
```

## Follow-up work

Next document-related milestones:

1. document update/delete endpoints;
2. audit-events listing endpoint;
3. recipients module;
4. document fields module;
5. PDF preview support in frontend;
6. PDF editor field placement;
7. signing request flow.

## Audit events

```http
GET /v1/documents/{documentId}/audit-events?limit=20&cursor=<opaque-cursor>
Authorization: Bearer <accessToken>
```

Returns the document's immutable audit trail in descending event-time order. The endpoint uses the same active-organization scope and cursor envelope as `GET /v1/documents`; it returns `DOCUMENT_NOT_FOUND` when the document is not available in that scope.

```json
{
  "data": [
    {
      "id": "aud_...",
      "organizationId": "org_...",
      "documentId": "doc_...",
      "actorUserId": "usr_...",
      "recipientId": null,
      "eventType": "DOCUMENT_UPLOADED",
      "actorType": "USER",
      "actorEmail": "owner@example.com",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0",
      "metadata": { "originalFileName": "service-agreement.pdf", "pageCount": 4 },
      "createdAt": "2026-07-24T12:00:00.000Z"
    }
  ],
  "pagination": { "limit": 20, "nextCursor": null, "hasMore": false }
}
```
