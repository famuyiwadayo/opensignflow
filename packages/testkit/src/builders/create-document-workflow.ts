import { DocumentFieldType, OrganizationRole, RecipientRole } from '@opensignflow/database';

import type { createTestDatabase } from '../database/test-database';
import {
  documentFactory,
  documentFieldFactory,
  recipientFactory,
} from '../factories/document-workflow.factory';
import { organizationFactory, userFactory } from '../factories/core.factory';

export async function createDocumentWorkflow(input: {
  database: ReturnType<typeof createTestDatabase>;
  signerCount?: number;
  ccCount?: number;
  fieldsPerSigner?: number;
}) {
  const signerCount = input.signerCount ?? 1;
  const ccCount = input.ccCount ?? 0;
  const fieldsPerSigner = input.fieldsPerSigner ?? 1;
  const user = userFactory();
  const organization = organizationFactory();
  const document = documentFactory({ organizationId: organization.id, createdById: user.id });

  await input.database.user.create({ data: user });
  await input.database.organization.create({ data: organization });
  await input.database.organizationMember.create({
    data: {
      id: 'mem_test_owner',
      organizationId: organization.id,
      userId: user.id,
      role: OrganizationRole.OWNER,
    },
  });
  await input.database.document.create({ data: document });

  const signers = Array.from({ length: signerCount }, (_, index) =>
    recipientFactory({
      documentId: document.id,
      email: `signer-${index}@example.test`,
      role: RecipientRole.SIGNER,
      signingOrder: index + 1,
    }),
  );
  const ccRecipients = Array.from({ length: ccCount }, (_, index) =>
    recipientFactory({
      documentId: document.id,
      email: `cc-${index}@example.test`,
      role: RecipientRole.CC,
    }),
  );
  await input.database.recipient.createMany({ data: [...signers, ...ccRecipients] });

  const fields = signers.flatMap((signer, signerIndex) =>
    Array.from({ length: fieldsPerSigner }, (_, fieldIndex) =>
      documentFieldFactory({
        documentId: document.id,
        recipientId: signer.id,
        type: DocumentFieldType.SIGNATURE,
        x: 0.1 + fieldIndex * 0.25,
        y: 0.1 + signerIndex * 0.15,
      }),
    ),
  );
  if (fields.length) {
    await input.database.documentField.createMany({ data: fields });
  }

  return { user, organization, document, signers, ccRecipients, fields };
}
