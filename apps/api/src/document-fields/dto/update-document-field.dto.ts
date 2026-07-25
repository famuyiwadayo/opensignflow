import { PartialType } from '@nestjs/swagger';
import { CreateDocumentFieldDto } from './create-document-field.dto';

export class UpdateDocumentFieldDto extends PartialType(
  CreateDocumentFieldDto,
) {}
