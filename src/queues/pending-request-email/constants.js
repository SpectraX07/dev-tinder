import serverConfig from '../../core/server.js';

export const QUEUE_NAMES = Object.freeze({
  PENDING_REQUEST_EMAIL: 'pending-request-email',
});

export const JOB_NAMES = Object.freeze({
  DAILY_DIGEST: 'daily-digest',
  SEND_EMAIL: 'send-email',
});

export const BULLMQ_PREFIX = serverConfig.queues.bullmq.prefix;

export const pendingRequestQueueConfig =
  serverConfig.queues.pendingRequestEmail;
