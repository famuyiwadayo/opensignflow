import { ApiProperty } from '@nestjs/swagger';

import type { RecipientApiRecord } from '../recipients.select';
import { RecipientStatus } from '~/prisma/generated/enums';

export class RecipientEntity {
  @ApiProperty({ example: 'rcp_K9Ys4vF7gH6m2Qz2N8aBcD' })
  id!: string;

  @ApiProperty({ example: 'doc_K9Ys4vF7gH6m2Qz2N8aBcD' })
  documentId!: string;

  @ApiProperty({ example: 'Grace Hopper' })
  name!: string;

  @ApiProperty({ example: 'grace@example.com' })
  email!: string;

  @ApiProperty({ enum: RecipientStatus, example: RecipientStatus.PENDING })
  status!: RecipientStatus;

  @ApiProperty({ example: 1 })
  signingOrder!: number;

  @ApiProperty({ example: null, nullable: true })
  viewedAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  signedAt!: string | null;

  @ApiProperty({ example: null, nullable: true })
  declinedAt!: string | null;

  @ApiProperty({ example: '2026-07-24T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-24T12:00:00.000Z' })
  updatedAt!: string;

  static fromPrisma(recipient: RecipientApiRecord): RecipientEntity {
    return {
      ...recipient,
      viewedAt: recipient.viewedAt?.toISOString() ?? null,
      signedAt: recipient.signedAt?.toISOString() ?? null,
      declinedAt: recipient.declinedAt?.toISOString() ?? null,
      createdAt: recipient.createdAt.toISOString(),
      updatedAt: recipient.updatedAt.toISOString(),
    };
  }
}
