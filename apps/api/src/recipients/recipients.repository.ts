import { Injectable } from '@nestjs/common';

import { RecipientRole } from '@opensignflow/database';

import { PrismaService } from '@/database';
import { RecipientApiRecord, recipientApiSelect } from './recipients.select';

@Injectable()
export class RecipientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByDocumentId(documentId: string): Promise<RecipientApiRecord[]> {
    return this.prisma.recipient.findMany({
      where: { documentId },
      select: recipientApiSelect,
      orderBy: [{ signingOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  create(data: {
    id: string;
    documentId: string;
    name: string;
    email: string;
    signingOrder: number;
    role: RecipientRole;
  }): Promise<RecipientApiRecord> {
    return this.prisma.recipient.create({ data, select: recipientApiSelect });
  }

  findByIdForDocument(input: {
    recipientId: string;
    documentId: string;
  }): Promise<RecipientApiRecord | null> {
    return this.prisma.recipient.findFirst({
      where: { id: input.recipientId, documentId: input.documentId },
      select: recipientApiSelect,
    });
  }

  countFieldsForRecipient(input: {
    recipientId: string;
    documentId: string;
  }): Promise<number> {
    return this.prisma.documentField.count({
      where: { recipientId: input.recipientId, documentId: input.documentId },
    });
  }

  update(input: {
    recipientId: string;
    name?: string;
    email?: string;
    signingOrder?: number;
    role?: RecipientRole;
  }): Promise<RecipientApiRecord> {
    return this.prisma.recipient.update({
      where: { id: input.recipientId },
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        signingOrder: input.signingOrder,
      },
      select: recipientApiSelect,
    });
  }

  delete(recipientId: string): Promise<RecipientApiRecord> {
    return this.prisma.recipient.delete({ where: { id: recipientId } });
  }
}
