'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';

export type SigningField = {
  id: string;
  type: 'SIGNATURE' | 'INITIALS' | 'TEXT' | 'DATE' | 'CHECKBOX';
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  label: string | null;
  placeholder: string | null;
};

export type SigningRequest = {
  documentTitle: string;
  originalFileName: string;
  pageCount: number | null;
  recipientName: string;
  recipientEmail: string;
  status: string;
  expiresAt: string;
  fields: SigningField[];
};

const key = (token: string) => ['public-signing', token] as const;

export function useSigningRequestQuery(token: string) {
  return useQuery({
    queryKey: key(token),
    enabled: Boolean(token),
    queryFn: () => apiRequest<SigningRequest>(`/v1/signing-requests/${token}`).then((r) => r.data),
    retry: false,
  });
}

export function useSigningPreviewUrl(token: string) {
  return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/v1/signing-requests/${token}/preview`;
}

export function useSubmitSigningMutation(token: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: unknown[]) =>
      apiRequest(`/v1/signing-requests/${token}/submit`, {
        method: 'POST',
        body: JSON.stringify({ values }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: key(token) }),
  });
}
