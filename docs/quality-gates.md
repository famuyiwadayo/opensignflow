# Quality Gates

## Canonical command

OpenSignFlow has one deterministic local and CI quality command:

```bash
bun run check
```

It executes in this order:

```txt
1. bun run generate
2. bun run lint
3. bun run typecheck
```

`generate` runs Prisma client generation before static analysis so packages consuming generated Prisma 7 enums/types do not lint or typecheck against stale declarations.

## Pre-push hook

Husky installs `.husky/pre-push` during `bun install` through the root `prepare` script.

```txt
git push
  ↓
bun run check
  ↓
push succeeds or is blocked
```

The hook intentionally runs the full monorepo while architecture and shared packages are stabilizing. It is more valuable to catch cross-package breakage than to optimize for changed-package speed at this stage.

## Package lint contract

Every workspace has `lint` and `typecheck` scripts. Turbo runs them across applications and packages.

Backend/package lint commands lint handwritten TypeScript and tests while ignoring generated/build output:

```txt
dist
coverage
src/generated
```

Prisma generated code under `packages/database/src/generated` is generated input to typechecking but is not governed by OpenSignFlow handwritten-code lint rules.

## Required contributor workflow

```bash
bun install
bun run check
bun run test
bun run build
```

Do not rely on globally installed ESLint, TypeScript, Prisma, Turbo, or Husky binaries. The repository's Bun lockfile and workspace dependencies are authoritative.

## Hook bypasses

`git push --no-verify` bypasses the quality gate and should be reserved for diagnosing tooling failures. It is not a normal development workflow and does not replace CI verification.

## ESLint configuration

OpenSignFlow uses ESLint 9 flat configuration at repository root:

```txt
eslint.config.mjs
```

Legacy `.eslintrc.*` files are intentionally not used. Running ESLint from any workspace resolves the one root flat configuration, so applications and packages apply the same TypeScript parser, baseline rules, and generated-output exclusions.
