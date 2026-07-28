/**
 * Stable BullMQ queue names shared by job producers and workers.
 *  Queue name cannot contain :
 * */
export const QueueName = {
  SIGNING_EMAIL: 'opensignflow-signing-email',
  PDF_FINALIZATION: 'opensignflow-pdf-finalization',
  AI_ANALYSIS: 'opensignflow-ai-analysis',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];
