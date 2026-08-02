import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class SubmitSigningFieldValueDto {
  @ApiProperty() @IsString() @IsNotEmpty() fieldId!: string;
  @ApiProperty({ type: 'object', additionalProperties: true }) value!: unknown;
}
export class SubmitSigningRequestDto {
  @ApiProperty({ type: [SubmitSigningFieldValueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((item: SubmitSigningFieldValueDto) => item.fieldId)
  values!: SubmitSigningFieldValueDto[];
}
