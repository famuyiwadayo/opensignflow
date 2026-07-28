import { Prisma } from '@opensignflow/database';

export const auditEventApiSelect = {
  id: true,
  organizationId: true,
  documentId: true,
  actorUserId: true,
  recipientId: true,
  eventType: true,
  actorType: true,
  actorEmail: true,
  ipAddress: true,
  userAgent: true,
  metadata: true,
  createdAt: true,
} satisfies Prisma.AuditEventSelect;

export type AuditEventApiRecord = Prisma.AuditEventGetPayload<{
  select: typeof auditEventApiSelect;
}>;
