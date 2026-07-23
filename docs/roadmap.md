# Roadmap

## Strategy

Build the smallest complete version that demonstrates real value and engineering depth:

1. upload a PDF;
2. prepare it with signing fields;
3. send it to a recipient;
4. capture a signature;
5. generate a completed PDF;
6. produce an audit trail;
7. add AI assistance.

Avoid building a full DocuSign clone in the first release.

## Milestone 0: Documentation and contracts

Deliverables:

- product brief;
- architecture document;
- REST API contract standard;
- frontend standards;
- Turborepo stack ADR;
- REST contract ADR;
- MVP roadmap.

Success criteria:

- project direction is clear;
- API style is standardized before implementation;
- frontend/backend boundaries are agreed.

## Milestone 1: Turborepo foundation

Deliverables:

- Turborepo + pnpm workspace;
- `apps/web` Next.js app;
- `apps/api` NestJS app;
- `packages/shared` package;
- root TypeScript config;
- root lint/format scripts;
- `docker-compose.yml` with Postgres, Redis, MinIO, Mailpit;
- `.env.example` files;
- first CI workflow later.

Success criteria:

```bash
pnpm install
pnpm dev
```

starts the app stack locally.

## Milestone 2: Backend core

Deliverables:

- Prisma setup;
- users table;
- auth module;
- JWT access token;
- refresh token/session strategy;
- global validation;
- global exception filter with standard API error envelope;
- request ID middleware;
- Swagger docs;
- health endpoint.

Success criteria:

- register/login/me flow works;
- Swagger documents auth endpoints;
- errors follow the standard contract.

## Milestone 3: Documents and storage

Deliverables:

- document model;
- PDF upload endpoint;
- MIME/size validation;
- private object storage integration;
- signed download/preview URL endpoint;
- document dashboard API;
- audit event creation for upload/create.

Success criteria:

- authenticated user can upload and list PDFs;
- files are private;
- temporary URLs are generated through the API.

## Milestone 4: Frontend dashboard

Deliverables:

- landing page;
- register/login pages;
- authenticated dashboard shell;
- document list using TanStack Query and TanStack Table;
- upload form using TanStack Form;
- document detail page.

Success criteria:

- user can register, login, upload, and view document metadata from the UI.

## Milestone 5: PDF editor

Deliverables:

- PDF preview;
- page navigation;
- zoom controls;
- field placement;
- signature/text/date/checkbox fields;
- normalized coordinate storage;
- field create/update/delete endpoints;
- recipient assignment.

Success criteria:

- user can visually prepare a PDF for signing;
- backend stores field coordinates consistently.

## Milestone 6: Signing workflow

Deliverables:

- recipient model;
- secure signing token;
- send document command;
- email sending through local Mailpit/production provider;
- public signing page;
- signer field completion;
- signature capture;
- signing submission endpoint;
- audit events for open/view/sign.

Success criteria:

- recipient can open a link and submit required fields without logging in.

## Milestone 7: Final PDF generation

Deliverables:

- PDF finalization service;
- field flattening;
- signature embedding;
- completed PDF storage;
- final PDF hash;
- completed document status;
- audit trail page.

Success criteria:

- completed PDF can be downloaded;
- audit events prove what happened.

## Milestone 8: AI assistance

Deliverables:

- PDF text extraction;
- AI provider abstraction;
- AI document summary;
- AI field suggestions;
- AI signer email draft;
- AI usage tracking;
- AI disclaimer in UI.

Success criteria:

- user can upload a document and receive useful AI assistance without exposing AI keys to the frontend.

## Milestone 9: SaaS monetization

Deliverables:

- plan table;
- free usage limits;
- usage records;
- pricing page;
- checkout session;
- billing webhook;
- subscription status enforcement.

Success criteria:

- free users are limited;
- paid subscriptions unlock higher usage.

## Later milestones

- team/organization accounts;
- reusable templates;
- webhook/API access;
- custom branding;
- document reminders;
- signer decline flow;
- sequential signing;
- file virus scanning;
- organization audit logs;
- worker app split;
- generated API client from OpenAPI;
- Dockerized self-hosting guide.
