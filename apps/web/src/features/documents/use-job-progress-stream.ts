'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/** Opens an authenticated fetch-based SSE stream; EventSource cannot send Bearer headers. */
export function useJobProgressStream(input: {
  jobId?: string;
  documentId: string;
  accessToken: string | null;
  organizationId: string | null;
}) {
  const client = useQueryClient();
  useEffect(() => {
    if (!input.jobId || !input.accessToken || !input.organizationId) return;
    const controller = new AbortController();
    void fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/jobs/${input.jobId}/events`,
      {
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          'X-Organization-Id': input.organizationId,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
        credentials: 'include',
      },
    )
      .then(async (response) => {
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const next = await reader.read();
          if (next.done) break;
          buffer += decoder.decode(next.value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const event of events)
            if (event.includes('event: job-progress')) {
              await client.invalidateQueries({
                queryKey: ['document-jobs', input.organizationId, input.documentId],
              });
            }
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [input.jobId, input.documentId, input.accessToken, input.organizationId, client]);
}
