import { randomUUID } from 'node:crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

type RequestWithRequestId = Request & {
  requestId?: string;
};

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_\-:.]{8,120}$/;

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithRequestId, res: Response, next: NextFunction) {
    const incomingRequestId = req.header('x-request-id');
    const requestId =
      incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
        ? incomingRequestId
        : `req_${randomUUID()}`;

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
