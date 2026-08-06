import { z } from 'zod';

export function outboxEnvelopeSchema<T extends z.ZodTypeAny>(type: string, payload: T) {
  return z.object({ version: z.literal(1), type: z.literal(type), payload });
}
