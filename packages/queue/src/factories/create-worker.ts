import { Worker, type WorkerOptions } from 'bullmq';
import { createQueueConnection, type CreateQueueConnectionInput } from '../connection';

export function createWorker<Payload>(
  input: CreateQueueConnectionInput & {
    name: string;
    processor: (payload: Payload) => Promise<void>;
    options?: Omit<WorkerOptions, 'connection'>;
  },
) {
  return new Worker<Payload>(input.name, async (job) => input.processor(job.data), {
    ...input.options,
    connection: createQueueConnection(input),
  });
}
