# Backend Standards

## Purpose

This document defines how we structure the NestJS backend and how we avoid type duplication across Prisma, NestJS, the frontend, and shared packages.

The goal is to keep the codebase professional, understandable to recruiters, and safe for a real SaaS product.

## Core principle

Use one source of truth per boundary.

Do not try to make one type serve every layer. Database models, request DTOs, API response entities, and frontend form values often look similar, but they serve different purposes.

What we want to avoid is accidental manual duplication that drifts over time.

## Source-of-truth map

| Concern | Source of truth | Consumed by |
|---|---|---|
| Database schema | `apps/api/prisma/schema.prisma` | Prisma Client/backend only |
| Backend request validation | NestJS DTO classes | Controllers, Swagger/OpenAPI |
| API response contract | NestJS API entity classes | Controllers, Swagger/OpenAPI |
| Frontend API types | Generated from OpenAPI | Next.js frontend |
| Frontend server state | TanStack Query hooks | UI components |
| Frontend form UX validation | Local form schemas, typed from generated request types where possible | TanStack Form |
| Business limits/pricing | Backend config exposed through API | Frontend fetches through API |
| Generic envelopes/errors | Small shared package or generated API client | Backend/frontend |

## NestJS module structure

Each major domain module should follow a predictable structure.

Example:

```txt
apps/api/src/documents/
  documents.module.ts
  documents.controller.ts
  documents.service.ts
  documents.repository.ts
  dto/
    create-document.dto.ts
    update-document.dto.ts
    list-documents-query.dto.ts
  entities/
    document.entity.ts
    document-download-url.entity.ts
```

Recommended modules:

```txt
auth/
users/
organizations/
documents/
document-fields/
recipients/
signing/
pdf/
storage/
email/
audit/
ai/
billing/
usage/
jobs/
common/
config/
```

## Controllers

Controllers handle HTTP concerns only.

Responsibilities:

- route decorators;
- guards;
- request parsing;
- DTO validation;
- OpenAPI documentation decorators;
- calling services;
- returning standard API envelopes.

Controllers should not contain business workflows or raw Prisma queries.

Good:

```ts
@Post()
async create(@Body() dto: CreateRecipientDto) {
  const recipient = await this.recipientsService.create(dto);

  return {
    data: RecipientEntity.fromPrisma(recipient),
  };
}
```

Avoid:

```ts
@Post()
async create(@Body() body: any) {
  return this.prisma.recipient.create({ data: body });
}
```

## Services

Services own business logic and workflows.

Responsibilities:

- state transitions;
- authorization decisions beyond simple guards;
- orchestration across repositories/providers;
- transactions;
- audit event creation;
- calling storage, email, PDF, AI, and billing services.

Examples:

```txt
AuthService.register()
DocumentsService.sendDocument()
SigningService.submitSigningRequest()
PdfService.finalizeDocument()
AiService.generateDocumentSummary()
```

## Repositories

Repositories own Prisma data access.

NestJS does not require repositories, but we use them in this project to make backend architecture explicit and testable.

Responsibilities:

- Prisma queries;
- persistence details;
- selects/includes;
- query-specific types;
- no HTTP knowledge;
- no controller response envelopes.

Example:

```ts
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPublicById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  }
}
```

## Prisma models

Prisma models live in:

```txt
apps/api/prisma/schema.prisma
```

They represent database tables and persistence concerns.

Rules:

- Prisma models are backend-only.
- Do not expose raw Prisma records from controllers.
- Do not import Prisma types into the frontend.
- Do not place Prisma types in `packages/shared`.
- Use Prisma `select` objects to avoid retrieving sensitive fields accidentally.

Sensitive/internal fields that must never leak by default include:

```txt
passwordHash
refreshTokenHash
tokenHash
originalStorageKey
completedStorageKey
providerCustomerId
providerSubscriptionId
```

## Prisma selectors

Use explicit selectors for API-safe projections.

Example:

```ts
export const userPublicSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
});

export type UserPublicRecord = Prisma.UserGetPayload<{
  select: typeof userPublicSelect;
}>;
```

Benefits:

- avoids selecting sensitive fields;
- gives precise mapper input types;
- makes API-safe projections obvious;
- helps reviewers understand what crosses boundaries.

Recommended location:

```txt
apps/api/src/users/users.select.ts
apps/api/src/documents/documents.select.ts
```

or inside the relevant repository if the selector is private to that repository.

## DTOs

DTO means Data Transfer Object.

In this project, NestJS DTOs define request bodies and query parameters.

They live in backend feature modules:

```txt
apps/api/src/auth/dto/register.dto.ts
apps/api/src/documents/dto/create-document.dto.ts
apps/api/src/documents/dto/list-documents-query.dto.ts
```

DTOs use:

```txt
class-validator
class-transformer
@nestjs/swagger
```

Example:

```ts
export class RegisterDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
```

Rules:

- DTOs belong in `apps/api`, not `packages/shared`.
- Backend validation is authoritative.
- DTOs should be documented with Swagger decorators.
- Use mapped types to avoid repetition.

Useful NestJS mapped type helpers:

```ts
PartialType()
PickType()
OmitType()
IntersectionType()
```

Example:

```ts
export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
```

## Entities

In this project, a NestJS entity means an API-safe response resource, not a database table.

Entities live in:

```txt
apps/api/src/**/entities/*.entity.ts
```

Example:

