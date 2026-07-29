import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class BulkAssignDocumentFieldsDto {
  @ApiProperty({ type: [String], example: ['fld_K9Ys4vF7gH6m2Qz2N8aBcD'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  fieldIds!: string[];

  @ApiProperty({ example: 'rcp_K9Ys4vF7gH6m2Qz2N8aBcD' })
  @IsString()
  @IsNotEmpty()
  recipientId!: string;
}
