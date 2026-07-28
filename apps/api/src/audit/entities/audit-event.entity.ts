import { ApiProperty } from '@nestjs/swagger';

import type { AuditEventApiRecord } from '../audit.select';
import { AuditActorType, AuditEventType } from '@opensignflow/database';

export class AuditEventEntity {
  @ApiProperty({ example: 'aud_K9Ys4vF7gH6m2Qz2N8aBcD' })
  id!: string;

  @ApiProperty({ example: 'org_K9Ys4vF7gH6m2Qz2N8aBcD' })
  organizationId!: string;

  @ApiProperty({ example: 'doc_K9Ys4vF7gH6m2Qz2N8aBcD', nullable: true })
  documentId!: string | null;

  @ApiProperty({ example: 'usr_K9Ys4vF7gH6m2Qz2N8aBcD', nullable: true })
  actorUserId!: string | null;

  @ApiProperty({ example: null, nullable: true })
  recipientId!: string | null;

  @ApiProperty({
    enum: AuditEventType,
    example: AuditEventType.DOCUMENT_UPLOADED,
  })
  eventType!: AuditEventType;

  @ApiProperty({ enum: AuditActorType, example: AuditActorType.USER })
  actorType!: AuditActorType;

  @ApiProperty({ example: 'owner@example.com', nullable: true })
  actorEmail!: string | null;

  @ApiProperty({ example: '127.0.0.1', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ example: 'Mozilla/5.0', nullable: true })
  userAgent!: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  metadata!: unknown | null;

  @ApiProperty({ example: '2026-07-24T12:00:00.000Z' })
  createdAt!: string;

  static fromPrisma(event: AuditEventApiRecord): AuditEventEntity {
    return {
      ...event,
      metadata: event.metadata ?? null,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
