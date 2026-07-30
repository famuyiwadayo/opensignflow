import type { OutboxEventType } from '@opensignflow/database';

export interface OutboxEventHandler<TPayload> {
  readonly type: OutboxEventType;
  parse(serializedPayload: string): TPayload;
  dispatch(input: { eventId: string; payload: TPayload }): Promise<void>;
}
