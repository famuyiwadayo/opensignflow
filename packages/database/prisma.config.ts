import { loadRepositoryEnvironment } from '@opensignflow/config';
import { defineConfig, env } from 'prisma/config';

loadRepositoryEnvironment();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
