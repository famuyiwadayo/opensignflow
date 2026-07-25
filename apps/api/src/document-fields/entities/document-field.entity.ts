import { ApiProperty } from '@nestjs/swagger';

import type { DocumentFieldApiRecord } from '../document-fields.select';
import { DocumentFieldType } from '~/prisma/generated/enums';

export class DocumentFieldEntity {
  @ApiProperty({ example: 'fld_K9Ys4vF7gH6m2Qz2N8aBcD' })
  id!: string;

  @ApiProperty({ example: 'doc_K9Ys4vF7gH6m2Qz2N8aBcD' })
  documentId!: string;

  @ApiProperty({ example: 'rcp_K9Ys4vF7gH6m2Qz2N8aBcD', nullable: true })
  recipientId!: string | null;

  @ApiProperty({ enum: DocumentFieldType })
  type!: DocumentFieldType;

  @ApiProperty({ example: 1 })
  pageNumber!: number;

  @ApiProperty({ example: 0.64 })
  x!: number;

  @ApiProperty({ example: 0.78 })
  y!: number;

  @ApiProperty({ example: 0.22 })
  width!: number;

  @ApiProperty({ example: 0.06 })
  height!: number;

  @ApiProperty({ example: true })
  required!: boolean;

  @ApiProperty({ example: 'Client signature', nullable: true })
  label!: string | null;

  @ApiProperty({ example: null, nullable: true })
  placeholder!: string | null;

  @ApiProperty({ example: null, nullable: true })
  defaultValue!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  validation!: unknown | null;

  @ApiProperty({ example: '2026-07-24T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-24T12:00:00.000Z' })
  updatedAt!: string;

  static fromPrisma(field: DocumentFieldApiRecord): DocumentFieldEntity {
    return {
      ...field,
      x: field.x.toNumber(),
      y: field.y.toNumber(),
      width: field.width.toNumber(),
      height: field.height.toNumber(),
      validation: field.validation ?? null,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    };
  }
}
