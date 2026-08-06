'use client';

import { Activity } from 'lucide-react';

import { useHealthQuery } from './use-health-query';

export function ApiStatusCard() {
  const health = useHealthQuery();

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted p-2">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">API status</p>
          <p className="text-sm text-muted-foreground">
            {health.isLoading
              ? 'Checking backend...'
              : health.isError || !health.data
                ? 'Backend not reachable yet'
                : `${health.data.service} is ${health.data.status}`}
          </p>
        </div>
      </div>
    </div>
  );
}
