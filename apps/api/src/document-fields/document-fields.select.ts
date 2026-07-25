import { Prisma } from '~/prisma/generated/client';

export const documentFieldApiSelect = {
  id: true,
  documentId: true,
  recipientId: true,
  type: true,
  pageNumber: true,
  x: true,
  y: true,
  width: true,
  height: true,
  required: true,
  label: true,
  placeholder: true,
  defaultValue: true,
  validation: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentFieldSelect;

export type DocumentFieldApiRecord = Prisma.DocumentFieldGetPayload<{
  select: typeof documentFieldApiSelect;
}>;
