import { Inject, Injectable } from '@nestjs/common';
import type { OutboxEventType } from '@opensignflow/database';

import { PdfFinalizationOutboxHandler, SigningEmailOutboxHandler } from './handlers';
import type { OutboxEventHandler } from './outbox-handler.interface';

@Injectable()
export class OutboxHandlerRegistry {
  private readonly handlers = new Map<OutboxEventType, OutboxEventHandler<unknown>>();

  constructor(
    @Inject(SigningEmailOutboxHandler) signingEmail: SigningEmailOutboxHandler,
    @Inject(PdfFinalizationOutboxHandler) pdfFinalization: PdfFinalizationOutboxHandler,
  ) {
    this.register(signingEmail);
    this.register(pdfFinalization);
  }

  get(type: OutboxEventType) {
    return this.handlers.get(type);
  }

  private register(handler: OutboxEventHandler<unknown>) {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Duplicate outbox handler: ${handler.type}`);
    }
    this.handlers.set(handler.type, handler);
  }
}
