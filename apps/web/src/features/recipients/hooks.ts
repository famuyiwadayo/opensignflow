'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/lib/api/use-authenticated-api';

const key = (d: string, o: string) => ['recipients', o, d] as const;

export function useRecipientsQuery(d: string) {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: key(d, api.organizationId ?? ''),
    enabled: Boolean(d && api.isReady),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.request<any[]>(`/v1/documents/${d}/recipients`).then((r) => r.data),
  });
}

export function useCreateRecipientMutation(d: string) {
  const api = useAuthenticatedApi();
  const c = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api.request(`/v1/documents/${d}/recipients`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => c.invalidateQueries({ queryKey: key(d, api.organizationId ?? '') }),
  });
}

export function useDeleteRecipientMutation(d: string) {
  const api = useAuthenticatedApi();
  const c = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.request(`/v1/documents/${d}/recipients/${id}`, { method: 'DELETE' }),
    onSuccess: () => c.invalidateQueries({ queryKey: key(d, api.organizationId ?? '') }),
  });
}

export function useUpdateRecipientMutation(d: string) {
  const api = useAuthenticatedApi();
  const c = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      api.request(`/v1/documents/${d}/recipients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => c.invalidateQueries({ queryKey: key(d, api.organizationId ?? '') }),
  });
}
