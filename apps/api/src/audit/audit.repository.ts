import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database';
import { AuditEventApiRecord, auditEventApiSelect } from './audit.select';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForDocument(input: {
    organizationId: string;
    documentId: string;
    limit: number;
    cursorId?: string;
  }): Promise<AuditEventApiRecord[]> {
    return this.prisma.auditEvent.findMany({
      where: {
        organizationId: input.organizationId,
        documentId: input.documentId,
      },
      select: auditEventApiSelect,
      take: input.limit + 1,
      skip: input.cursorId ? 1 : undefined,
      cursor: input.cursorId ? { id: input.cursorId } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}
