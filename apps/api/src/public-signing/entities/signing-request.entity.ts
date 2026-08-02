import { ApiProperty } from '@nestjs/swagger';
import {
  DocumentFieldType,
  SigningRequestStatus,
} from '@opensignflow/database';

export class PublicSigningFieldEntity {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: DocumentFieldType }) type!: DocumentFieldType;
  @ApiProperty() pageNumber!: number;
  @ApiProperty() x!: number;
  @ApiProperty() y!: number;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
  @ApiProperty() required!: boolean;
  @ApiProperty({ nullable: true }) label!: string | null;
  @ApiProperty({ nullable: true }) placeholder!: string | null;
}

export class PublicSigningRequestEntity {
  @ApiProperty() documentTitle!: string;
  @ApiProperty() originalFileName!: string;
  @ApiProperty({ nullable: true }) pageCount!: number | null;
  @ApiProperty() recipientName!: string;
  @ApiProperty() recipientEmail!: string;
  @ApiProperty({ enum: SigningRequestStatus }) status!: SigningRequestStatus;
  @ApiProperty() expiresAt!: string;
  @ApiProperty({ type: [PublicSigningFieldEntity] })
  fields!: PublicSigningFieldEntity[];
}
