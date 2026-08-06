import {
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards';
import {
  ApiCreatedDataResponse,
  ApiOkDataResponse,
  CurrentUser,
  ValidatedBody,
  type AuthenticatedUser,
} from '@/common';
import {
  BulkAssignDocumentFieldsDto,
  CreateDocumentFieldDto,
  UpdateDocumentFieldDto,
} from './dto';
import { DocumentFieldEntity } from './entities';
import { DocumentFieldsService } from './document-fields.service';

@ApiTags('document-fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/documents/:documentId/fields')
export class DocumentFieldsController {
  constructor(
    @Inject(DocumentFieldsService)
    private readonly fieldsService: DocumentFieldsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List fields for a document' })
  @ApiOkDataResponse(DocumentFieldEntity, { isArray: true })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
  ) {
    return this.fieldsService.list({ user, organizationId, documentId });
  }

  @Post()
  @ApiOperation({ summary: 'Create a field on a draft document' })
  @ApiCreatedDataResponse(DocumentFieldEntity)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @ValidatedBody(CreateDocumentFieldDto) dto: CreateDocumentFieldDto,
    @Req() request: Request,
  ) {
    return {
      data: await this.fieldsService.create({
        user,
        organizationId,
        documentId,
        dto,
        context: this.context(request),
      }),
    };
  }

  @Patch('bulk-assignment')
  @ApiOperation({
    summary: 'Assign multiple draft-document fields to one signer',
  })
  @ApiOkDataResponse(DocumentFieldEntity, { isArray: true })
  async bulkAssign(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @ValidatedBody(BulkAssignDocumentFieldsDto)
    dto: BulkAssignDocumentFieldsDto,
    @Req() request: Request,
  ) {
    return this.fieldsService.bulkAssign({
      user,
      organizationId,
      documentId,
      dto,
      context: this.context(request),
    });
  }

  @Patch(':fieldId')
  @ApiOperation({ summary: 'Update a field on a draft document' })
  @ApiOkDataResponse(DocumentFieldEntity)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Param('fieldId') fieldId: string,
    @ValidatedBody(UpdateDocumentFieldDto) dto: UpdateDocumentFieldDto,
    @Req() request: Request,
  ) {
    return {
      data: await this.fieldsService.update({
        user,
        organizationId,
        documentId,
        fieldId,
        dto,
        context: this.context(request),
      }),
    };
  }

  @Delete(':fieldId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a field from a draft document' })
  @ApiNoContentResponse({ description: 'Field deleted.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Param('fieldId') fieldId: string,
    @Req() request: Request,
  ) {
    await this.fieldsService.remove({
      user,
      organizationId,
      documentId,
      fieldId,
      context: this.context(request),
    });
  }

  private context(request: Request) {
    return { ipAddress: request.ip, userAgent: request.header('user-agent') };
  }
}
