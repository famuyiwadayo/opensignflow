import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_APP_URL: z.url().default('http://localhost:3000'),

  DATABASE_URL: z.url('DATABASE_URL is required.'),
  REDIS_URL: z.url('REDIS_URL must be a valid URL.'),

  OUTBOX_ENCRYPTION_KEY: z
    .string()
    .min(1, 'OUTBOX_ENCRYPTION_KEY is required.'),
  OUTBOX_ENCRYPTION_KEY_VERSION: z.string().min(1).default('1'),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default('dev-only-access-secret-change-me-before-production-32-chars'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1).default('opensignflow-documents'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('opensignflow'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('opensignflow-secret'),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('true'),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
