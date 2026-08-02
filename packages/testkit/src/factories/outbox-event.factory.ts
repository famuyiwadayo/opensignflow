import { OutboxEventStatus, OutboxEventType } from '@opensignflow/database';
import { ID_PREFIXES } from '@opensignflow/shared';

let sequence = 0;

export function outboxEventFactory(overrides: Partial<Record<string, unknown>> = {}) {
  sequence += 1;
  return {
    id: `${ID_PREFIXES.outboxEvent}_test_${sequence}`,
    organizationId: 'org_test',
    type: OutboxEventType.SEND_SIGNING_EMAIL,
    status: OutboxEventStatus.PENDING,
    resourceType: 'SIGNING_REQUEST',
    resourceId: 'sreq_test',
    encryptedPayload: JSON.stringify({
      keyVersion: 'test-v1',
      initializationVector: 'test',
      authenticationTag: 'test',
      ciphertext: 'test',
    }),
    encryptionKeyVersion: 'test-v1',
    attemptCount: 0,
    availableAt: new Date(),
    ...overrides,
  };
}
