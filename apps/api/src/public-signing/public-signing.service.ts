import { createHash } from 'node:crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AuditActorType,
  AuditEventType,
  DocumentStatus,
  RecipientStatus,
  SigningRequestStatus,
} from '@opensignflow/database';
import { AuditService } from '@/audit';
import { apiError, ErrorCode, IdGeneratorService } from '@/common';
import { PrismaService } from '@/database';
import type { SubmitSigningRequestDto } from './dto';
import type { PublicSigningRequestEntity } from './entities/signing-request.entity';
import { ConfigService } from '@nestjs/config';
import {
  isTypedNameSignatureValue,
  type FinalizeCompletedDocumentOutboxPayload,
  type OutboxPayloadEnvelope,
} from '@opensignflow/shared';
import { encryptPayload } from '@opensignflow/crypto';

@Injectable()
export class PublicSigningService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(IdGeneratorService) private readonly ids: IdGeneratorService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async getByToken(
    token: string,
    context: { ipAddress?: string; userAgent?: string },
  ): Promise<PublicSigningRequestEntity> {
    const request = await this.prisma.signingRequest.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { recipient: true, document: true },
    });
    if (!request) {
      throw new NotFoundException(
        apiError(
          ErrorCode.SIGNING_REQUEST_NOT_FOUND,
          'Signing request was not found.',
        ),
      );
    }
    if (request.status === SigningRequestStatus.REVOKED) {
      throw new UnauthorizedException(
        apiError(
          ErrorCode.SIGNING_REQUEST_REVOKED,
          'Signing request is no longer active.',
        ),
      );
    }
    if (request.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        apiError(ErrorCode.SIGNING_TOKEN_EXPIRED, 'Signing link has expired.'),
      );
    }
    if (request.status === SigningRequestStatus.COMPLETED) {
      throw new UnauthorizedException(
        apiError(
          ErrorCode.SIGNING_ALREADY_SUBMITTED,
          'Signing request has already been completed.',
        ),
      );
    }
    if (!request.viewedAt) {
      await this.prisma.$transaction(async (tx) => {
        await tx.signingRequest.update({
          where: { id: request.id },
          data: { status: SigningRequestStatus.VIEWED, viewedAt: new Date() },
        });
        await tx.recipient.update({
          where: { id: request.recipientId },
          data: { status: RecipientStatus.VIEWED, viewedAt: new Date() },
        });
        await this.audit.record(
          {
            organizationId: request.document.organizationId,
            documentId: request.documentId,
            recipientId: request.recipientId,
            actorType: AuditActorType.RECIPIENT,
            actorEmail: request.recipient.email,
            eventType: AuditEventType.SIGNING_LINK_OPENED,
            context,
          },
          tx,
        );
      });
    }
    const fields = await this.prisma.documentField.findMany({
      where: {
        documentId: request.documentId,
        recipientId: request.recipientId,
      },
      orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }],
    });
    return {
      documentTitle: request.document.title,
      originalFileName: request.document.originalFileName,
      pageCount: request.document.pageCount,
      recipientName: request.recipient.name,
      recipientEmail: request.recipient.email,
      status: SigningRequestStatus.VIEWED,
      expiresAt: request.expiresAt.toISOString(),
      fields: fields.map((field) => ({
        id: field.id,
        type: field.type,
        pageNumber: field.pageNumber,
        x: field.x.toNumber(),
        y: field.y.toNumber(),
        width: field.width.toNumber(),
        height: field.height.toNumber(),
        required: field.required,
        label: field.label,
        placeholder: field.placeholder,
      })),
    };
  }
  async submit(
    token: string,
    dto: SubmitSigningRequestDto,
    context: { ipAddress?: string; userAgent?: string },
  ) {
    const request = await this.prisma.signingRequest.findUnique({
      where: { tokenHash: this.hash(token) },
      include: { recipient: true, document: true },
    });
    if (!request) {
      throw new NotFoundException(
        apiError(
          ErrorCode.SIGNING_REQUEST_NOT_FOUND,
          'Signing request was not found.',
        ),
      );
    }
    if (request.status === SigningRequestStatus.REVOKED) {
      throw new UnauthorizedException(
        apiError(
          ErrorCode.SIGNING_REQUEST_REVOKED,
          'Signing request is no longer active.',
        ),
      );
    }
    if (request.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        apiError(ErrorCode.SIGNING_TOKEN_EXPIRED, 'Signing link has expired.'),
      );
    }
    if (request.status === SigningRequestStatus.COMPLETED) {
      throw new UnauthorizedException(
        apiError(
          ErrorCode.SIGNING_ALREADY_SUBMITTED,
          'Signing request has already been completed.',
        ),
      );
    }
    const fields = await this.prisma.documentField.findMany({
      where: {
        documentId: request.documentId,
        recipientId: request.recipientId,
      },
    });
    const allowed = new Map(fields.map((field) => [field.id, field]));
    if (dto.values.some((value) => !allowed.has(value.fieldId))) {
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.SIGNING_SUBMISSION_INVALID,
          'Submitted field does not belong to this signing request.',
        ),
      );
    }
    const submitted = new Set(dto.values.map((value) => value.fieldId));
    if (fields.some((field) => field.required && !submitted.has(field.id))) {
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.SIGNING_REQUIRED_FIELDS_MISSING,
          'Required signing fields are missing.',
        ),
      );
    }
    for (const submittedValue of dto.values) {
      const field = allowed.get(submittedValue.fieldId);
      if (!field) {
        throw new UnprocessableEntityException(
          apiError(
            ErrorCode.SIGNING_SUBMISSION_INVALID,
            'Submitted field does not belong to this signing request.',
          ),
        );
      }
      if (!this.isValidFieldValue(field.type, submittedValue.value)) {
        throw new UnprocessableEntityException(
          apiError(
            ErrorCode.SIGNING_SUBMISSION_INVALID,
            'Submitted value does not match the document field type.',
          ),
        );
      }
    }
    await this.prisma.$transaction(async (tx) => {
      const submission = await tx.signingSubmission.create({
        data: {
          id: this.ids.generate('signingSubmission'),
          documentId: request.documentId,
          recipientId: request.recipientId,
          signingRequestId: request.id,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
      await tx.documentFieldValue.createMany({
        data: dto.values.map((value) => ({
          id: this.ids.generate('documentFieldValue'),
          documentId: request.documentId,
          fieldId: value.fieldId,
          recipientId: request.recipientId,
          signingSubmissionId: submission.id,
          value: value.value as never,
        })),
      });
      await tx.signingRequest.update({
        where: { id: request.id },
        data: {
          status: SigningRequestStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      await tx.recipient.update({
        where: { id: request.recipientId },
        data: { status: RecipientStatus.SIGNED, signedAt: new Date() },
      });
      await this.audit.record(
        {
          organizationId: request.document.organizationId,
          documentId: request.documentId,
          recipientId: request.recipientId,
          actorType: AuditActorType.RECIPIENT,
          actorEmail: request.recipient.email,
          eventType: AuditEventType.RECIPIENT_SIGNED,
          context,
        },
        tx,
      );
      const remaining = await tx.signingRequest.count({
        where: {
          documentId: request.documentId,
          status: { not: SigningRequestStatus.COMPLETED },
        },
      });
      if (remaining === 0) {
        await tx.document.update({
          where: { id: request.documentId },
          data: { status: DocumentStatus.COMPLETED, completedAt: new Date() },
        });
        await this.audit.record(
          {
            organizationId: request.document.organizationId,
            documentId: request.documentId,
            actorType: AuditActorType.SYSTEM,
            eventType: AuditEventType.DOCUMENT_COMPLETED,
            context,
          },
          tx,
        );
        const jobId = this.ids.generate('job');
        await tx.jobRecord.create({
          data: {
            id: jobId,
            organizationId: request.document.organizationId,
            type: 'PDF_FINALIZATION',
            resourceType: 'DOCUMENT',
            resourceId: request.documentId,
          },
        });
        const payload: OutboxPayloadEnvelope<
          'FINALIZE_COMPLETED_DOCUMENT',
          FinalizeCompletedDocumentOutboxPayload
        > = {
          version: 1,
          type: 'FINALIZE_COMPLETED_DOCUMENT',
          payload: {
            jobId,
            documentId: request.documentId,
            organizationId: request.document.organizationId,
          },
        };
        const encrypted = encryptPayload({
          plaintext: JSON.stringify(payload),
          base64Key: this.config.getOrThrow<string>('OUTBOX_ENCRYPTION_KEY'),
          keyVersion: this.config.getOrThrow<string>(
            'OUTBOX_ENCRYPTION_KEY_VERSION',
          ),
        });
        await tx.outboxEvent.create({
          data: {
            id: this.ids.generate('outboxEvent'),
            organizationId: request.document.organizationId,
            type: 'FINALIZE_COMPLETED_DOCUMENT',
            resourceType: 'DOCUMENT',
            resourceId: request.documentId,
            encryptedPayload: JSON.stringify(encrypted),
            encryptionKeyVersion: encrypted.keyVersion,
          },
        });
      }
    });
    return { success: true };
  }

  private isValidFieldValue(type: string, value: unknown): boolean {
    if (type === 'SIGNATURE') {
      return isTypedNameSignatureValue(value);
    }
    if (type === 'CHECKBOX') {
      return typeof value === 'boolean';
    }
    if (type === 'DATE') {
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    }
    if (type === 'TEXT') {
      return typeof value === 'string' && value.length <= 2000;
    }
    if (type === 'INITIALS') {
      return (
        typeof value === 'string' &&
        value.trim().length > 0 &&
        value.length <= 12
      );
    }
    return false;
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
