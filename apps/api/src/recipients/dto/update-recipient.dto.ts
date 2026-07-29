import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { RecipientRole } from '@opensignflow/database';

export class UpdateRecipientDto {
  @ApiPropertyOptional({ example: 'Rear Admiral Grace Hopper', maxLength: 120 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'grace@example.com', maxLength: 320 })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;

  @ApiPropertyOptional({ enum: RecipientRole, default: RecipientRole.SIGNER })
  @IsOptional()
  @IsEnum(RecipientRole)
  role?: RecipientRole = RecipientRole.SIGNER;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  signingOrder?: number;
}
