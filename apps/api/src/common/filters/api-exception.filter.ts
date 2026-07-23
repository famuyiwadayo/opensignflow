/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type RequestWithRequestId = Request & {
  requestId?: string;
};

type ValidationLikeResponse = {
  code?: string;
  message?: string | string[];
  error?: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithRequestId>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const normalized = this.normalizeExceptionResponse(
      status,
      exceptionResponse,
    );

    response.status(status).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        status,
        requestId: request.requestId,
        timestamp: new Date().toISOString(),
        details: normalized.details,
      },
    });
  }

  private normalizeExceptionResponse(
    status: number,
    exceptionResponse: unknown,
  ) {
    const fallback = this.defaultCodeAndMessage(status);

    if (typeof exceptionResponse === 'string') {
      return {
        ...fallback,
        message: exceptionResponse,
        details: [],
      };
    }

    const value = exceptionResponse as ValidationLikeResponse | undefined;
    const message = value?.message;

    if (Array.isArray(message)) {
      return {
        code: status === 400 ? 'VALIDATION_ERROR' : fallback.code,
        message: 'One or more fields are invalid.',
        details: message.map((issue) => ({ issue })),
      };
    }

    return {
      code: value?.code ?? fallback.code,
      message: typeof message === 'string' ? message : fallback.message,
      details: [],
    };
  }

  private defaultCodeAndMessage(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return { code: 'BAD_REQUEST', message: 'The request is invalid.' };
      case HttpStatus.UNAUTHORIZED:
        return { code: 'UNAUTHORIZED', message: 'Authentication is required.' };
      case HttpStatus.FORBIDDEN:
        return {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        };
      case HttpStatus.NOT_FOUND:
        return {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Resource was not found.',
        };
      case HttpStatus.CONFLICT:
        return {
          code: 'CONFLICT',
          message: 'The request conflicts with the current resource state.',
        };
      case 422:
        return {
          code: 'VALIDATION_ERROR',
          message: 'One or more fields are invalid.',
        };
      case HttpStatus.TOO_MANY_REQUESTS:
        return {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        };
      default:
        return {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
        };
    }
  }
}
