/**
 * Ephemeral BullMQ payload. The token is deliberately never persisted in PostgreSQL.
 * It must not be copied into logs, job records, or dead-letter queue payloads.
 */
export type SendSigningEmailJob = {
  signingRequestId: string;
  documentId: string;
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  signingToken: string;
};

/** Safe payload retained when signing-email retries have been exhausted. */
export type SigningEmailDeadLetterJob = {
  originalJobId: string;
  signingRequestId: string;
  documentId: string;
  recipientId: string;
  failureReason: string;
  failedAt: string;
};
