import { config as loadDotenv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type LoadRepositoryEnvironmentInput = { workingDirectory?: string; nodeEnv?: string };

/**
 * Finds the workspace root by locating package.json with a workspaces field.
 * Development loads exactly one root .env file so API, worker, scripts, and
 * web tooling cannot silently drift onto different local infrastructure URLs.
 */
export function findWorkspaceRoot(workingDirectory = process.cwd()): string {
  let directory = resolve(workingDirectory);

  while (true) {
    const packagePath = join(directory, 'package.json');
    if (existsSync(packagePath)) {
      const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { workspaces?: unknown };
      if (Array.isArray(packageJson.workspaces)) {return directory;}
    }

    const parent = resolve(directory, '..');
    if (parent === directory) {
      throw new Error('Could not locate the OpenSignFlow workspace root.');
    }
    directory = parent;
  }
}

/**
 * In local development, root .env is authoritative and overrides inherited
 * shell values. Test/production use their explicitly supplied environment.
 */
export function loadRepositoryEnvironment(input: LoadRepositoryEnvironmentInput = {}) {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const workspaceRoot = findWorkspaceRoot(input.workingDirectory);
  const envFilePath = join(workspaceRoot, '.env');

  if (nodeEnv === 'development') {
    const result = loadDotenv({ path: envFilePath, override: true });
    if (result.error && (result.error as NodeJS.ErrnoException).code !== 'ENOENT')
      {throw result.error;}
  }

  return { workspaceRoot, envFilePath };
}
