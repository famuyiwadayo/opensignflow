import type { Prisma } from '@opensignflow/database';

export const recipientApiSelect = {
  id: true,
  documentId: true,
  name: true,
  email: true,
  status: true,
  role: true,
  signingOrder: true,
  viewedAt: true,
  signedAt: true,
  declinedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RecipientSelect;

export type RecipientApiRecord = Prisma.RecipientGetPayload<{
  select: typeof recipientApiSelect;
}>;
