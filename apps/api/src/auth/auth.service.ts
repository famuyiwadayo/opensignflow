import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  apiError,
  ErrorCode,
  IdGeneratorService,
  RequestContext,
} from '@/common';
import { PrismaService } from '@/database';
import {
  OrganizationMembershipEntity,
  OrganizationsRepository,
  OrganizationsService,
} from '@/organizations';
import { UserEntity, UsersRepository, UsersService } from '@/users';
import type {
  AuthResponseDto,
  LoginDto,
  MeResponseDto,
  RegisterDto,
} from './dto';
import { PasswordService } from './password.service';
import { RefreshSessionService } from './refresh-session.service';
import { TokenService } from './token.service';

type AuthResult = {
  response: AuthResponseDto;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly organizationsService: OrganizationsService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly refreshSessionService: RefreshSessionService,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  async register(
    dto: RegisterDto,
    context: RequestContext,
  ): Promise<AuthResult> {
    const normalizedEmail = this.usersService.normalizeEmail(dto.email);
    const existingUser =
      await this.usersRepository.existsByNormalizedEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictException(
        apiError(
          ErrorCode.EMAIL_ALREADY_REGISTERED,
          'An account with this email already exists.',
        ),
      );
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const { user, organizations } = await this.prisma.$transaction(
      async (tx) => {
        const createdUser = await this.usersRepository.create(
          {
            id: this.idGenerator.generate('usr'),
            email: dto.email.trim(),
            normalizedEmail,
            name: dto.name.trim(),
            passwordHash,
          },
          tx,
        );

        const membership =
          await this.organizationsRepository.createPersonalOrganizationForUser(
            {
              userId: createdUser.id,
              name: this.organizationsService.createPersonalWorkspaceName({
                name: createdUser.name,
                email: createdUser.email,
              }),
            },
            tx,
          );

        return {
          user: createdUser,
          organizations: [membership],
        };
      },
    );

    const refreshSession = await this.refreshSessionService.create(
      user.id,
      context,
    );

    return {
      response: {
        user: UserEntity.fromPrisma(user),
        organizations: organizations.map(
          OrganizationMembershipEntity.fromPrisma,
        ),
        accessToken: this.tokenService.signAccessToken({
          sub: user.id,
          email: user.email,
        }),
      },
      refreshToken: refreshSession.token,
      refreshTokenExpiresAt: refreshSession.expiresAt,
    };
  }

  async login(dto: LoginDto, context: RequestContext): Promise<AuthResult> {
    const normalizedEmail = this.usersService.normalizeEmail(dto.email);
    const user =
      await this.usersRepository.findByNormalizedEmailForAuth(normalizedEmail);

    if (!user?.passwordHash) {
      throw this.invalidCredentials();
    }

    const passwordMatches = await this.passwordService.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw this.invalidCredentials();
    }

    const memberships = await this.organizationsService.listMembershipsForUser(
      user.id,
    );
    const refreshSession = await this.refreshSessionService.create(
      user.id,
      context,
    );

    return {
      response: {
        user: UserEntity.fromPrisma(user),
        organizations: memberships.map(OrganizationMembershipEntity.fromPrisma),
        accessToken: this.tokenService.signAccessToken({
          sub: user.id,
          email: user.email,
        }),
      },
      refreshToken: refreshSession.token,
      refreshTokenExpiresAt: refreshSession.expiresAt,
    };
  }

  async refresh(
    refreshToken: string | undefined,
    context: RequestContext,
  ): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException(
        apiError(
          ErrorCode.REFRESH_TOKEN_REQUIRED,
          'Refresh token is required.',
        ),
      );
    }

    const rotated = await this.refreshSessionService.rotate(
      refreshToken,
      context,
    );
    const memberships = await this.organizationsService.listMembershipsForUser(
      rotated.user.id,
    );

    return {
      response: {
        user: UserEntity.fromPrisma(rotated.user),
        organizations: memberships.map(OrganizationMembershipEntity.fromPrisma),
        accessToken: this.tokenService.signAccessToken({
          sub: rotated.user.id,
          email: rotated.user.email,
        }),
      },
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresAt: rotated.refreshTokenExpiresAt,
    };
  }

  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.usersService.findPublicByIdOrThrow(userId);
    const memberships = await this.organizationsService.listMembershipsForUser(
      user.id,
    );

    return {
      user: UserEntity.fromPrisma(user),
      organizations: memberships.map(OrganizationMembershipEntity.fromPrisma),
    };
  }

  async logout(refreshToken: string | undefined) {
    await this.refreshSessionService.revoke(refreshToken);
  }

  private invalidCredentials() {
    return new UnauthorizedException(
      apiError(
        ErrorCode.INVALID_CREDENTIALS,
        'Email or password is incorrect.',
      ),
    );
  }
}
