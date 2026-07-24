import { IdGeneratorService } from '@/common';
import { PrismaService } from '@/database';
import { Injectable } from '@nestjs/common';
import {
  OrganizationRole,
  PlanCode,
  Prisma,
  SubscriptionStatus,
} from '~/prisma/generated/client';
import { organizationMembershipSelect } from './organizations.select';

type PrismaWriter = PrismaService | Prisma.TransactionClient;

@Injectable()
export class OrganizationsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  async createPersonalOrganizationForUser(
    input: { userId: string; name: string },
    client: PrismaWriter = this.prisma,
  ) {
    const org = await client.organization.create({
      data: {
        id: this.idGenerator.generate('org'),
        name: input.name,
        members: {
          create: {
            id: this.idGenerator.generate('mem'),
            userId: input.userId,
            role: OrganizationRole.OWNER,
          },
        },
        subscriptions: {
          create: {
            id: this.idGenerator.generate('subsc'),
            planCode: PlanCode.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
        },
      },
      select: { id: true },
    });

    return client.organizationMember.findUniqueOrThrow({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: input.userId,
        },
      },
      select: organizationMembershipSelect,
    });
  }

  listMembershipsForUser(userId: string) {
    return this.prisma.organizationMember.findMany({
      where: { userId },
      select: organizationMembershipSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findMembershipForUser(input: { userId: string; organizationId: string }) {
    return this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
      select: organizationMembershipSelect,
    });
  }
}
