import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encryptPayload } from '@opensignflow/crypto';
import {
  AuditActorType,
  AuditEventType,
  DocumentStatus,
  RecipientRole,
  RecipientStatus,
  SigningRequestStatus,
} from '@opensignflow/database';
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
    private readonly config: ConfigService,
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
      select: { id: true, email: true, name: true, role: true },
    });
    const fields = await this.prisma.documentField.findMany({
      where: { documentId: document.id },
      select: { recipientId: true },
    });
    const signers = recipients.filter(
      (recipient) => recipient.role === RecipientRole.SIGNER,
    );
    if (
      !signers.length ||
      !fields.length ||
      fields.some((field) => !field.recipientId)
    )
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
          'A document needs at least one signer and one assigned field before it can be sent.',
        ),
      );
    const signerIds = new Set(signers.map((recipient) => recipient.id));
    if (
      fields.some(
        (field) => !field.recipientId || !signerIds.has(field.recipientId),
      )
    )
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
          'Every field must be assigned to a signer recipient.',
        ),
      );
    const assignedSignerIds = new Set(fields.map((field) => field.recipientId));
    if (signers.some((signer) => !assignedSignerIds.has(signer.id)))
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_SEND_REQUIREMENTS_NOT_MET,
          'Every signer must have at least one assigned field before the document can be sent.',
        ),
      );
    const now = new Date();
    const signingRequests = signers.map((recipient) => ({
      id: this.idGenerator.generate('signingRequest'),
      documentId: document.id,
      recipientId: recipient.id,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      signingToken: this.newToken(),
    }));
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
        where: {
          documentId: document.id,
          id: { in: signers.map((signer) => signer.id) },
          status: RecipientStatus.PENDING,
        },
        data: { status: RecipientStatus.SENT },
      });
      await tx.signingRequest.createMany({
        data: signingRequests.map((request) => ({
          id: request.id,
          documentId: request.documentId,
          recipientId: request.recipientId,
          tokenHash: this.hashToken(request.signingToken),
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
            signerCount: signers.length,
            ccCount: recipients.length - signers.length,
            fieldCount: fields.length,
          },
        },
        tx,
      );
      await tx.outboxEvent.createMany({
        data: signingRequests.map((request) => {
          const encrypted = encryptPayload({
            plaintext: JSON.stringify({
              ...request,
              documentTitle: document.title,
            }),
            base64Key: this.config.getOrThrow<string>('OUTBOX_ENCRYPTION_KEY'),
            keyVersion: this.config.getOrThrow<string>(
              'OUTBOX_ENCRYPTION_KEY_VERSION',
            ),
          });
          return {
            id: this.idGenerator.generate('outboxEvent'),
            organizationId: document.organizationId,
            type: 'SEND_SIGNING_EMAIL',
            resourceType: 'SIGNING_REQUEST',
            resourceId: request.id,
            encryptedPayload: JSON.stringify(encrypted),
            encryptionKeyVersion: encrypted.keyVersion,
          };
        }),
      });
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
