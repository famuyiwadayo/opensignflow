import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecipientRole } from '@opensignflow/database';
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

export class CreateRecipientDto {
  @ApiProperty({ example: 'Grace Hopper', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'grace@example.com', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({ enum: RecipientRole, default: RecipientRole.SIGNER })
  @IsOptional()
  @IsEnum(RecipientRole)
  role?: RecipientRole = RecipientRole.SIGNER;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  signingOrder?: number = 1;
}
