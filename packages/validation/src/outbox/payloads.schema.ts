import { z } from 'zod';
import { outboxEnvelopeSchema } from './envelope.schema';

export const signingEmailPayloadSchema = z.object({
  signingRequestId: z.string().min(1),
  documentId: z.string().min(1),
  recipientId: z.string().min(1),
  recipientEmail: z.email(),
  recipientName: z.string().min(1).max(120),
  documentTitle: z.string().min(1).max(200),
  signingToken: z.string().min(1),
});

export const signingEmailOutboxEnvelopeSchema = outboxEnvelopeSchema(
  'SEND_SIGNING_EMAIL',
  signingEmailPayloadSchema,
);

export const pdfFinalizationPayloadSchema = z.object({
  jobId: z.string().min(1),
  documentId: z.string().min(1),
  organizationId: z.string().min(1),
});

export const pdfFinalizationOutboxEnvelopeSchema = outboxEnvelopeSchema(
  'FINALIZE_COMPLETED_DOCUMENT',
  pdfFinalizationPayloadSchema,
);
