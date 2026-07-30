import type { ArgumentsHost, ExceptionFilter} from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

import { ErrorCode, type ApiErrorDetail, type ErrorCode as ErrorCodeType } from '../errors';

type RequestWithRequestId = Request & {
  requestId?: string;
};

type ExceptionResponseBody = {
  code?: ErrorCodeType;
  message?: string | string[];
  error?: string;
  details?: ApiErrorDetail[];
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithRequestId>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined;
    const normalized = this.normalizeExceptionResponse(status, exceptionResponse);

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

  private normalizeExceptionResponse(status: number, exceptionResponse: unknown) {
    const fallback = this.defaultCodeAndMessage(status);

    if (typeof exceptionResponse === 'string') {
      return {
        ...fallback,
        message: exceptionResponse,
        details: [],
      };
    }

    const value = exceptionResponse as ExceptionResponseBody | undefined;
    const message = value?.message;

    if (Array.isArray(message)) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'One or more fields are invalid.',
        details: message.map((issue) => ({ issue })),
      };
    }

    return {
      code: value?.code ?? fallback.code,
      message: typeof message === 'string' ? message : fallback.message,
      details: value?.details ?? [],
    };
  }

  private defaultCodeAndMessage(status: number): { code: ErrorCodeType; message: string } {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return { code: ErrorCode.BAD_REQUEST, message: 'The request is invalid.' };
      case HttpStatus.UNAUTHORIZED:
        return { code: ErrorCode.UNAUTHORIZED, message: 'Authentication is required.' };
      case HttpStatus.FORBIDDEN:
        return { code: ErrorCode.FORBIDDEN, message: 'You do not have permission to perform this action.' };
      case HttpStatus.NOT_FOUND:
        return { code: ErrorCode.RESOURCE_NOT_FOUND, message: 'Resource was not found.' };
      case HttpStatus.CONFLICT:
        return { code: ErrorCode.CONFLICT, message: 'The request conflicts with the current resource state.' };
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return { code: ErrorCode.FILE_TOO_LARGE, message: 'Uploaded file is too large.' };
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return { code: ErrorCode.UNSUPPORTED_FILE_TYPE, message: 'Unsupported media type.' };
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return { code: ErrorCode.VALIDATION_ERROR, message: 'One or more fields are invalid.' };
      case HttpStatus.TOO_MANY_REQUESTS:
        return { code: ErrorCode.RATE_LIMITED, message: 'Too many requests. Please try again later.' };
      case HttpStatus.SERVICE_UNAVAILABLE:
        return { code: ErrorCode.SERVICE_UNAVAILABLE, message: 'Service is temporarily unavailable.' };
      default:
        return { code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'An unexpected error occurred.' };
    }
  }
}
