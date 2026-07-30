import { Injectable, NotFoundException } from '@nestjs/common';
import type { UsersRepository } from './users.repository';
import type { IdGeneratorService } from '@/common';
import { apiError, ErrorCode } from '@/common';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findPublicByIdOrThrow(id: string) {
    const user = await this.usersRepo.findPublicById(id);

    if (!user) {
      throw new NotFoundException(
        apiError(ErrorCode.USER_NOT_FOUND, 'User was not found'),
      );
    }

    return user;
  }

  createUserId(): string {
    return this.idGenerator.generate('user');
  }
}
