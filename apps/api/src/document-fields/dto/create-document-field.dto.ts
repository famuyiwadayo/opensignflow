import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DocumentFieldType } from '~/prisma/generated/enums';

export class CreateDocumentFieldDto {
  @ApiProperty({ example: 'rcp_K9Ys4vF7gH6m2Qz2N8aBcD' })
  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @ApiProperty({
    enum: DocumentFieldType,
    example: DocumentFieldType.SIGNATURE,
  })
  @IsEnum(DocumentFieldType)
  type!: DocumentFieldType;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber!: number;

  @ApiProperty({ example: 0.64, minimum: 0, maximum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  x!: number;

  @ApiProperty({ example: 0.78, minimum: 0, maximum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  y!: number;

  @ApiProperty({ example: 0.22, minimum: 0.000001, maximum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @Max(1)
  width!: number;

  @ApiProperty({ example: 0.06, minimum: 0.000001, maximum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  @Max(1)
  height!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  required?: boolean = true;

  @ApiPropertyOptional({ example: 'Client signature', maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ example: 'Sign here', maxLength: 120 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  placeholder?: string;

  @ApiPropertyOptional({ example: '2026-07-24', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultValue?: string;
}
