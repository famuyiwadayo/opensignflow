import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '@/users';
import { OrganizationMembershipEntity } from '@/organizations';

export class MeResponseDto {
  @ApiProperty({ type: UserEntity })
  user!: UserEntity;

  @ApiProperty({ type: OrganizationMembershipEntity, isArray: true })
  organizations!: OrganizationMembershipEntity[];
}
