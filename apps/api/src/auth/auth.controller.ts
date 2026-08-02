import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import {
  ApiCreatedDataResponse,
  ApiOkDataResponse,
  CurrentUser,
  ValidatedBody,
} from '@/common';
import { JwtAuthGuard } from './guards';
import type { AuthenticatedUser, RequestContext } from '@/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MeResponseDto } from './dto/me-response.dto';

const REFRESH_COOKIE_NAME = 'opensignflow_refresh_token';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user and default personal workspace',
  })
  @ApiCreatedDataResponse(AuthResponseDto)
  async register(
    @ValidatedBody(RegisterDto) dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(
      dto,
      this.requestContext(request),
    );
    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return {
      data: result.response,
    };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate a user' })
  @ApiOkDataResponse(AuthResponseDto)
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(
    @ValidatedBody(LoginDto) dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(
      dto,
      this.requestContext(request),
    );
    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return {
      data: result.response,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Refresh the current access token using the refresh cookie',
  })
  @ApiOkDataResponse(AuthResponseDto)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refresh(
      request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
      this.requestContext(request),
    );
    this.setRefreshCookie(
      response,
      result.refreshToken,
      result.refreshTokenExpiresAt,
    );

    return {
      data: result.response,
    };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log out and revoke the current refresh session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(
      request.cookies?.[REFRESH_COOKIE_NAME] as string | undefined,
    );
    this.clearRefreshCookie(response);

    return {
      data: {
        success: true,
      },
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current authenticated user' })
  @ApiOkDataResponse(MeResponseDto)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return {
      data: await this.authService.me(user.id),
    };
  }

  private requestContext(request: Request): RequestContext {
    return {
      ipAddress: request.ip,
      userAgent: request.header('user-agent'),
    };
  }

  private setRefreshCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/v1/auth',
      expires: expiresAt,
    });
  }

  private clearRefreshCookie(response: Response) {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/v1/auth',
    });
  }
}
