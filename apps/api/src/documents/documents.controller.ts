import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Headers,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { memoryStorage } from 'multer';

import { ListAuditEventsQueryDto } from '@/audit';
import { AuditEventEntity } from '@/audit';
import { JwtAuthGuard } from '@/auth/guards';
import {
  ApiCreatedDataResponse,
  ApiOkDataResponse,
  ApiPaginatedDataResponse,
  CurrentUser,
  ValidatedBody,
  ValidatedQuery,
  type AuthenticatedUser,
} from '@/common';
import { ListDocumentsQueryDto } from './dto';
import { CreateDocumentDto } from './dto';
import { DocumentDownloadUrlEntity, DocumentEntity } from './entities';
import { DocumentsService } from './documents.service';
import type { UploadedPdfFile } from './documents.service';
import { StorageService } from '@/storage';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/documents')
export class DocumentsController {
  constructor(
    @Inject(DocumentsService)
    private readonly documentsService: DocumentsService,
    @Inject(StorageService)
    private readonly storage: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List documents for the active organization' })
  @ApiPaginatedDataResponse(DocumentEntity)
  async listDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @ValidatedQuery(ListDocumentsQueryDto) query: ListDocumentsQueryDto,
  ) {
    return this.documentsService.list({ user, organizationId, query });
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft document by uploading a PDF' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Service Agreement' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiCreatedDataResponse(DocumentEntity)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async createDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @ValidatedBody(CreateDocumentDto) dto: CreateDocumentDto,
    @UploadedFile() file: UploadedPdfFile | undefined,
    @Req() request: Request,
  ) {
    const document = await this.documentsService.create({
      user,
      organizationId,
      dto,
      file,
      context: {
        ipAddress: request.ip,
        userAgent: request.header('user-agent'),
      },
    });

    return {
      data: document,
    };
  }

  @Get(':documentId/audit-events')
  @ApiOperation({ summary: 'List audit events for a document' })
  @ApiPaginatedDataResponse(AuditEventEntity)
  async listAuditEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @ValidatedQuery(ListAuditEventsQueryDto) query: ListAuditEventsQueryDto,
  ) {
    return this.documentsService.listAuditEvents({
      user,
      organizationId,
      documentId,
      query,
    });
  }

  @Get(':documentId/preview')
  @Header('Cache-Control', 'private, no-store')
  async previewOriginal(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Res() response: Response,
  ) {
    const document = await this.documentsService.getOriginalForPreview({
      user,
      organizationId,
      documentId,
    });
    const bytes = await this.storage.getObjectBytes(document.key);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName.replace(/["\\\r\n]/g, '_')}"`,
    );
    response.send(Buffer.from(bytes));
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document details' })
  @ApiOkDataResponse(DocumentEntity)
  async getDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
  ) {
    return {
      data: await this.documentsService.getById({
        user,
        organizationId,
        documentId,
      }),
    };
  }

  @Get(':documentId/download-url')
  @Header('Cache-Control', 'no-store, private')
  @ApiOperation({
    summary: 'Create a short-lived signed document download URL',
  })
  @ApiOkDataResponse(DocumentDownloadUrlEntity)
  async createDownloadUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Query('variant') variant: string | undefined,
    @Query('disposition') disposition: string | undefined,
  ) {
    if (variant && variant !== 'original' && variant !== 'completed') {
      throw new BadRequestException('Download variant is invalid.');
    }
    if (
      disposition &&
      disposition !== 'attachment' &&
      disposition !== 'inline'
    ) {
      throw new BadRequestException('Download disposition is invalid.');
    }

    return {
      data: await this.documentsService.createDownloadUrl({
        user,
        organizationId,
        documentId,
        variant: variant === 'completed' ? 'completed' : 'original',
        disposition: disposition === 'inline' ? 'inline' : 'attachment',
      }),
    };
  }
}
