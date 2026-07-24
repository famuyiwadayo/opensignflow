import { ApiProperty } from '@nestjs/swagger';

import type { DocumentApiRecord } from '../documents.select';
import { DocumentStatus } from '~/prisma/generated/enums';

export class DocumentEntity {
  @ApiProperty({ example: 'doc_K9Ys4vF7gH6m2Qz2N8aBcD' })
  id!: string;

  @ApiProperty({ example: 'org_K9Ys4vF7gH6m2Qz2N8aBcD' })
  organizationId!: string;

  @ApiProperty({ example: 'usr_K9Ys4vF7gH6m2Qz2N8aBcD' })
  createdById!: string;

  @ApiProperty({ example: 'Service Agreement' })
  title!: string;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.DRAFT })
  status!: DocumentStatus;

  @ApiProperty({ example: 'service-agreement.pdf' })
  originalFileName!: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType!: string;

  @ApiProperty({ example: 153420 })
  fileSizeBytes!: number;

  @ApiProperty({ example: 4, nullable: true })
  pageCount!: number | null;

  @ApiProperty({ example: null, nullable: true })
  completedAt!: string | null;

  @ApiProperty({ example: '2026-07-24T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-24T12:00:00.000Z' })
  updatedAt!: string;

  static fromPrisma(document: DocumentApiRecord): DocumentEntity {
    return {
      id: document.id,
      organizationId: document.organizationId,
      createdById: document.createdById,
      title: document.title,
      status: document.status,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      fileSizeBytes: document.fileSizeBytes,
      pageCount: document.pageCount,
      completedAt: document.completedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }
}
