import {
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '@/auth/guards';
import {
  ApiOkDataResponse,
  CurrentUser,
  type AuthenticatedUser,
} from '@/common';
import { DocumentEntity } from '@/documents';
import type { SigningService } from './signing.service';

@ApiTags('signing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/documents')
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Post(':documentId/send')
  @ApiOperation({ summary: 'Send a draft document for signing' })
  @ApiOkDataResponse(DocumentEntity)
  async send(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Param('documentId') documentId: string,
    @Req() request: Request,
  ) {
    return {
      data: await this.signingService.send({
        user,
        organizationId,
        documentId,
        context: {
          ipAddress: request.ip,
          userAgent: request.header('user-agent'),
        },
      }),
    };
  }
}
