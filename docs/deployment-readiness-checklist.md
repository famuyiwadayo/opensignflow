# Deployment Readiness Checklist

**Purpose:** visible MVP launch tracker.  
**Status labels:** `DONE`, `IN PROGRESS`, `TODO`, `POST-MVP`.

## MVP definition

A production MVP user can:

```txt
register
create a workspace
upload PDF
add signers
place fields visually
send signing email
open signing link
complete required fields
generate completed PDF
view audit activity
download completed PDF
```

---

## A. Platform and foundation

| Status      | Item                      | Notes                                                                               |
| ----------- | ------------------------- | ----------------------------------------------------------------------------------- |
| DONE        | Turborepo + Bun workspace | API, worker, web, reusable packages separated.                                      |
| DONE        | Root environment source   | Root `.env` development contract and readiness docs exist.                          |
| DONE        | Prisma 7 database package | Schema, migrations, generated client, database scripts live in `packages/database`. |
| DONE        | Redis/BullMQ package      | Queue infrastructure is reusable and worker-safe.                                   |
| DONE        | Transactional outbox      | Encrypted payloads, handlers, retries, leases, PostgreSQL notification path.        |
| DONE        | Dedicated worker          | Outbox, email, PDF finalization, and progress foundations are separate from API.    |
| DONE        | ESLint/Prettier/Husky     | Pre-commit formatting, pre-push generation/lint/typecheck.                          |
| IN PROGRESS | Test coverage             | Auth, signing, outbox, PDF renderer, document workflow packs are underway.          |

## B. Authentication and workspace

| Status   | Item                      | Notes                                                                            |
| -------- | ------------------------- | -------------------------------------------------------------------------------- |
| DONE     | Register                  | User, personal workspace, OWNER membership, FREE subscription, refresh session.  |
| DONE     | Login                     | Password verification, access token, refresh cookie.                             |
| DONE     | Refresh rotation          | Old refresh session revoked, new session issued.                                 |
| DONE     | Logout                    | Session revocation and cookie clearing.                                          |
| DONE     | Auth persistence          | TanStack Query session cache, HttpOnly refresh cookie, expired token retry-once. |
| DONE     | Active organization scope | Authenticated document APIs require active organization.                         |
| TODO     | Workspace settings        | Workspace rename, sender identity, organization switcher UI.                     |
| POST-MVP | Team invitations          | MEMBER/ADMIN invitation flow.                                                    |

## C. Document creation and editing

| Status      | Item                           | Notes                                                                                  |
| ----------- | ------------------------------ | -------------------------------------------------------------------------------------- |
| DONE        | PDF upload                     | PDF validation, page count, private storage, original key.                             |
| DONE        | Document list/details          | Authenticated list/detail API and dashboard.                                           |
| DONE        | Private preview                | Authenticated API preview proxy avoids browser-storage CORS.                           |
| DONE        | Signed download URLs           | Original/complete variants, inline/attachment disposition.                             |
| DONE        | Visual field editor foundation | PDF canvas, normalized overlays, click placement, drag, resize, zoom, page navigation. |
| IN PROGRESS | Editor shell                   | Toolbar/sidebar/canvas/inspector/status bar extraction underway.                       |
| IN PROGRESS | Editor polish                  | Recipient colors, page navigator, selected field state, inspector layout.              |
| TODO        | Field placement persistence UX | Save/saving/error state, field drag/resize tests, visual field palette.                |
| TODO        | Document update API/UI         | Rename draft, draft metadata editing.                                                  |
| TODO        | Draft delete API/UI            | Soft delete plus storage cleanup policy.                                               |
| POST-MVP    | Templates                      | Reusable document templates.                                                           |
| POST-MVP    | Duplicate document             | Copy draft workflow.                                                                   |

## D. Recipients and fields

