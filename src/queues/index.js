import serverConfig from '../core/server.js';
import { closePendingRequestEmailQueue } from './pending-request-email/queue.js';
import {
  closePendingRequestEmailWorker,
  pendingRequestEmailWorker,
} from './pending-request-email/worker.js';

export {
  scheduleDailyPendingRequestDigest,
  enqueuePendingRequestEmails,
} from './pending-request-email/producer.js';

/** @type {boolean} */
let workersStarted = false;

export const startQueueWorkers = async () => {
  if (workersStarted || serverConfig.isTest) return;

  workersStarted = true;
  void pendingRequestEmailWorker;
  console.info('[queues] BullMQ workers started');
};

export const closeQueues = async () => {
  if (!workersStarted) return;

  await closePendingRequestEmailWorker();
  await closePendingRequestEmailQueue();
  workersStarted = false;
  console.info('[queues] BullMQ workers closed');
};

export { pendingRequestEmailWorker };
