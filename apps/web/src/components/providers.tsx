'use client';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from '@/components/notifications/toaster';
import { ApiClientError } from '@/lib/api/client';
import { AuthProvider } from '@/lib/auth/session';
import { useNotificationStore } from '@/stores/notification.store';

function message(error: unknown) {
  return error instanceof ApiClientError ? error.error.message : 'An unexpected error occurred.';
}

function isExpectedAuthError(error: unknown) {
  return (
    error instanceof ApiClientError &&
    ['ACCESS_TOKEN_INVALID', 'REFRESH_TOKEN_REQUIRED', 'REFRESH_TOKEN_INVALID'].includes(
      error.error.code,
    )
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const push = useNotificationStore((s) => s.push);

  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (!isExpectedAuthError(error))
              push({ kind: 'error', title: 'Unable to load data', message: message(error) });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (!isExpectedAuthError(error))
              push({ kind: 'error', title: 'Action failed', message: message(error) });
          },
        }),
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
