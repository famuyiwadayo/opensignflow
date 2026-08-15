const colors = ['#67e8f9', '#a78bfa', '#fbbf24', '#f9a8d4'] as const;
export function recipientColor(recipientId: string | null, signerIds: string[]) {
  if (!recipientId) return '#94a3b8';
  const index = signerIds.indexOf(recipientId);
  return index < 0 ? '#94a3b8' : colors[index % colors.length];
}
