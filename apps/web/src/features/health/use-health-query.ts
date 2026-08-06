'use client';

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../../lib/api/client';
import { queryKeys } from '../../lib/query/query-keys';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export function useHealthQuery() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: async () => {
      const response = await apiRequest<HealthResponse>('/v1/health');
      return response.data;
    },
  });
}
