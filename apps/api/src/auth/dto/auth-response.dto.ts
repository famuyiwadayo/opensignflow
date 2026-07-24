import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '@/users';
import { OrganizationMembershipEntity } from '@/organizations';

export class AuthResponseDto {
  @ApiProperty({ type: UserEntity })
  user!: UserEntity;

  @ApiProperty({ type: OrganizationMembershipEntity, isArray: true })
  organizations!: OrganizationMembershipEntity[];

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;
}
