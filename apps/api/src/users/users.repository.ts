import { PrismaService } from '@/database';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@opensignflow/database';
import { userAuthSelect, userPublicSelect } from './users.select';

type PrismaWriter = PrismaService | Prisma.TransactionClient;

export type CreateUserData = {
  id: string;
  email: string;
  normalizedEmail: string;
  name?: string | null;
  passwordHash: string;
};

@Injectable()
export class UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(data: CreateUserData, client: PrismaWriter = this.prisma) {
    return client.user.create({
      data,
      select: userPublicSelect,
    });
  }

  findPublicById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  }

  findByNormalizedEmailForAuth(normalizedEmail: string) {
    return this.prisma.user.findUnique({
      where: { normalizedEmail },
      select: userAuthSelect,
    });
  }

  existsByNormalizedEmail(normalizedEmail: string) {
    return this.prisma.user.findUnique({
      where: { normalizedEmail },
      select: { id: true },
    });
  }
}