```ts
export class UserEntity {
  @ApiProperty({ example: 'usr_123' })
  id!: string;

  @ApiProperty({ example: 'ada@example.com' })
  email!: string;

  @ApiProperty({ example: 'Ada Lovelace', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  createdAt!: string;

  static fromPrisma(user: UserPublicRecord): UserEntity {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
```

Rules:

- Entities are sanitized API response shapes.
- Entities should use Swagger decorators.
- Entities should map dates to ISO 8601 strings.
- Entities should not expose storage keys, token hashes, password hashes, or provider internals.
- Entity mapper methods should accept selected Prisma payload types, not unrestricted Prisma records, where practical.

## Response DTOs

Use response DTOs for wrapped or composite responses.

Example:

```ts
export class AuthResponseDto {
  @ApiProperty({ type: UserEntity })
  user!: UserEntity;

  @ApiProperty()
  accessToken!: string;
}
```

The controller still returns the REST envelope:

```json
{
  "data": {
    "user": {
      "id": "usr_123",
      "email": "ada@example.com"
    },
    "accessToken": "..."
  }
}
```

## API response envelopes

For now, controllers should return envelopes manually.

Single resource:

```ts
return {
  data: UserEntity.fromPrisma(user),
};
```

List resource:

```ts
return {
  data: documents.map(DocumentEntity.fromPrisma),
  pagination,
};
```

Why manual envelopes for now:

- explicit;
- easy to understand;
- no hidden response magic;
- easier to align Swagger docs while the API is evolving.

Later, we may add helper functions:

```ts
ok(data)
paginated(data, pagination)
accepted(job, meta)
```

We should not add a global response-wrapping interceptor until the response patterns are stable.

## Guards

Guards handle authentication and authorization checks at route level.

Expected guards:

```txt
JwtAuthGuard
OrganizationMemberGuard
RoleGuard
PublicSigningTokenGuard
```

Guards should not contain business workflows. They should attach validated request context, then services perform workflow-specific decisions.

## Decorators

Use decorators for extracting validated request context.

Expected decorators:

```txt
@CurrentUser()
@CurrentOrganization()
@RequestId()
@IdempotencyKey()
```

This keeps controller signatures clean.

## Filters

Filters normalize exceptions and errors.

Current filter:

```txt
apps/api/src/common/filters/api-exception.filter.ts
```

It enforces the standard REST error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "status": 422,
    "requestId": "req_123",
    "timestamp": "2026-07-23T12:00:00.000Z",
    "details": []
  }
}
```

## Shared package boundary

`packages/shared` must stay small and framework-agnostic.

Allowed:

```txt
generic API envelope types
cursor pagination types
generic API error types
stable public ID prefixes
small framework-agnostic constants
```

Not allowed:

```txt
NestJS DTO classes
NestJS entities
Prisma types
Prisma selectors
backend services
backend repositories
storage provider logic
AI provider logic
billing provider secrets
manually duplicated API resource types
manually duplicated domain enums
```

Why:

- frontend should not import backend-only dependencies;
- Prisma models may include sensitive fields;
- duplicated API resource types drift;
- generated API types should come from OpenAPI.

## Domain enums

Avoid manually maintaining domain enums in `packages/shared` if those enums already exist in Prisma or the API contract.

Preferred flow:

```txt
Prisma enum
  -> used by backend DTOs/entities
  -> documented in OpenAPI
  -> generated into frontend API client
```

Backend example:

```ts
import { DocumentStatus } from '@prisma/client';

export class DocumentEntity {
  @ApiProperty({ enum: DocumentStatus })
  status!: DocumentStatus;
}
```

Frontend later imports generated types from `packages/api-client`, not from Prisma or shared manual enums.

## Business configuration

Business plan limits should be backend-owned.

For example, plan limits should live under billing/usage code:

```txt
apps/api/src/billing/billing-plans.ts
```

The frontend should fetch public plan information through:

```txt
GET /v1/billing/plans
```

Do not import billing limits directly from a shared package into the frontend for product behavior. The backend must remain authoritative for billing and usage enforcement.

## Frontend API types

The frontend should not hand-write backend API response types once code generation is available.

Preferred flow:

```txt
NestJS DTOs/entities
  -> Swagger/OpenAPI JSON
  -> generated TypeScript client
  -> packages/api-client
  -> apps/web imports generated client/types
```

Potential generators:

```txt
openapi-typescript
orval
hey-api/openapi-ts
```

The generated client package should eventually live at:

```txt
packages/api-client
```

## Frontend forms

Frontend forms use TanStack Form.

For MVP:

- frontend validation is for UX;
- backend DTO validation is authoritative;
- use generated request types once available;
- do not manually duplicate every backend validation rule unless it improves UX.

Later, if needed, we can generate Zod schemas from OpenAPI to reduce frontend validation duplication.

## Avoiding duplication checklist

Before adding a new type, ask:

- [ ] Is this a database persistence shape? Put it in Prisma/schema or Prisma selectors.
- [ ] Is this a request body/query contract? Put it in a NestJS DTO.
- [ ] Is this an API response resource? Put it in a NestJS entity.
- [ ] Is this needed by the frontend as an API type? Generate it from OpenAPI.
- [ ] Is this a frontend-only form/UI type? Keep it local to the frontend feature.
- [ ] Is this a generic envelope/error/pagination type? It may belong in `packages/shared`.
- [ ] Does this duplicate a Prisma enum or API resource? Do not put it in shared manually.

## Final rule

Prisma owns persistence.

NestJS DTOs and entities own the API contract.

OpenAPI generates frontend API types.

The shared package only contains small framework-agnostic helpers and generic contract primitives.
