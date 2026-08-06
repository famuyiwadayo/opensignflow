'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/api/client';

export type SessionUser = { id: string; email: string; name: string | null };

export type SessionOrganization = {
  id: string;
  organization: { id: string; name: string };
  role: string;
};

export type AuthResponse = {
  user: SessionUser;
  organizations: SessionOrganization[];
  accessToken: string;
};

export const authSessionKey = ['auth', 'session'] as const;

export function useLoginMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiRequest<AuthResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: (result) => client.setQueryData(authSessionKey, result.data),
  });
}

export function useRegisterMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      apiRequest<AuthResponse>('/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => client.setQueryData(authSessionKey, result.data),
  });
}

export function useLogoutMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/v1/auth/logout', { method: 'POST' }),
    onSuccess: () => client.removeQueries({ queryKey: authSessionKey }),
  });
}
