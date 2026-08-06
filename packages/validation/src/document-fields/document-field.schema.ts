import { z } from 'zod';

export const documentFieldTypeSchema = z.enum([
  'SIGNATURE',
  'INITIALS',
  'TEXT',
  'DATE',
  'CHECKBOX',
]);

const normalized = z.number().min(0).max(1);

export const createDocumentFieldSchema = z
  .object({
    recipientId: z.string().min(1),
    type: documentFieldTypeSchema,
    pageNumber: z.number().int().min(1),
    x: normalized,
    y: normalized,
    width: z.number().gt(0).max(1),
    height: z.number().gt(0).max(1),
    required: z.boolean().default(true),
    label: z.string().trim().max(120).optional(),
    placeholder: z.string().trim().max(120).optional(),
    defaultValue: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.x + value.width > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['width'],
        message: 'Field width exceeds page bounds.',
      });
    }
    if (value.y + value.height > 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['height'],
        message: 'Field height exceeds page bounds.',
      });
    }
  });

export const bulkFieldAssignmentSchema = z.object({
  fieldIds: z
    .array(z.string().min(1))
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, 'Field IDs must be unique.'),
  recipientId: z.string().min(1),
});
