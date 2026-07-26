import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  AuditActorType,
  AuditEventType,
  DocumentStatus,
  RecipientStatus,
  SigningRequestStatus,
} from '~/prisma/generated/client';
import {
  apiError,
  ErrorCode,
  IdGeneratorService,
  type AuthenticatedUser,
  type RequestContext,
} from '@/common';
import { PrismaService } from '@/database';
import { DocumentsService } from '@/documents';
import { AuditService } from '@/audit';

@Injectable()
export class SigningService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly prisma: PrismaService,
    private readonly idGenerator: IdGeneratorService,
    private readonly auditService: AuditService,
  ) {}

  async send(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    context: RequestContext;
  }) {
    const document = await this.documentsService.getById(input);
    if (document.status !== DocumentStatus.DRAFT)
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_ALREADY_SENT,
          'Document has already been sent or is no longer a draft.',
        ),
      );
    const recipients = await this.prisma.recipient.findMany({
      where: { documentId: document.id },
      select: { id: true },
    });
    const fields = await this.prisma.documentField.findMany({
      where: { documentId: document.id },
      select: { recipientId: true },
    });
    if (
      !recipients.length ||
      !fields.length ||
      fields.some((field) => !field.recipientId)
    )
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
          'A document needs at least one recipient and one assigned field before it can be sent.',
        ),
      );
    const recipientIds = new Set(recipients.map((recipient) => recipient.id));
    if (
      fields.some(
        (field) => !field.recipientId || !recipientIds.has(field.recipientId),
      )
    )
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
          'Every field must be assigned to a document recipient.',
        ),
      );
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.document.updateMany({
        where: {
          id: document.id,
          status: DocumentStatus.DRAFT,
          deletedAt: null,
        },
        data: { status: DocumentStatus.SENT, sentAt: now },
      });
      if (!transitioned.count)
        throw new UnprocessableEntityException(
          apiError(
            ErrorCode.DOCUMENT_ALREADY_SENT,
            'Document has already been sent or is no longer a draft.',
          ),
        );
      await tx.recipient.updateMany({
        where: { documentId: document.id, status: RecipientStatus.PENDING },
        data: { status: RecipientStatus.SENT },
      });
      await tx.signingRequest.createMany({
        data: recipients.map((recipient) => ({
          id: this.idGenerator.generate('sreq'),
          documentId: document.id,
          recipientId: recipient.id,
          tokenHash: this.hashToken(this.newToken()),
          status: SigningRequestStatus.PENDING,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          sentAt: now,
        })),
      });
      await this.auditService.record(
        {
          organizationId: document.organizationId,
          documentId: document.id,
          actorUserId: input.user.id,
          actorEmail: input.user.email,
          actorType: AuditActorType.USER,
          eventType: AuditEventType.DOCUMENT_SENT,
          context: input.context,
          metadata: {
            recipientCount: recipients.length,
            fieldCount: fields.length,
          },
        },
        tx,
      );
    });
    return this.documentsService.getById(input);
  }
  private newToken() {
    return randomBytes(32).toString('base64url');
  }
  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
