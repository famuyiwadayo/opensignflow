'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticatedApi } from '@/lib/api/use-authenticated-api';
export type Document = {
  id: string;
  title: string;
  status: string;
  originalFileName: string;
  pageCount: number | null;
  createdAt: string;
};
export const documentKeys = {
  all: ['documents'] as const,
  list: (org: string) => ['documents', org] as const,
  detail: (id: string, org: string) => ['documents', org, id] as const,
  audit: (id: string, org: string) => ['audit-events', org, id] as const,
};

export function useDocumentsQuery() {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: documentKeys.list(api.organizationId ?? ''),
    enabled: api.isReady,
    queryFn: () => api.request<Document[]>('/v1/documents').then((r) => r.data),
  });
}

export function useDocumentQuery(id: string) {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: documentKeys.detail(id, api.organizationId ?? ''),
    enabled: Boolean(id && api.isReady),
    queryFn: () => api.request<Document>(`/v1/documents/${id}`).then((r) => r.data),
  });
}

export function useSendDocumentMutation(id: string) {
  const api = useAuthenticatedApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.request<Document>(`/v1/documents/${id}/send`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: documentKeys.detail(id, api.organizationId ?? '') }),
        client.invalidateQueries({ queryKey: documentKeys.list(api.organizationId ?? '') }),
        client.invalidateQueries({ queryKey: documentKeys.audit(id, api.organizationId ?? '') }),
      ]);
    },
  });
}

export function useUploadDocumentMutation(onProgress: (percent: number) => void) {
  const api = useAuthenticatedApi();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      new Promise<Document>((resolve, reject) => {
        if (!api.accessToken || !api.organizationId)
          return reject(new Error('Authenticated organization session is required.'));
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append('file', file);
        xhr.open(
          'POST',
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/documents`,
        );
        xhr.setRequestHeader('Authorization', `Bearer ${api.accessToken}`);
        xhr.setRequestHeader('X-Organization-Id', api.organizationId);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          const body = JSON.parse(xhr.responseText);
          if (xhr.status === 201) resolve(body.data);
          else reject(body.error);
        };
        xhr.onerror = () => reject(new Error('Upload failed.'));
        xhr.send(form);
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: documentKeys.list(api.organizationId ?? '') }),
  });
}

export function useDocumentDownloadMutation(d: string) {
  const api = useAuthenticatedApi();
  return useMutation({
    mutationFn: (input: {
      variant: 'original' | 'completed';
      disposition: 'attachment' | 'inline';
    }) =>
      api
        .request<{ url: string }>(
          `/v1/documents/${d}/download-url?variant=${input.variant}&disposition=${input.disposition}`,
        )
        .then((r) => r.data),
  });
}

export type AuditEvent = {
  id: string;
  eventType: string;
  actorEmail: string | null;
  actorType: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export function useAuditEventsQuery(d: string, active: boolean) {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: documentKeys.audit(d, api.organizationId ?? ''),
    enabled: Boolean(d && api.isReady),
    queryFn: () => api.request<AuditEvent[]>(`/v1/documents/${d}/audit-events`).then((r) => r.data),
    refetchInterval: active ? 5_000 : false,
  });
}

export type Job = {
  id: string;
  status: string;
  progressPercent: number;
  progressPhase: string | null;
  progressMessage: string | null;
  completedAt: string | null;
};

export function useDocumentJobsQuery(d: string, active: boolean) {
  const api = useAuthenticatedApi();
  return useQuery({
    queryKey: ['document-jobs', api.organizationId, d],
    enabled: Boolean(d && api.isReady && active),
    queryFn: () => api.request<Job[]>(`/v1/jobs/document/${d}`).then((r) => r.data),
    refetchInterval: active ? 3_000 : false,
  });
}
