'use client';

import { useAuth } from '@/lib/auth/session';
import { apiRequest, type ApiSuccess } from './client';

/** Adds the active owner session headers to authenticated API requests. */
export function useAuthenticatedApi() {
  const { accessToken, activeOrganizationId } = useAuth();
  const isReady = Boolean(accessToken && activeOrganizationId);

  function request<TData>(path: string, init: RequestInit = {}): Promise<ApiSuccess<TData>> {
    if (!accessToken || !activeOrganizationId) {
      return Promise.reject(new Error('An authenticated organization session is required.'));
    }

    return apiRequest<TData>(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Organization-Id': activeOrganizationId,
        ...init.headers,
      },
    });
  }

  return { request, isReady, accessToken, organizationId: activeOrganizationId };
}
