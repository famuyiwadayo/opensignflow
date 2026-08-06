# Recipient, Field, and Signing Workflow

**Status:** Product and backend design reference  
**Scope:** document recipients, recipient roles, document fields, field ownership, send eligibility, signing order, activity visibility, and future public signing behavior.

---

## 1. Mental model

OpenSignFlow separates people, work on a PDF, secure invitations, and completed actions.

```txt
Recipient
  = person involved in a document workflow

Document field
  = one positioned control/task on a PDF

Field assignment
  = which recipient owns that task

Signing request
  = one secure invitation/access capability for a recipient

Signing submission
  = completed work submitted through a signing request
```

A document is the container:

```txt
Document
  ├─ many recipients
  ├─ many document fields
  ├─ many signing requests
  ├─ many signing submissions
  └─ many audit events
```

---

## 2. Recipient roles

The first explicit role model is:

```txt
SIGNER
CC
```

The default role is `SIGNER` to preserve current behavior for newly created recipients.

### SIGNER

A signer:

```txt
may own document fields
must own at least one field before sending
receives a signing request
receives a secure signing link
may submit only fields assigned to them
participates in signing completion and signing order
```

### CC

A CC recipient:

```txt
does not own signing fields
does not receive a signing request
does not block document completion
may later receive sent/completed informational email
```

Future roles are deliberately deferred:

```txt
VIEWER
APPROVER
```

They require separate view-only and approval semantics and must not be faked as signers with no fields.

---

## 3. Field ownership

A field belongs to one document and is assigned to one signer.

```txt
DocumentField
  documentId
  recipientId
  type
  pageNumber
  x, y, width, height
  required
```

Initial field types are:

```txt
SIGNATURE
INITIALS
TEXT
DATE
CHECKBOX
```

For the initial signing product:

```txt
all fields are signer-owned
all fields require a SIGNER recipient
required fields must be completed by that signer
```

A field may not be assigned to:

```txt
another document's recipient
CC recipient
missing recipient
```

## 4. Bulk field assignment

Creating a field individually remains useful for editor placement, but an owner must not need to reassign many fields one by one.

The planned API is a narrow, transactional bulk operation:

```http
PATCH /v1/documents/{documentId}/fields/bulk-assignment
```

```json
{
  "fieldIds": ["fld_1", "fld_2", "fld_3"],
  "recipientId": "rcp_grace"
}
```

It must:

```txt
validate draft status
validate every field belongs to the document
validate recipient belongs to document and has SIGNER role
update all fields transactionally
record a bulk audit event or one auditable aggregate event
```

The editor should also remember the currently selected signer so newly placed fields receive that signer automatically.

A full field-collection replacement endpoint remains deferred until document revision/concurrency semantics exist.

---

## 5. Draft versus sent rules

### Draft

While a document is `DRAFT`, owners may:

```txt
add/edit/remove recipients
change recipient roles
place/reposition/delete fields
assign/reassign fields
```

### Sent and later states

After a document is sent:

```txt
recipient and field assignment are immutable
```

Changes require an explicit future workflow:

```txt
revoke affected signing request
cancel or replace recipient
issue a new signing request/token
record audit events
```

No normal PATCH endpoint may silently reassign fields after a signer receives a link.

A draft signer may change to `CC` only when they own zero fields. If fields remain assigned, the API returns `RECIPIENT_ROLE_CHANGE_REQUIRES_FIELD_REASSIGNMENT`; the owner must explicitly bulk-reassign or delete those fields first. A `CC` may become a signer during draft, but must receive at least one field before send.

---

## 6. Send eligibility

A document may transition from `DRAFT` to `SENT` only if:

```txt
it belongs to the active organization
it has at least one SIGNER
it has at least one field
all fields are assigned to a document SIGNER
all SIGNER recipients own at least one field
```

CC recipients do not affect signer eligibility.

The sendable recipient set is:

```txt
all recipients where role = SIGNER
```

because every signer is required to have at least one assigned field.

On send:

