import type { SendSigningEmailJob } from '../jobs';

/** The signing-email outbox payload currently becomes the same BullMQ job payload. */
export type SendSigningEmailOutboxPayload = SendSigningEmailJob;
