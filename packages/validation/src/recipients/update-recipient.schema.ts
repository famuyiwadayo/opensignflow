import { z } from 'zod';
import { emailSchema } from '../auth/auth.schema';
import { recipientRoleSchema } from './recipient.schema';
export const updateRecipientSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: emailSchema.optional(),
    role: recipientRoleSchema.optional(),
    signingOrder: z.number().int().min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one recipient property is required.');
