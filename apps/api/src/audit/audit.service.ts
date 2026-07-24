import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import {
  apiError,
  ErrorCode,
  IdGeneratorService,
  type RequestContext,
} from '@/common';
import { PrismaService } from '../database';
import { ListAuditEventsQueryDto } from './dto';
import { AuditEventEntity } from './entities';
import { AuditRepository } from './audit.repository';
import {
  AuditActorType,
  AuditEventType,
  Prisma,
} from '~/prisma/generated/client';

type PrismaWriter = PrismaService | Prisma.TransactionClient;

export type RecordAuditEventInput = {
  organizationId: string;
  documentId?: string;
  actorUserId?: string;
  recipientId?: string;
  eventType: AuditEventType;
  actorType: AuditActorType;
  actorEmail?: string;
  context?: RequestContext;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idGenerator: IdGeneratorService,
    private readonly auditRepository: AuditRepository,
  ) {}

  async listForDocument(input: {
    organizationId: string;
    documentId: string;
    query: ListAuditEventsQueryDto;
  }) {
    const limit = Math.min(Math.max(input.query.limit ?? 20, 1), 100);
    const cursorId = input.query.cursor
      ? this.decodeCursor(input.query.cursor)
      : undefined;
    const events = await this.auditRepository.listForDocument({
      organizationId: input.organizationId,
      documentId: input.documentId,
      limit,
      cursorId,
    });
    const hasMore = events.length > limit;
    const page = events.slice(0, limit);
    const lastEvent = page.at(-1);

    return {
      data: page.map(AuditEventEntity.fromPrisma),
      pagination: {
        limit,
        nextCursor:
          hasMore && lastEvent ? this.encodeCursor(lastEvent.id) : null,
        hasMore,
      },
    };
  }

  record(input: RecordAuditEventInput, client: PrismaWriter = this.prisma) {
    return client.auditEvent.create({
      data: {
        id: this.idGenerator.generate('aud'),
        organizationId: input.organizationId,
        documentId: input.documentId,
        actorUserId: input.actorUserId,
        recipientId: input.recipientId,
        eventType: input.eventType,
        actorType: input.actorType,
        actorEmail: input.actorEmail,
        ipAddress: input.context?.ipAddress,
        userAgent: input.context?.userAgent,
        metadata: input.metadata,
      },
    });
  }

  private encodeCursor(eventId: string): string {
    return Buffer.from(JSON.stringify({ id: eventId })).toString('base64url');
  }

  private decodeCursor(cursor: string): string {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { id?: string };
      if (!parsed.id) throw new Error('Missing cursor id.');
      return parsed.id;
    } catch {
      throw new UnprocessableEntityException(
        apiError(ErrorCode.VALIDATION_ERROR, 'Cursor is invalid.'),
      );
    }
  }
}
