import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '~/prisma/generated/enums';

import { OrganizationEntity } from './organization.entity';
import type { OrganizationMembershipRecord } from '../organizations.select';

export class OrganizationMembershipEntity {
  @ApiProperty({ example: 'mem_K9Ys4vF7gH6m2Qz2N8aBcD' })
  id!: string;

  @ApiProperty({ enum: OrganizationRole, example: OrganizationRole.OWNER })
  role!: OrganizationRole;

  @ApiProperty({ type: OrganizationEntity })
  organization!: OrganizationEntity;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  updatedAt!: string;

  static fromPrisma(
    membership: OrganizationMembershipRecord,
  ): OrganizationMembershipEntity {
    return {
      id: membership.id,
      role: membership.role,
      organization: OrganizationEntity.fromPrisma(membership.organization),
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString(),
    };
  }
}
