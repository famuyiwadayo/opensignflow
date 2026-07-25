import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database';
import { documentFieldApiSelect } from './document-fields.select';
import { Prisma } from '~/prisma/generated/client';

export type DocumentFieldWriteData = {
  id?: string;
  documentId?: string;
  recipientId?: string | null;
  type?: Prisma.DocumentFieldCreateInput['type'];
  pageNumber?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  required?: boolean;
  label?: string | null;
  placeholder?: string | null;
  defaultValue?: string | null;
};

type CreateDocumentFieldInput = Required<
  Pick<
    DocumentFieldWriteData,
    | 'id'
    | 'documentId'
    | 'recipientId'
    | 'type'
    | 'pageNumber'
    | 'x'
    | 'y'
    | 'width'
    | 'height'
    | 'required'
  >
> &
  DocumentFieldWriteData;

@Injectable()
export class DocumentFieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByDocumentId(documentId: string) {
    return this.prisma.documentField.findMany({
      where: { documentId },
      select: documentFieldApiSelect,
      orderBy: [{ pageNumber: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  create(data: CreateDocumentFieldInput) {
    return this.prisma.documentField.create({
      data,
      select: documentFieldApiSelect,
    });
  }

  findByIdForDocument(input: { fieldId: string; documentId: string }) {
    return this.prisma.documentField.findFirst({
      where: { id: input.fieldId, documentId: input.documentId },
      select: documentFieldApiSelect,
    });
  }

  update(fieldId: string, data: DocumentFieldWriteData) {
    return this.prisma.documentField.update({
      where: { id: fieldId },
      data,
      select: documentFieldApiSelect,
    });
  }

  delete(fieldId: string) {
    return this.prisma.documentField.delete({ where: { id: fieldId } });
  }
}
