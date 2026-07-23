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
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

## Database

After installing dependencies and starting Postgres:

```bash
bun run db:generate
bun run db:migrate
```

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