| Status      | Item                         | Notes                                                                          |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------ |
| DONE        | SIGNER/CC roles              | Role persistence, role-safe field ownership, role-aware send flow.             |
| DONE        | Recipient CRUD backend       | Create, update, delete with draft-only restrictions.                           |
| IN PROGRESS | Recipient owner UI           | Create/edit/delete components exist; shell/sidebar migration needs completion. |
| DONE        | Field CRUD backend           | Create, update, delete, coordinates, page/boundary validation.                 |
| DONE        | Bulk field assignment        | Backend, Zod schema, UI component, integration tests.                          |
| IN PROGRESS | Field owner UI               | Create/edit/delete and sidebar integration exist; final editor polish remains. |
| TODO        | Recipient resend/replacement | Revoke old request, issue replacement signer/token.                            |

## E. Send and email delivery

| Status | Item                         | Notes                                                       |
| ------ | ---------------------------- | ----------------------------------------------------------- |
| DONE   | Send validation              | Signers require fields; CC excluded from signing requests.  |
| DONE   | Signing request creation     | One request/token hash per eligible signer.                 |
| DONE   | Encrypted outbox email event | API transaction persists durable email intent.              |
| DONE   | Worker dispatch              | Generic handler registry, BullMQ job, retry/DLQ foundation. |
| DONE   | Mailpit local provider       | Local email verification.                                   |
| DONE   | Resend provider foundation   | Production provider adapter.                                |
| TODO   | Production email template    | Branding, sender identity, expiry language, support copy.   |
| TODO   | Delivery status owner UI     | Queued/sent/failed/retry status.                            |
| TODO   | Resend signing email action  | Fresh request/token after revocation.                       |

## F. Public signing

| Status      | Item                           | Notes                                                                     |
| ----------- | ------------------------------ | ------------------------------------------------------------------------- |
| DONE        | Public token lookup            | SHA-256 token lookup, expiry/revocation/completion checks.                |
| DONE        | Recipient field isolation      | Public request returns only recipient-owned fields.                       |
| DONE        | Public document URL            | Token-scoped signed original PDF URL.                                     |
| DONE        | Submission endpoint            | Required fields, ownership validation, submission/value persistence.      |
| DONE        | Typed-name signature MVP       | Strict `TYPED_NAME` value schema.                                         |
| DONE        | Public signing page foundation | Token query, PDF URL, local form store, submission state.                 |
| IN PROGRESS | Public signing PDF overlay     | Backend coordinates available; visual on-document signer overlay remains. |
| TODO        | Decline endpoint/UI            | Optional reason, status transition, audit event, owner update.            |
| TODO        | Completed signing link view    | Friendly completed/review content, no technical error.                    |
| POST-MVP    | Drawn SVG signatures           | Signature canvas/storage/sanitization design.                             |
| POST-MVP    | Sequential signing             | Enforce signing order.                                                    |

## G. Completion and PDF finalization

| Status      | Item                            | Notes                                                                             |
| ----------- | ------------------------------- | --------------------------------------------------------------------------------- |
| DONE        | Completion detection            | Final signing submission transitions document to COMPLETED.                       |
| DONE        | PDF finalization JobRecord      | Durable PDF_FINALIZATION job created in completion transaction.                   |
| DONE        | Finalization outbox event       | FINALIZE_COMPLETED_DOCUMENT encrypted event and PDF queue dispatch.               |
| DONE        | Worker PDF processor foundation | Storage download/upload, SHA-256, document update, audit, progress.               |
| DONE        | Field renderer foundation       | Typed signature, text, initials, date, checkbox drawing logic.                    |
| IN PROGRESS | Final PDF integration tests     | Renderer/persistence tests exist; full storage integration remains.               |
| TODO        | PDF rendering robustness        | Text wrapping, overflow handling, multi-page edge cases, visual regression tests. |
| TODO        | Finalization failure UX         | Owner-facing failed/retry state.                                                  |

## H. Audit, jobs, and live updates

| Status      | Item                      | Notes                                                                  |
| ----------- | ------------------------- | ---------------------------------------------------------------------- |
| DONE        | Audit events              | Upload, recipient, field, send, signing, completion, final PDF events. |
| DONE        | Audit list API            | Document-scoped audit endpoint.                                        |
| DONE        | Owner activity polling    | Active document audit polling in frontend.                             |
| DONE        | JobRecord progress fields | Percent, phase, message, status persisted.                             |
| DONE        | Worker progress publisher | PostgreSQL snapshot + Redis Pub/Sub.                                   |
| DONE        | Job API/SSE foundation    | Job snapshot endpoint and authenticated SSE endpoint.                  |
| IN PROGRESS | Owner job progress UI     | Completed document panel displays polling progress; SSE wiring exists. |
| TODO        | Document activity SSE     | Must use transaction-safe outbox publish, not direct audit write.      |
| TODO        | Job failure/retry UI      | Display actionable failure state and retry guidance.                   |

