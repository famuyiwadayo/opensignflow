# Database Workflow

## Purpose

This document explains how to initialize and migrate the local PostgreSQL database.

If you see:

```txt
The table `public.users` does not exist in the current database.
```

then the API is connected to Postgres, but migrations have not been applied to that database.

## Important rule

Stop the API before running local migrations.

If `bun run dev` is running, press `Ctrl+C` first. Otherwise the API may keep logging missing-table errors while the database is being prepared.

## First-time local setup

From the repo root:

```bash
docker compose up -d postgres
bun install
bun run db:generate
bun run db:deploy
```

Why `db:deploy`?

The repository already includes an initial migration:

```txt
apps/api/prisma/migrations/20260724140000_init/migration.sql
```

`db:deploy` applies committed migrations without prompting.

Then start the app:

```bash
bun run dev
```

## Normal local schema changes

When we intentionally change `schema.prisma` during development:

```bash
bun run db:migrate
```

This runs:

```bash
prisma migrate dev --name dev
```

It creates/applies a dev migration when the schema changed.

For a named migration, run the API package command directly:

```bash
cd apps/api
bun run db:migrate:create add_documents
bun run db:migrate
```

## Check migration status

```bash
bun run db:status
```

## Reset local database

For a disposable local database only:

```bash
bun run db:reset
bun run db:deploy
```

Warning: `db:reset` deletes local data.

## Emergency local shortcut

If you are blocked and do not care about migration history locally, you can sync the schema directly:

```bash
bun run db:push
```

This creates tables from the Prisma schema without creating migration files. Use this only as a local unblocker, not as the main project workflow.

## Verify tables exist

```bash
docker exec -it opensignflow-postgres psql -U opensignflow -d opensignflow
```

Then inside psql:

```sql
\dt
```

You should see tables such as:

```txt
users
organizations
organization_members
user_sessions
documents
```

## If `prisma migrate dev` seems stuck

If output stops after:

```txt
Datasource "db": PostgreSQL database "opensignflow", schema "public" at "localhost:5432"
```

it may be waiting for an interactive prompt or database reset confirmation.

Use one of these instead:

```bash
bun run db:deploy
```

or for disposable local data:

```bash
bun run db:reset
bun run db:deploy
```
