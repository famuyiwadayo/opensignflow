import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiOkDataResponse, ValidatedBody } from '../common';
import { SubmitSigningRequestDto } from './dto';
import { PublicSigningRequestEntity } from './entities/signing-request.entity';
import { PublicSigningService } from './public-signing.service';

@ApiTags('public-signing')
@Controller('v1/signing-requests')
export class PublicSigningController {
  constructor(
    @Inject(PublicSigningService)
    private readonly signing: PublicSigningService,
  ) {}

  @Post(':token/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('token') token: string,
    @ValidatedBody(SubmitSigningRequestDto) dto: SubmitSigningRequestDto,
    @Req() request: Request,
  ) {
    return {
      data: await this.signing.submit(token, dto, {
        ipAddress: request.ip,
        userAgent: request.header('user-agent'),
      }),
    };
  }

  @Get(':token/preview')
  @Header('Cache-Control', 'private, no-store')
  async preview(@Param('token') token: string, @Res() response: Response) {
    const document = await this.signing.getDocumentPreview(token);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${document.fileName.replace(/["\\\r\n]/g, '_')}"`,
    );
    response.send(Buffer.from(document.bytes));
  }

  @Get(':token/document-url')
  @Header('Cache-Control', 'no-store, private')
  async documentUrl(@Param('token') token: string) {
    return { data: await this.signing.createDocumentUrl(token) };
  }

  @Get(':token')
  @ApiOperation({
    summary: 'Get public signing request details for a valid signing token',
  })
  @ApiOkDataResponse(PublicSigningRequestEntity)
  async getByToken(@Param('token') token: string, @Req() request: Request) {
    return {
      data: await this.signing.getByToken(token, {
        ipAddress: request.ip,
        userAgent: request.header('user-agent'),
      }),
    };
  }
}
