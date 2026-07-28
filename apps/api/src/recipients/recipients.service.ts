import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AuditActorType,
  AuditEventType,
  DocumentStatus,
  Prisma,
} from '~/prisma/generated/client';

import { AuditService } from '@/audit';
import {
  apiError,
  ErrorCode,
  IdGeneratorService,
  type AuthenticatedUser,
  type RequestContext,
} from '@/common';
import { DocumentsService } from '@/documents';
import { CreateRecipientDto, UpdateRecipientDto } from './dto';
import { RecipientEntity } from './entities';
import { RecipientsRepository } from './recipients.repository';

@Injectable()
export class RecipientsService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly recipientsRepository: RecipientsRepository,
    private readonly auditService: AuditService,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  async list(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
  }) {
    await this.documentsService.getById(input);
    const recipients = await this.recipientsRepository.listByDocumentId(
      input.documentId,
    );
    return { data: recipients.map(RecipientEntity.fromPrisma) };
  }

  async create(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    dto: CreateRecipientDto;
    context: RequestContext;
  }): Promise<RecipientEntity> {
    const document = await this.getEditableDocument(input);
    const recipient = await this.createRecipient({
      id: this.idGenerator.generate('rcp'),
      documentId: document.id,
      name: input.dto.name.trim(),
      email: this.normalizeEmail(input.dto.email),
      signingOrder: input.dto.signingOrder ?? 1,
    });

    await this.auditService.record({
      organizationId: document.organizationId,
      documentId: document.id,
      recipientId: recipient.id,
      actorUserId: input.user.id,
      actorEmail: input.user.email,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.RECIPIENT_CREATED,
      context: input.context,
      metadata: {
        name: recipient.name,
        email: recipient.email,
        signingOrder: recipient.signingOrder,
      },
    });

    return RecipientEntity.fromPrisma(recipient);
  }

  async update(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    recipientId: string;
    dto: UpdateRecipientDto;
    context: RequestContext;
  }): Promise<RecipientEntity> {
    const document = await this.getEditableDocument(input);
    const existing = await this.getRecipient(input.recipientId, document.id);
    const recipient = await this.updateRecipient({
      recipientId: existing.id,
      name: input.dto.name?.trim(),
      email: input.dto.email ? this.normalizeEmail(input.dto.email) : undefined,
      signingOrder: input.dto.signingOrder,
    });

    await this.auditService.record({
      organizationId: document.organizationId,
      documentId: document.id,
      recipientId: recipient.id,
      actorUserId: input.user.id,
      actorEmail: input.user.email,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.RECIPIENT_UPDATED,
      context: input.context,
      metadata: {
        name: recipient.name,
        email: recipient.email,
        signingOrder: recipient.signingOrder,
      },
    });

    return RecipientEntity.fromPrisma(recipient);
  }

  async remove(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    recipientId: string;
    context: RequestContext;
  }) {
    const document = await this.getEditableDocument(input);
    const recipient = await this.getRecipient(input.recipientId, document.id);
    await this.recipientsRepository.delete(recipient.id);

    await this.auditService.record({
      organizationId: document.organizationId,
      documentId: document.id,
      recipientId: recipient.id,
      actorUserId: input.user.id,
      actorEmail: input.user.email,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.RECIPIENT_DELETED,
      context: input.context,
      metadata: {
        name: recipient.name,
        email: recipient.email,
        signingOrder: recipient.signingOrder,
      },
    });
  }

  private async getEditableDocument(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
  }) {
    const document = await this.documentsService.getById(input);
    if (document.status !== DocumentStatus.DRAFT) {
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_NOT_EDITABLE,
          'Recipients can only be changed while a document is a draft.',
        ),
      );
    }
    return document;
  }

  private async getRecipient(recipientId: string, documentId: string) {
    const recipient = await this.recipientsRepository.findByIdForDocument({
      recipientId,
      documentId,
    });
    if (!recipient) {
      throw new NotFoundException(
        apiError(ErrorCode.RECIPIENT_NOT_FOUND, 'Recipient was not found.'),
      );
    }
    return recipient;
  }

  private async createRecipient(data: {
    id: string;
    documentId: string;
    name: string;
    email: string;
    signingOrder: number;
  }) {
    try {
      return await this.recipientsRepository.create(data);
    } catch (error) {
      this.rethrowDuplicateEmail(error);
    }
  }

  private async updateRecipient(data: {
    recipientId: string;
    name?: string;
    email?: string;
    signingOrder?: number;
  }) {
    try {
      return await this.recipientsRepository.update(data);
    } catch (error) {
      this.rethrowDuplicateEmail(error);
    }
  }

  private rethrowDuplicateEmail(error: unknown): never {
    // Do not rely solely on instanceof: driver-adapter and duplicate-package
    // boundaries can produce a known Prisma error from a different runtime copy.
    const prismaCode =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? error.code
        : this.errorCode(error);

    if (prismaCode === 'P2002') {
      throw new ConflictException(
        apiError(
          ErrorCode.RECIPIENT_ALREADY_EXISTS,
          'A recipient with this email already exists on the document.',
        ),
      );
    }

    throw error;
  }

  private errorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return undefined;
    }

    return typeof error.code === 'string' ? error.code : undefined;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
