import { ApiProperty } from '@nestjs/swagger';

import type { UserPublicRecord } from '../users.select';

export class UserEntity {
  @ApiProperty({ example: 'usr_K9Ys4vF7gH6m2Qz2N8aBcD' })
  id!: string;

  @ApiProperty({ example: 'dayo@example.com' })
  email!: string;

  @ApiProperty({ example: 'Dayo Daniel', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-23T12:00:00.000Z' })
  updatedAt!: string;

  static fromPrisma(user: UserPublicRecord): UserEntity {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
