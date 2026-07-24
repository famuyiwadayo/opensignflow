import { ApiProperty } from '@nestjs/swagger';

import type { OrganizationPublicRecord } from '../organizations.select';

export class OrganizationEntity {
  @ApiProperty({ example: 'org_K9Ys4vF7gH6m2Qz2N8aBcD' })
  id!: string;

  @ApiProperty({ example: "Dayo's Workspace" })
  name!: string;

  @ApiProperty({ example: 'dayos-workspace', nullable: true })
  slug!: string | null;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  updatedAt!: string;

  static fromPrisma(
    organization: OrganizationPublicRecord,
  ): OrganizationEntity {
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    };
  }
}
