import {
  DocumentFieldType,
  DocumentStatus,
  RecipientRole,
  RecipientStatus,
  SigningRequestStatus,
} from '@opensignflow/database';
import { ID_PREFIXES } from '@opensignflow/shared';

let sequence = 0;
function nextId(name: keyof typeof ID_PREFIXES) {
  sequence += 1;
  return `${ID_PREFIXES[name]}_test_${sequence}`;
}

export function documentFactory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: nextId('document'),
    organizationId: 'org_test',
    createdById: 'usr_test',
    title: 'Test Service Agreement',
    status: DocumentStatus.DRAFT,
    originalFileName: 'test-agreement.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    originalStorageKey: 'test/documents/original.pdf',
    pageCount: 2,
    ...overrides,
  };
}

export function recipientFactory(overrides: Partial<Record<string, unknown>> = {}) {
  const number = sequence + 1;
  return {
    id: nextId('recipient'),
    documentId: 'doc_test',
    name: `Signer ${number}`,
    email: `signer-${number}@example.test`,
    role: RecipientRole.SIGNER,
    status: RecipientStatus.PENDING,
    signingOrder: 1,
    ...overrides,
  };
}

export function documentFieldFactory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: nextId('documentField'),
    documentId: 'doc_test',
    recipientId: 'rcp_test',
    type: DocumentFieldType.SIGNATURE,
    pageNumber: 1,
    x: 0.1,
    y: 0.1,
    width: 0.2,
    height: 0.08,
    required: true,
    ...overrides,
  };
}

export function signingRequestFactory(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: nextId('signingRequest'),
    documentId: 'doc_test',
    recipientId: 'rcp_test',
    tokenHash: 'a'.repeat(64),
    status: SigningRequestStatus.PENDING,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}
