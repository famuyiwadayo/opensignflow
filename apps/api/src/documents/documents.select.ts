import type { Prisma } from '@opensignflow/database';

export const documentApiSelect = {
  id: true,
  organizationId: true,
  createdById: true,
  title: true,
  status: true,
  originalFileName: true,
  mimeType: true,
  fileSizeBytes: true,
  pageCount: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DocumentSelect;

export const documentStorageSelect = {
  id: true,
  organizationId: true,
  title: true,
  status: true,
  originalFileName: true,
  mimeType: true,
  originalStorageKey: true,
  completedStorageKey: true,
} satisfies Prisma.DocumentSelect;

export type DocumentApiRecord = Prisma.DocumentGetPayload<{
  select: typeof documentApiSelect;
}>;

export type DocumentStorageRecord = Prisma.DocumentGetPayload<{
  select: typeof documentStorageSelect;
}>;
