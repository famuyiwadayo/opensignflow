import { z } from 'zod';

export const typedNameSignatureSchema = z.object({
  type: z.literal('TYPED_NAME'),
  name: z.string().trim().min(1).max(120),
});

export const signingFieldValueSchemas = {
  SIGNATURE: typedNameSignatureSchema,
  INITIALS: z.string().trim().min(1).max(12),
  TEXT: z.string().max(2000),
  DATE: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  CHECKBOX: z.boolean(),
} as const;

export function validateSigningFieldValue(type: string, value: unknown) {
  const schema = signingFieldValueSchemas[type as keyof typeof signingFieldValueSchemas];
  return schema ? schema.safeParse(value) : ({ success: false } as const);
}
