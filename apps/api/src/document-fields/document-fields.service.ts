import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AuditActorType,
  AuditEventType,
  DocumentStatus,
  RecipientRole,
} from '@opensignflow/database';
import { AuditService } from '@/audit';
import {
  apiError,
  ErrorCode,
  IdGeneratorService,
  type AuthenticatedUser,
  type RequestContext,
} from '@/common';
import { DocumentsService } from '@/documents';
import { RecipientsRepository } from '@/recipients';
import {
  BulkAssignDocumentFieldsDto,
  CreateDocumentFieldDto,
  UpdateDocumentFieldDto,
} from './dto';
import { DocumentFieldEntity } from './entities';
import { DocumentFieldsRepository } from './document-fields.repository';

@Injectable()
export class DocumentFieldsService {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly recipientsRepository: RecipientsRepository,
    private readonly fieldsRepository: DocumentFieldsRepository,
    private readonly auditService: AuditService,
    private readonly idGenerator: IdGeneratorService,
  ) {}
  async list(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
  }) {
    await this.documentsService.getById(input);
    return {
      data: (
        await this.fieldsRepository.listByDocumentId(input.documentId)
      ).map((fld) => DocumentFieldEntity.fromPrisma(fld)),
    };
  }
  async create(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    dto: CreateDocumentFieldDto;
    context: RequestContext;
  }) {
    const document = await this.editable(input);
    await this.validate(input.dto, document.id, document.pageCount);
    const field = await this.fieldsRepository.create({
      id: this.idGenerator.generate('documentField'),
      documentId: document.id,
      recipientId: input.dto.recipientId,
      type: input.dto.type,
      pageNumber: input.dto.pageNumber,
      x: input.dto.x,
      y: input.dto.y,
      width: input.dto.width,
      height: input.dto.height,
      required: input.dto.required ?? true,
      label: input.dto.label,
      placeholder: input.dto.placeholder,
      defaultValue: input.dto.defaultValue,
    });
    await this.audit(
      document,
      input.user,
      field.id,
      AuditEventType.DOCUMENT_FIELD_CREATED,
      input.context,
    );
    return DocumentFieldEntity.fromPrisma(field);
  }
  async update(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    fieldId: string;
    dto: UpdateDocumentFieldDto;
    context: RequestContext;
  }) {
    const document = await this.editable(input);
    const existing = await this.field(input.fieldId, document.id);
    const merged = {
      recipientId: input.dto.recipientId ?? existing.recipientId ?? undefined,
      pageNumber: input.dto.pageNumber ?? existing.pageNumber,
      x: input.dto.x ?? existing.x.toNumber(),
      y: input.dto.y ?? existing.y.toNumber(),
      width: input.dto.width ?? existing.width.toNumber(),
      height: input.dto.height ?? existing.height.toNumber(),
    };
    await this.validate(merged, document.id, document.pageCount);
    const field = await this.fieldsRepository.update(
      existing.id,
      this.write(input.dto),
    );
    await this.audit(
      document,
      input.user,
      field.id,
      AuditEventType.DOCUMENT_FIELD_UPDATED,
      input.context,
    );
    return DocumentFieldEntity.fromPrisma(field);
  }
  async remove(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    fieldId: string;
    context: RequestContext;
  }) {
    const document = await this.editable(input);
    const field = await this.field(input.fieldId, document.id);
    await this.fieldsRepository.delete(field.id);
    await this.audit(
      document,
      input.user,
      field.id,
      AuditEventType.DOCUMENT_FIELD_DELETED,
      input.context,
    );
  }

  async bulkAssign(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    dto: BulkAssignDocumentFieldsDto;
    context: RequestContext;
  }) {
    const document = await this.editable(input);
    const recipient = await this.recipientsRepository.findByIdForDocument({
      recipientId: input.dto.recipientId,
      documentId: document.id,
    });
    if (!recipient)
      throw new NotFoundException(
        apiError(ErrorCode.RECIPIENT_NOT_FOUND, 'Recipient was not found.'),
      );
    if (recipient.role !== RecipientRole.SIGNER)
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.RECIPIENT_ROLE_NOT_ELIGIBLE,
          'Only signer recipients can be assigned document fields.',
        ),
      );
    const fields = await this.fieldsRepository.listByIdsForDocument({
      fieldIds: input.dto.fieldIds,
      documentId: document.id,
    });
    if (fields.length !== input.dto.fieldIds.length)
      throw new NotFoundException(
        apiError(
          ErrorCode.DOCUMENT_FIELD_NOT_FOUND,
          'One or more document fields were not found.',
        ),
      );
    const updated = await this.fieldsRepository.assignRecipient({
      fieldIds: input.dto.fieldIds,
      documentId: document.id,
      recipientId: recipient.id,
    });
    await this.auditService.record({
      organizationId: document.organizationId,
      documentId: document.id,
      actorUserId: input.user.id,
      actorEmail: input.user.email,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.DOCUMENT_FIELD_UPDATED,
      context: input.context,
      metadata: {
        operation: 'BULK_ASSIGNMENT',
        fieldIds: input.dto.fieldIds,
        recipientId: recipient.id,
      },
    });
    return {
      data: updated.map((chng) => DocumentFieldEntity.fromPrisma(chng)),
    };
  }

  private async editable(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
  }) {
    const document = await this.documentsService.getById(input);
    if (document.status !== DocumentStatus.DRAFT)
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_NOT_EDITABLE,
          'Fields can only be changed while a document is a draft.',
        ),
      );
    return document;
  }
  private async field(fieldId: string, documentId: string) {
    const field = await this.fieldsRepository.findByIdForDocument({
      fieldId,
      documentId,
    });
    if (!field)
      throw new NotFoundException(
        apiError(
          ErrorCode.DOCUMENT_FIELD_NOT_FOUND,
          'Document field was not found.',
        ),
      );
    return field;
  }
  private async validate(
    field: {
      recipientId?: string;
      pageNumber: number;
      x: number;
      y: number;
      width: number;
      height: number;
    },
    documentId: string,
    pageCount: number | null,
  ) {
    if (!field.recipientId)
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_FIELD_RECIPIENT_REQUIRED,
          'A recipient is required for every document field.',
        ),
      );
    const recipient = await this.recipientsRepository.findByIdForDocument({
      recipientId: field.recipientId,
      documentId,
    });
    if (!recipient)
      throw new NotFoundException(
        apiError(ErrorCode.RECIPIENT_NOT_FOUND, 'Recipient was not found.'),
      );
    if (recipient.role !== RecipientRole.SIGNER)
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.RECIPIENT_ROLE_NOT_ELIGIBLE,
          'Only signer recipients can be assigned document fields.',
        ),
      );
    if (pageCount && field.pageNumber > pageCount)
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_FIELD_INVALID_POSITION,
          'Page number is outside the document.',
        ),
      );
    if (field.x + field.width > 1 || field.y + field.height > 1)
      throw new UnprocessableEntityException(
        apiError(
          ErrorCode.DOCUMENT_FIELD_INVALID_POSITION,
          'Field bounds must remain within the page.',
        ),
      );
  }
  private write(dto: Partial<CreateDocumentFieldDto>) {
    return {
      recipientId: dto.recipientId,
      type: dto.type,
      pageNumber: dto.pageNumber,
      x: dto.x,
      y: dto.y,
      width: dto.width,
      height: dto.height,
      required: dto.required,
      label: dto.label,
      placeholder: dto.placeholder,
      defaultValue: dto.defaultValue,
    };
  }
  private audit(
    document: { id: string; organizationId: string },
    user: AuthenticatedUser,
    fieldId: string,
    eventType: AuditEventType,
    context: RequestContext,
  ) {
    return this.auditService.record({
      organizationId: document.organizationId,
      documentId: document.id,
      actorUserId: user.id,
      actorEmail: user.email,
      actorType: AuditActorType.USER,
      eventType,
      context,
      metadata: { fieldId },
    });
  }
}
