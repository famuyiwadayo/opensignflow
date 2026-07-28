# Local Development

## Prerequisites

- Node.js 20+
- Bun 1.2+
- Docker Desktop or Docker Engine

Install Bun:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then confirm:

```bash
bun --version
```

## Install dependencies

```bash
bun install
```

This project uses Bun workspaces plus Turborepo. The first install will generate `bun.lock`.

## Start local infrastructure

```bash
docker compose up -d
```

Local services:

| Service | URL |
|---|---|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/docs |
| API health | http://localhost:4000/v1/health |
| Mailpit | http://localhost:8025 |
| MinIO Console | http://localhost:9001 |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

MinIO credentials:

```txt
username: opensignflow
password: opensignflow-secret
```

## Environment files

Copy examples:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
```

## Database

See also: [Database Workflow](./database-workflow.md).


After installing dependencies and starting Postgres, generate Prisma Client and apply committed migrations:

```bash
bun run db:generate
bun run db:deploy
```

The repository includes an initial migration at:

```txt
apps/api/prisma/migrations/20260724140000_init/migration.sql
```

If the API logs an error like:

```txt
The table `public.users` does not exist in the current database.
```

it means the API connected to Postgres, but migrations have not been applied to that database yet. Stop the API, run:

```bash
bun run db:deploy
```

then restart:

```bash
bun run dev
```

For a disposable local database, you can reset everything and reapply migrations:

```bash
bun run db:reset
```

Be careful: `db:reset` deletes local database data.



## Bun workspace binary note

Workspace scripts use normal readable commands such as:

```json
"lint": "eslint "src/**/*.ts""
```

CLI tools such as ESLint, TypeScript, Prisma, Jest, Turbo, Next, and Nest CLI are centralized in the root `package.json` devDependencies.

If you see errors like:

```txt
/bin/bash: eslint: command not found
```

it usually means Bun has not linked/install the root workspace dependencies yet. From the repository root, run:

```bash
bun install
```

If the issue persists after switching package-manager setup, clear old install artifacts and reinstall:

```bash
rm -rf node_modules bun.lock .turbo
bun install
bun run lint
```

Commit the regenerated `bun.lock` afterward.

## Prisma driver adapter note

The API uses Prisma with the PostgreSQL driver adapter:

```txt
@prisma/adapter-pg
pg
```

This is why `DATABASE_URL` is required before the NestJS app starts. If you see an error saying Prisma needs a driver adapter, reinstall dependencies and regenerate the Prisma client:

```bash
bun install
bun run db:generate
```

Then restart the API.

## Run apps

Run everything through Turborepo:

```bash
bun run dev
```

Or run one app:

```bash
bun --filter @opensignflow/api run dev
bun --filter @opensignflow/web run dev
```

## Useful scripts

```bash
bun run build
bun run lint
bun run typecheck
bun run test
bun run format
```

## Notes

- `package.json` is the workspace source of truth via the `workspaces` field.
- We intentionally do not keep `pnpm-workspace.yaml` or `pnpm-lock.yaml`.
- Commit `bun.lock` after running `bun install` locally.

## Background worker

Configure root `.env` from `.env.example`, then run the worker alongside the API:

```bash
bun run dev:worker
```

With Docker Mailpit running, signing-request email messages appear at `http://localhost:8025`.
