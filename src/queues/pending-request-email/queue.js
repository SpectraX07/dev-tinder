import { Queue } from 'bullmq';

import { createBullConnection } from '../../config/bullmq.js';
import {
  BULLMQ_PREFIX,
  pendingRequestQueueConfig,
  QUEUE_NAMES,
} from './constants.js';

const connection = createBullConnection();

export const pendingRequestEmailQueue = new Queue(
  QUEUE_NAMES.PENDING_REQUEST_EMAIL,
  {
    connection,
    prefix: BULLMQ_PREFIX,
    defaultJobOptions: pendingRequestQueueConfig.defaultJobOptions,
  },
);

export const closePendingRequestEmailQueue = async () => {
  await pendingRequestEmailQueue.close();
  await connection.quit();
};
