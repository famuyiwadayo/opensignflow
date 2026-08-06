'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/lib/api/use-authenticated-api';
const key = (d: string, o: string) => ['fields', o, d] as const;

export function useFieldsQuery(d: string) {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: key(d, api.organizationId ?? ''),
    enabled: Boolean(d && api.isReady),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.request<any[]>(`/v1/documents/${d}/fields`).then((r) => r.data),
  });
}

export function useCreateFieldMutation(d: string) {
  const api = useAuthenticatedApi();
  const c = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      api.request(`/v1/documents/${d}/fields`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => c.invalidateQueries({ queryKey: key(d, api.organizationId ?? '') }),
  });
}

export function useBulkAssignFieldsMutation(d: string) {
  const api = useAuthenticatedApi();
  const c = useQueryClient();
  return useMutation({
    mutationFn: (body: { fieldIds: string[]; recipientId: string }) =>
      api.request(`/v1/documents/${d}/fields/bulk-assignment`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => c.invalidateQueries({ queryKey: key(d, api.organizationId ?? '') }),
  });
}

export function useDeleteFieldMutation(d: string) {
  const api = useAuthenticatedApi();
  const c = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.request(`/v1/documents/${d}/fields/${id}`, { method: 'DELETE' }),
    onSuccess: () => c.invalidateQueries({ queryKey: key(d, api.organizationId ?? '') }),
  });
}
