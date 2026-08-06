export const queryKeys = {
  health: ['health'] as const,
  documents: {
    all: ['documents'] as const,
    list: (filters?: Record<string, unknown>) => ['documents', 'list', filters ?? {}] as const,
    detail: (documentId: string) => ['documents', 'detail', documentId] as const,
    fields: (documentId: string) => ['documents', 'detail', documentId, 'fields'] as const,
    recipients: (documentId: string) => ['documents', 'detail', documentId, 'recipients'] as const,
    audit: (documentId: string) => ['documents', 'detail', documentId, 'audit'] as const,
  },
  ai: {
    summary: (documentId: string) => ['ai', 'summary', documentId] as const,
    fieldSuggestions: (documentId: string) => ['ai', 'field-suggestions', documentId] as const,
  },
};
