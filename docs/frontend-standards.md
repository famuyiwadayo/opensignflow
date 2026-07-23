# Frontend Standards

## Goal

The frontend should be clean, accessible, type-safe, and easy to maintain. It should show strong product engineering skills without overcomplicating the MVP.

## Frontend stack

| Concern | Tool |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui |
| Server state | TanStack Query |
| Forms | TanStack Form |
| Tables | TanStack Table |
| Virtualized lists | TanStack Virtual where useful |
| Validation | Zod |
| PDF rendering | PDF.js / react-pdf exploration |
| Signature capture | canvas-based signature component |

## TanStack decisions

### Use TanStack Query for server state

Use TanStack Query for:

- document list fetching;
- document detail fetching;
- recipients;
- fields;
- audit events;
- AI summaries;
- billing/subscription state;
- mutations such as upload, save field, send document, and submit signature.

Do not duplicate server state into global client stores unless there is a strong reason.

Recommended conventions:

```ts
queryKeys.documents.list(filters)
queryKeys.documents.detail(documentId)
queryKeys.documents.fields(documentId)
queryKeys.documents.recipients(documentId)
queryKeys.documents.audit(documentId)
queryKeys.ai.summary(documentId)
```

Mutations should invalidate or update the smallest useful query scope.

Example:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: queryKeys.documents.detail(documentId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.documents.fields(documentId) });
}
```

### Use TanStack Form for forms

Use TanStack Form for forms that need strong validation and predictable state:

- registration;
- login;
- document upload metadata;
- recipient creation/editing;
- text/date field value entry;
- signer submission;
- billing profile forms;
- team/member settings later.

Pair TanStack Form with Zod schemas where possible.

Recommended form pattern:

```txt
schema -> form defaults -> field components -> submit mutation -> API error mapping
```

Frontend validation improves UX, but backend validation remains authoritative.

### Use TanStack Table for data tables

Use TanStack Table for:

- document dashboard;
- recipients table;
- audit event table;
- usage records;
- team members later.

For MVP, keep tables simple. Add advanced column visibility, saved views, and bulk actions later.

### Use TanStack Virtual selectively

Use TanStack Virtual only when lists can become long, such as:

- audit logs;
- large document lists;
- usage records;
- template libraries later.

Avoid adding it prematurely to small forms or simple lists.

## Routing

Use Next.js App Router.

Do not use TanStack Router in this project unless we later move away from Next.js routing. Next.js routing is sufficient and standard for this stack.

Suggested routes:

```txt
/                         Landing page
/pricing                  Pricing page
/auth/login               Login
/auth/register            Register
/app                      Authenticated dashboard
/app/documents            Document list
/app/documents/new        Upload document
/app/documents/[id]       Document detail
/app/documents/[id]/edit  PDF field editor
/app/documents/[id]/audit Audit trail
/sign/[token]             Public signing page
```

## API access

The frontend should access the backend through one API layer:

```txt
packages/api-client
```

or, before that package exists:

```txt
apps/web/src/lib/api
```

Avoid raw `fetch` calls directly inside UI components.

Recommended API call flow:

```txt
UI component
  -> feature hook using TanStack Query
    -> typed API client
      -> REST API
```

## Component structure

Feature-oriented structure is preferred:

```txt
apps/web/src/
  app/
  components/
    ui/
  features/
    auth/
    documents/
    document-editor/
    signing/
    ai/
    billing/
  lib/
    api/
    query-client/
    validators/
```

## State management

Prefer this order:

1. URL state for filters, pagination, and selected tabs.
2. TanStack Query for server state.
3. Local React state for UI state.
4. Context for cross-tree UI concerns.
5. External global store only if truly needed later.

Likely global store candidates later:

- PDF editor transient state;
- selected tool in editor;
- zoom/page state.

Even then, keep persisted server data in the backend and TanStack Query.

## Error handling

All API errors should follow the REST contract error shape.

The frontend API client should normalize errors into a predictable type:

```ts
type ApiError = {
  code: string;
  message: string;
  status: number;
  requestId?: string;
  details?: Array<{ field?: string; issue: string }>;
};
```

Forms should map field-level validation errors back into TanStack Form fields when possible.

## Accessibility expectations

- All interactive controls should be keyboard-accessible.
- Buttons must have visible focus states.
- Form fields must have labels and validation messages.
- PDF field placement must provide at least a basic non-drag fallback later.
- Color should not be the only way to communicate status.

## Design principles

- Simple first, polished later.
- Make the signing flow extremely clear.
- Do not hide important legal/security disclaimers.
- Treat document status as a first-class UI concept.
- Show auditability and trust signals throughout the app.
