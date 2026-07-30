import type { PrismaService } from '@/database';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@opensignflow/database';
import type { DocumentStatus } from '@opensignflow/database';
import { documentApiSelect, documentStorageSelect } from './documents.select';

type PrismaWriter = PrismaService | Prisma.TransactionClient;

export type CreateDocumentData = {
  id: string;
  organizationId: string;
  createdById: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  originalStorageKey: string;
  pageCount: number;
};

export type ListDocumentsInput = {
  organizationId: string;
  limit: number;
  cursorId?: string;
  status?: DocumentStatus;
  query?: string;
};

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDocumentData, client: PrismaWriter = this.prisma) {
    return client.document.create({ data, select: documentApiSelect });
  }

  async list(input: ListDocumentsInput) {
    const where: Prisma.DocumentWhereInput = {
      organizationId: input.organizationId,
      deletedAt: null,
      status: input.status,
      title: input.query
        ? { contains: input.query, mode: 'insensitive' }
        : undefined,
    };

    return this.prisma.document.findMany({
      where,
      select: documentApiSelect,
      take: input.limit + 1,
      skip: input.cursorId ? 1 : undefined,
      cursor: input.cursorId ? { id: input.cursorId } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  findByIdForOrganization(input: {
    documentId: string;
    organizationId: string;
  }) {
    return this.prisma.document.findFirst({
      where: {
        id: input.documentId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      select: documentApiSelect,
    });
  }

  findStorageByIdForOrganization(input: {
    documentId: string;
    organizationId: string;
  }) {
    return this.prisma.document.findFirst({
      where: {
        id: input.documentId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      select: documentStorageSelect,
    });
  }
}
