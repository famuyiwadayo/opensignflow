# ADR 0004: Use Bun workspaces as the package manager

## Status

Accepted.

## Context

The project initially used pnpm workspaces with Turborepo. We decided to switch to Bun as the workspace package manager while keeping Turborepo as the monorepo task runner.

Bun gives us a fast install/runtime/tooling story and keeps the contributor workflow simple:

```bash
bun install
bun run dev
```

The project still uses Node-compatible frameworks and libraries: Next.js, NestJS, Prisma, Turborepo, and TypeScript.

## Decision

Use Bun workspaces through the root `package.json`:

```json
{
  "packageManager": "bun@1.2.0",
  "workspaces": ["apps/*", "packages/*"]
}
```

Remove pnpm-specific workspace files:

```txt
pnpm-workspace.yaml
pnpm-lock.yaml
```

Use Bun commands in documentation:

```bash
bun install
bun run dev
bun run build
bun run lint
bun run typecheck
bun run test
```

Run individual workspace scripts with Bun filters:

```bash
bun --filter @opensignflow/api run dev
bun --filter @opensignflow/web run dev
```

## Consequences

Positive:

- Faster dependency installs for many contributors.
- One modern package manager story across the repo.
- No separate workspace config file is needed; root `package.json` owns workspaces.
- Turborepo can still orchestrate builds, linting, testing, and dev tasks.

Tradeoffs:

- Some contributors may need to install Bun first.
- Some ecosystem tools are still most commonly documented with npm/pnpm/yarn examples.
- CI and deployment environments must explicitly install/use Bun.
- If a package has Bun-specific install issues, we may need to pin versions or document a workaround.
