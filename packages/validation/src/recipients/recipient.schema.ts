import { z } from 'zod';

import { emailSchema } from '../auth/auth.schema';

export const recipientRoleSchema = z.enum(['SIGNER', 'CC']);

export const createRecipientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  role: recipientRoleSchema,
});
