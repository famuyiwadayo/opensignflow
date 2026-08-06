'use client';

import { useQueryClient } from '@tanstack/react-query';
import { authSessionKey, type AuthResponse } from '@/features/auth/use-auth-mutations';
import { useAuth } from '@/lib/auth/session';
import { ApiClientError, apiRequest, type ApiSuccess } from './client';

// Refresh de-duplication: module-level refresh lock.
// If multiple queries fail simultaneously after an access-token expiry
// they all share one refresh request. This prevents a refresh storm.
let refreshInFlight: Promise<AuthResponse> | null = null;

async function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = apiRequest<AuthResponse>('/v1/auth/refresh', { method: 'POST' })
      .then((response) => response.data)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Adds owner headers and transparently rotates an expired access token once. */
export function useAuthenticatedApi() {
  const { accessToken, activeOrganizationId } = useAuth();
  const client = useQueryClient();
  const isReady = Boolean(accessToken && activeOrganizationId);

  async function request<TData>(path: string, init: RequestInit = {}): Promise<ApiSuccess<TData>> {
    if (!accessToken || !activeOrganizationId) {
      throw new Error('An authenticated organization session is required.');
    }

    const execute = (token: string) =>
      apiRequest<TData>(path, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Organization-Id': activeOrganizationId,
          ...init.headers,
        },
      });

    try {
      return await execute(accessToken);
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.error.code !== 'ACCESS_TOKEN_INVALID') {
        throw error;
      }

      try {
        const session = await refreshSession();
        client.setQueryData(authSessionKey, session);
        return await execute(session.accessToken);
      } catch (refreshError) {
        client.removeQueries({ queryKey: authSessionKey });
        throw refreshError;
      }
    }
  }
  return { request, isReady, accessToken, organizationId: activeOrganizationId };
}
