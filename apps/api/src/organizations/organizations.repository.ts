import { IdGeneratorService } from '@/common';
import { PrismaService } from '@/database';
import { Inject, Injectable } from '@nestjs/common';

import type { OrganizationMembershipRecord } from './organizations.select';
import { organizationMembershipSelect } from './organizations.select';
import type { Prisma } from '@opensignflow/database';
import {
  OrganizationRole,
  PlanCode,
  SubscriptionStatus,
} from '@opensignflow/database';

type PrismaWriter = PrismaService | Prisma.TransactionClient;

@Injectable()
export class OrganizationsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(IdGeneratorService)
    private readonly idGenerator: IdGeneratorService,
  ) {}

  async createPersonalOrganizationForUser(
    input: { userId: string; name: string },
    client: PrismaWriter = this.prisma,
  ) {
    const org = await client.organization.create({
      data: {
        id: this.idGenerator.generate('organization'),
        name: input.name,
        members: {
          create: {
            id: this.idGenerator.generate('organizationMember'),
            userId: input.userId,
            role: OrganizationRole.OWNER,
          },
        },
        subscriptions: {
          create: {
            id: this.idGenerator.generate('subscription'),
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

  listMembershipsForUser(
    userId: string,
  ): Promise<OrganizationMembershipRecord[]> {
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
