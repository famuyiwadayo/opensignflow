export type CursorPagination = {
  limit: number;
  nextCursor: string | null;
  hasMore: boolean;
};

export type ApiSuccess<TData> = {
  data: TData;
  meta?: Record<string, unknown>;
};

export type ApiListSuccess<TData> = {
  data: TData[];
  pagination: CursorPagination;
  meta?: Record<string, unknown>;
};

export type ApiAccepted<TData> = {
  data: TData;
  meta: {
    pollUrl?: string;
    [key: string]: unknown;
  };
};

export type ApiErrorDetail = {
  field?: string;
  issue: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    timestamp: string;
    details: ApiErrorDetail[];
  };
};
