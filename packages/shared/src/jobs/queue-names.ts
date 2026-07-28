/** Stable BullMQ queue names shared by API producers and worker consumers. */
export const QueueName = {
  SIGNING_EMAIL: 'opensignflow-signing-email',
  SIGNING_EMAIL_DLQ: 'opensignflow-signing-email-dlq',
  PDF_FINALIZATION: 'opensignflow-pdf-finalization',
  AI_ANALYSIS: 'opensignflow-ai-analysis',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

/** Stable job names within queues. */
export const QueueJobName = {
  SEND_SIGNING_EMAIL: 'send-signing-request',
  SIGNING_EMAIL_DELIVERY_FAILED: 'signing-email-delivery-failed',
} as const;

export type QueueJobName = (typeof QueueJobName)[keyof typeof QueueJobName];
