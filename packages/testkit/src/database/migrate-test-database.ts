import { execFileSync } from 'node:child_process';
import { findWorkspaceRoot } from '@opensignflow/config';

/** Applies the database package migrations to an isolated Testcontainers database. */
export function migrateTestDatabase(databaseUrl: string) {
  execFileSync('bun', ['run', '--filter=@opensignflow/database', 'db:deploy'], {
    cwd: findWorkspaceRoot(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
    },
    stdio: 'inherit',
  });
}
