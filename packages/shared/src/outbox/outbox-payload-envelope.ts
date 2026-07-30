/** Versioned encrypted plaintext persisted in an outbox event. */
export type OutboxPayloadEnvelope<TType extends string, TPayload> = {
  version: 1;
  type: TType;
  payload: TPayload;
};
