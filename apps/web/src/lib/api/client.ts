export type ApiError = {
  code: string;
  message: string;
  status: number;
  requestId?: string;
  timestamp?: string;
  details?: Array<{ field?: string; issue: string }>;
};

export type ApiSuccess<TData> = {
  data: TData;
  meta?: Record<string, unknown>;
  pagination?: { limit: number; nextCursor: string | null; hasMore: boolean };
};

export class ApiClientError extends Error {
  readonly error: ApiError;
  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.error = error;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_TIMEOUT_MS = 20_000;

export async function apiRequest<TData>(
  path: string,
  init: RequestInit = {},
): Promise<ApiSuccess<TData>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      credentials: 'include',
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : undefined;

    if (!response.ok) {
      throw new ApiClientError(
        body?.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected API error occurred.',
          status: response.status,
          requestId: response.headers.get('X-Request-Id') ?? undefined,
          details: [],
        },
      );
    }

    return body as ApiSuccess<TData>;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiClientError({
        code: 'REQUEST_TIMEOUT',
        message: 'The request took too long. Please try again.',
        status: 408,
        details: [],
      });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
