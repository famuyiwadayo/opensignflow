import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class DownloadUrlQueryDto {
  @ApiPropertyOptional({ enum: ['original', 'completed'], default: 'original' })
  @IsOptional()
  @IsIn(['original', 'completed'])
  variant?: 'original' | 'completed' = 'original';

  @ApiPropertyOptional({
    enum: ['attachment', 'inline'],
    default: 'attachment',
  })
  @IsOptional()
  @IsIn(['attachment', 'inline'])
  disposition?: 'attachment' | 'inline' = 'attachment';
}
