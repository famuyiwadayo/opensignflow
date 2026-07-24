import type { ErrorCode } from './error-code';

export type ApiErrorDetail = {
  field?: string;
  issue: string;
};

export type ApiErrorPayload = {
  code: ErrorCode;
  message: string;
  details?: ApiErrorDetail[];
};

export function apiError(
  code: ErrorCode,
  message: string,
  details: ApiErrorDetail[] = [],
): ApiErrorPayload {
  return {
    code,
    message,
    details,
  };
}
