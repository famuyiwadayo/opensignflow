# Local Development

## Prerequisites

- Node.js 20+
- Corepack enabled
- Docker Desktop or Docker Engine

Enable pnpm through Corepack:

```bash
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

## Install dependencies

```bash
pnpm install
```

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
pnpm db:generate
pnpm db:migrate
```

## Run apps

Run everything through Turborepo:

```bash
pnpm dev
```

Or run one app:

```bash
pnpm --filter @opensignflow/api dev
pnpm --filter @opensignflow/web dev
```

## Useful scripts

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```
