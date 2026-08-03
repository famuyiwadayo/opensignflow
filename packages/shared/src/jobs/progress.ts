export const JobProgressStatus = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type JobProgressStatus = (typeof JobProgressStatus)[keyof typeof JobProgressStatus];

/** Transient worker-to-API progress event; must not contain secrets or document values. */
export type JobProgressEvent = {
  jobId: string;
  resourceType: string;
  resourceId: string;
  status: JobProgressStatus;
  phase: string;
  percent: number;
  message?: string;
  timestamp: string;
};