## I. Validation and testing

| Status      | Item                                           | Notes                                                                             |
| ----------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| DONE        | Runtime Zod package                            | Auth, recipient, signing field value, outbox payload schemas.                     |
| IN PROGRESS | Frontend Zod forms                             | Auth/recipient/field migration underway.                                          |
| TODO        | Complete Zod migration                         | Field update, bulk assignment UI, public signing form, job progress schema use.   |
| DONE        | Unit tests                                     | Crypto, auth policy, refresh lifecycle, recipient/field policies.                 |
| DONE        | Testcontainers harness                         | Isolated PostgreSQL/Redis with real migrations.                                   |
| DONE        | Outbox worker tests                            | Dispatch, malformed payload, retry, exhaustion, lease, concurrency, PDF dispatch. |
| IN PROGRESS | HTTP workflow tests                            | Auth and document workflow coverage underway.                                     |
| TODO        | Full public signing HTTP tests                 | Lookup, document URL, submit, failure states.                                     |
| TODO        | Full PDF finalization storage integration test | Real object storage-compatible integration.                                       |

## J. Security and operations

| Status | Item                                    | Notes                                                 |
| ------ | --------------------------------------- | ----------------------------------------------------- |
| DONE   | Private object storage                  | Signed URLs/API preview proxy.                        |
| DONE   | Hash-only signing/refresh token storage | Plain tokens not stored in normal persistence fields. |
| DONE   | Outbox encryption                       | AES-256-GCM + key version.                            |
| DONE   | API error envelope                      | Standardized codes/request IDs.                       |
| TODO   | Rate limiting                           | Auth, public signing, preview/download routes.        |
| TODO   | Request abuse protection                | Public token/brute force limits.                      |
| TODO   | Security headers/CSP review             | Production browser security configuration.            |
| TODO   | Error tracking                          | Sentry or equivalent.                                 |
| TODO   | Structured production logging           | Correlation, worker/job/outbox fields.                |
| TODO   | Alerts                                  | Failed outbox/jobs, 5xx rate, queue backlog.          |
| TODO   | Backup/restore verification             | Managed PostgreSQL backup and restore drill.          |
| TODO   | Production storage lifecycle            | Orphan cleanup, retention, object lifecycle rules.    |

## K. Deployment

| Status | Item                               | Notes                                                       |
| ------ | ---------------------------------- | ----------------------------------------------------------- |
| TODO   | Production Dockerfiles             | API/worker/web deployment images or platform configuration. |
| TODO   | CI pipeline                        | Format, check, test, build, deploy.                         |
| TODO   | Staging environment                | Separate DB/Redis/storage/email config.                     |
| TODO   | Migration release pipeline         | `db:deploy` before API/worker rollout.                      |
| TODO   | Production secret configuration    | JWT, outbox key, database, Redis, storage, Resend.          |
| TODO   | Production domains/CORS/cookies    | `app.` / `api.` domain configuration.                       |
| TODO   | Staging end-to-end acceptance test | Upload → send → sign → final PDF.                           |
| TODO   | Production launch runbook          | Rollback, worker failure, email failure, incident steps.    |

---

## MVP launch gate

Deployment is blocked until all `P0` items below are complete:

```txt
[ ] Owner can complete document workflow visually.
[ ] Public signer can complete required fields visually.
[ ] Decline/cancel/resend lifecycle exists.
[ ] Final PDF generation is tested against storage.
[ ] Rate limiting is enabled on auth/public routes.
[ ] Core integration tests are green.
[ ] Staging environment passes end-to-end smoke test.
[ ] Error tracking, logs, backups, and alerts are configured.
[ ] CI/CD and migration release pipeline are working.
```
