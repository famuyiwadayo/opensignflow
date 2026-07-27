import { Queue, type JobsOptions } from 'bullmq';
import { createQueueConnection, type CreateQueueConnectionInput } from '../connection';

export function createQueue<Payload>(
  input: CreateQueueConnectionInput & { name: string; defaultJobOptions?: JobsOptions },
) {
  return new Queue<Payload>(input.name, {
    connection: createQueueConnection(input),
    defaultJobOptions: input.defaultJobOptions,
  });
}