```txt
one signing request is created per signer
one encrypted signing-email outbox event is created per signer
only signer recipient records move to SENT
CC delivery is separate future notification behavior
```

---

## 7. Signing modes

The data model retains `signingOrder`, but the initial product behavior is:

```txt
PARALLEL signing
```

All valid signer requests become active when the document is sent.

A future document-level signing mode will support:

```txt
PARALLEL
SEQUENTIAL
```

In sequential mode:

```txt
only the lowest incomplete signingOrder receives/has an active request
completion unlocks the next signing order
```

The field-assignment model does not change between modes.

---

## 8. Public signing authorization

Each signer receives a unique signing request and random bearer token.

```txt
Signer A → SigningRequest A → token A
Signer B → SigningRequest B → token B
```

The database stores only:

```txt
SHA-256(token)
```

The public signing flow later:

```txt
hashes supplied token
finds one active signing request
loads only fields assigned to that request's signer
accepts values only for those fields
```

A signer must never view or submit another signer's fields through their token.

---

## 9. Activity timeline

Audit events are the durable source of truth for owner-visible activity.

Relevant events include:

```txt
DOCUMENT_SENT
SIGNING_LINK_OPENED
RECIPIENT_VIEWED
RECIPIENT_SIGNED
RECIPIENT_DECLINED
DOCUMENT_COMPLETED
```

MVP dashboard behavior:

```txt
GET /v1/documents/{documentId}/audit-events
TanStack Query polls while document is active
```

Future real-time behavior:

```txt
API SSE endpoint
  GET /v1/documents/{documentId}/events

safe events:
  recipient.viewed
  recipient.signed
  recipient.declined
  document.completed
  signing.email.failed
```

SSE is preferred before WebSockets because owner activity is server-to-browser communication. WebSockets are reserved for later collaborative editing/presence needs.

---

## 10. Future workflow conjectures and prepared boundaries

| Scenario                   | Prepared now                           | Deferred work                        |
| -------------------------- | -------------------------------------- | ------------------------------------ |
| Multiple fields per signer | Field-to-recipient relation            | Public field submission              |
| Multiple signers on a page | Independent positioned fields          | PDF editor rendering                 |
| Bulk assignment            | Planned narrow batch endpoint          | UI multi-select                      |
| Sequential signing         | `signingOrder` persisted               | document signing mode + unlock logic |
| CC recipients              | Explicit role model                    | informational notification templates |
| Resend link                | SigningRequest distinct from Recipient | revoke/reissue endpoint              |
| Expiration                 | `expiresAt` exists                     | expiration worker/sweep              |
| Decline                    | Audit/event vocabulary exists          | public decline endpoint/reason       |
| Recipient replacement      | Draft-only mutation rule               | revoke/reissue workflow              |
| Live activity              | Audit timeline                         | SSE relay                            |
| Concurrent editor changes  | Full replace deferred                  | revision/If-Match strategy           |

---

## 11. Implementation order

1. Add `RecipientRole` (`SIGNER`, `CC`) and default signer migration.
2. Enforce field assignment only to signers.
3. Enforce every signer owns at least one field before send.
4. Correct send selection/status/outbox generation to use signers only.
5. Add bulk field assignment endpoint.
6. Complete transactional outbox dispatcher.
7. Implement public signing read and submission flows.
8. Add audit polling to owner dashboard.
9. Add SSE activity stream.
10. Add sequential signing mode and CC notification behavior.

## 12. MVP field-value contract

Public signing submission values are strict, not arbitrary JSON:

```txt
SIGNATURE → { type: "TYPED_NAME", name: string }
INITIALS  → short non-empty string
TEXT      → string up to 2,000 characters
DATE      → YYYY-MM-DD string
CHECKBOX  → boolean
```

Typed-name signatures are the MVP signature representation. They are accessible, auditable, and renderable by the PDF worker without image/SVG sanitization. Future signature types may add `DRAWN_SVG` or uploaded images without changing the document-field ownership model.
