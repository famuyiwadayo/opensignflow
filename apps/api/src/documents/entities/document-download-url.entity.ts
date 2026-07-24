import { ApiProperty } from '@nestjs/swagger';

export class DocumentDownloadUrlEntity {
  @ApiProperty({ example: 'https://storage.example.com/signed-url' })
  url!: string;

  @ApiProperty({ example: 'original' })
  variant!: 'original' | 'completed';

  @ApiProperty({ example: '2026-07-24T12:05:00.000Z' })
  expiresAt!: string;
}
