import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database';
import { recipientApiSelect } from './recipients.select';

@Injectable()
export class RecipientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByDocumentId(documentId: string) {
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
  }) {
    return this.prisma.recipient.create({ data, select: recipientApiSelect });
  }

  findByIdForDocument(input: { recipientId: string; documentId: string }) {
    return this.prisma.recipient.findFirst({
      where: { id: input.recipientId, documentId: input.documentId },
      select: recipientApiSelect,
    });
  }

  update(input: {
    recipientId: string;
    name?: string;
    email?: string;
    signingOrder?: number;
  }) {
    return this.prisma.recipient.update({
      where: { id: input.recipientId },
      data: {
        name: input.name,
        email: input.email,
        signingOrder: input.signingOrder,
      },
      select: recipientApiSelect,
    });
  }

  delete(recipientId: string) {
    return this.prisma.recipient.delete({ where: { id: recipientId } });
  }
}
