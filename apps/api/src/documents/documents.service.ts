import {
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';

import { AuditService } from '@/audit';
import type { ListAuditEventsQueryDto } from '@/audit';
import { IdGeneratorService } from '@/common';
import {
  apiError,
  ErrorCode,
  type AuthenticatedUser,
  type RequestContext,
} from '@/common';
import { OrganizationsService } from '@/organizations';
import { PdfService } from '@/pdf';
import { StorageService } from '@/storage';
import type { CreateDocumentDto, ListDocumentsQueryDto } from './dto';
import type { DocumentDownloadUrlEntity } from './entities';
import { DocumentEntity } from './entities';
import { DocumentsRepository } from './documents.repository';
import { AuditActorType, AuditEventType } from '@opensignflow/database';

const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type UploadedPdfFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DocumentsRepository)
    private readonly documentsRepository: DocumentsRepository,
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
    @Inject(StorageService) private readonly storageService: StorageService,
    @Inject(PdfService) private readonly pdfService: PdfService,
    @Inject(AuditService) private readonly auditService: AuditService,
    @Inject(IdGeneratorService)
    private readonly idGenerator: IdGeneratorService,
  ) {}

  async create(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    dto: CreateDocumentDto;
    file?: UploadedPdfFile;
    context: RequestContext;
  }): Promise<DocumentEntity> {
    this.validateUploadedPdf(input.file);

    const file = input.file;
    const membership =
      await this.organizationsService.resolveActiveMembershipForUser({
        userId: input.user.id,
        organizationId: input.organizationId,
      });

    const documentId = this.idGenerator.generate('document');
    const title =
      input.dto.title?.trim() || this.titleFromFileName(file.originalname);
    const pageCount = await this.pdfService.getPageCount(file.buffer);
    const storageKey = this.buildOriginalStorageKey({
      organizationId: membership.organization.id,
      documentId,
      fileName: file.originalname,
    });

    await this.storageService.uploadObject({
      key: storageKey,
      body: file.buffer,
      contentType: 'application/pdf',
      contentLength: file.size,
    });

    const document = await this.documentsRepository.create({
      id: documentId,
      organizationId: membership.organization.id,
      createdById: input.user.id,
      title,
      originalFileName: file.originalname,
      mimeType: 'application/pdf',
      fileSizeBytes: file.size,
      originalStorageKey: storageKey,
      pageCount,
    });

    await this.auditService.record({
      organizationId: membership.organization.id,
      documentId: document.id,
      actorUserId: input.user.id,
      actorEmail: input.user.email,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.DOCUMENT_UPLOADED,
      context: input.context,
      metadata: {
        originalFileName: file.originalname,
        fileSizeBytes: file.size,
        pageCount,
      },
    });

    return DocumentEntity.fromPrisma(document);
  }

  async list(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    query: ListDocumentsQueryDto;
  }) {
    const membership =
      await this.organizationsService.resolveActiveMembershipForUser({
        userId: input.user.id,
        organizationId: input.organizationId,
      });

    const limit = Math.min(Math.max(input.query.limit ?? 20, 1), 100);
    const cursorId = input.query.cursor
      ? this.decodeCursor(input.query.cursor)
      : undefined;
    const documents = await this.documentsRepository.list({
      organizationId: membership.organization.id,
      limit,
      cursorId,
      status: input.query.status,
      query: input.query.q?.trim() || undefined,
    });

    const hasMore = documents.length > limit;
    const page = documents.slice(0, limit);
    const lastDocument = page.at(-1);

    return {
      data: page.map(DocumentEntity.fromPrisma),
      pagination: {
        limit,
        nextCursor:
          hasMore && lastDocument ? this.encodeCursor(lastDocument.id) : null,
        hasMore,
      },
    };
  }

  async listAuditEvents(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    query: ListAuditEventsQueryDto;
  }) {
    const membership =
      await this.organizationsService.resolveActiveMembershipForUser({
        userId: input.user.id,
        organizationId: input.organizationId,
      });
    const document = await this.documentsRepository.findByIdForOrganization({
      documentId: input.documentId,
      organizationId: membership.organization.id,
    });

    if (!document) {
      throw new NotFoundException(
        apiError(ErrorCode.DOCUMENT_NOT_FOUND, 'Document was not found.'),
      );
    }

    return this.auditService.listForDocument({
      organizationId: membership.organization.id,
      documentId: document.id,
      query: input.query,
    });
  }

  async getById(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
  }) {
    const membership =
      await this.organizationsService.resolveActiveMembershipForUser({
        userId: input.user.id,
        organizationId: input.organizationId,
      });

    const document = await this.documentsRepository.findByIdForOrganization({
      documentId: input.documentId,
      organizationId: membership.organization.id,
    });

    if (!document) {
      throw new NotFoundException(
        apiError(ErrorCode.DOCUMENT_NOT_FOUND, 'Document was not found.'),
      );
    }

    return DocumentEntity.fromPrisma(document);
  }

  async createDownloadUrl(input: {
    user: AuthenticatedUser;
    organizationId?: string;
    documentId: string;
    variant: 'original' | 'completed';
  }): Promise<DocumentDownloadUrlEntity> {
    const membership =
      await this.organizationsService.resolveActiveMembershipForUser({
        userId: input.user.id,
        organizationId: input.organizationId,
      });

    const document =
      await this.documentsRepository.findStorageByIdForOrganization({
        documentId: input.documentId,
        organizationId: membership.organization.id,
      });

    if (!document) {
      throw new NotFoundException(
        apiError(ErrorCode.DOCUMENT_NOT_FOUND, 'Document was not found.'),
      );
    }

    const key =
      input.variant === 'completed'
        ? document.completedStorageKey
        : document.originalStorageKey;

    if (!key) {
      throw new NotFoundException(
        apiError(ErrorCode.DOCUMENT_NOT_FOUND, 'Document file was not found.'),
      );
    }

    const expiresInSeconds = 300;
    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();
    const url = await this.storageService.createSignedDownloadUrl({
      key,
      fileName: document.originalFileName,
      contentType: document.mimeType,
      expiresInSeconds,
    });

    return {
      url,
      variant: input.variant,
      expiresAt,
    };
  }

  private validateUploadedPdf(
    file: UploadedPdfFile | undefined,
  ): asserts file is UploadedPdfFile {
    if (!file) {
      throw new UnprocessableEntityException(
        apiError(ErrorCode.FILE_REQUIRED, 'PDF file is required.'),
      );
    }

    if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        apiError(ErrorCode.FILE_TOO_LARGE, 'PDF file must be 10MB or smaller.'),
      );
    }

    const hasPdfMime = file.mimetype === 'application/pdf';
    const hasPdfExtension = file.originalname.toLowerCase().endsWith('.pdf');

    if (!hasPdfMime && !hasPdfExtension) {
      throw new UnsupportedMediaTypeException(
        apiError(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          'Only PDF files are supported.',
        ),
      );
    }
  }

  private titleFromFileName(fileName: string): string {
    return (
      fileName
        .replace(/\.pdf$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim() || 'Untitled document'
    );
  }

  private buildOriginalStorageKey(input: {
    organizationId: string;
    documentId: string;
    fileName: string;
  }): string {
    return `organizations/${input.organizationId}/documents/${input.documentId}/original/${this.safeStorageFileName(input.fileName)}`;
  }

  private safeStorageFileName(fileName: string): string {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private encodeCursor(documentId: string): string {
    return Buffer.from(JSON.stringify({ id: documentId })).toString(
      'base64url',
    );
  }

  private decodeCursor(cursor: string): string {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      ) as { id?: string };

      if (!parsed.id) {
        throw new Error('Missing cursor id.');
      }

      return parsed.id;
    } catch {
      throw new UnprocessableEntityException(
        apiError(ErrorCode.VALIDATION_ERROR, 'Cursor is invalid.'),
      );
    }
  }
}
