import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
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

import { JwtAuthGuard } from '@/auth/guards';
import {
  ApiCreatedDataResponse,
  ApiOkDataResponse,
  CurrentUser,
  type AuthenticatedUser,
} from '@/common';
import { CreateRecipientDto, UpdateRecipientDto } from './dto';
import { RecipientEntity } from './entities';
import { RecipientsService } from './recipients.service';

@ApiTags('recipients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/documents/:documentId/recipients')
export class RecipientsController {
  constructor(private readonly recipientsService: RecipientsService) {}

  @Get()
  @ApiOperation({ summary: 'List recipients for a document' })
  @ApiOkDataResponse(RecipientEntity, { isArray: true })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
  ) {
    return this.recipientsService.list({ user, organizationId, documentId });
  }

  @Post()
  @ApiOperation({ summary: 'Add a recipient to a draft document' })
  @ApiCreatedDataResponse(RecipientEntity)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Body() dto: CreateRecipientDto,
    @Req() request: Request,
  ) {
    return {
      data: await this.recipientsService.create({
        user,
        organizationId,
        documentId,
        dto,
        context: this.context(request),
      }),
    };
  }

  @Patch(':recipientId')
  @ApiOperation({ summary: 'Update a recipient on a draft document' })
  @ApiOkDataResponse(RecipientEntity)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Param('recipientId') recipientId: string,
    @Body() dto: UpdateRecipientDto,
    @Req() request: Request,
  ) {
    return {
      data: await this.recipientsService.update({
        user,
        organizationId,
        documentId,
        recipientId,
        dto,
        context: this.context(request),
      }),
    };
  }

  @Delete(':recipientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a recipient from a draft document' })
  @ApiNoContentResponse({ description: 'Recipient removed.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Param('recipientId') recipientId: string,
    @Req() request: Request,
  ) {
    await this.recipientsService.remove({
      user,
      organizationId,
      documentId,
      recipientId,
      context: this.context(request),
    });
  }

  private context(request: Request) {
    return { ipAddress: request.ip, userAgent: request.header('user-agent') };
  }
}
