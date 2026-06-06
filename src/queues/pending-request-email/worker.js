import { Worker } from 'bullmq';

import { createBullConnection } from '../../config/bullmq.js';
import * as connectionRequestService from '../../features/request/connectionRequest.service.js';
import pendingRequestCronEmailTemplate from '../../templates/email/pendingRequestCron.js';
import sendEmail from '../../utils/aws-ses/emailService.js';
import {
  BULLMQ_PREFIX,
  JOB_NAMES,
  pendingRequestQueueConfig,
  QUEUE_NAMES,
} from './constants.js';
import { enqueuePendingRequestEmails } from './producer.js';

const processDailyDigest = async (job) => {
  const startDate = new Date(job.data.startDate);
  const endDate = new Date(job.data.endDate);
  const windowKey = job.data.startDate;

  const cursor = connectionRequestService.streamPendingRecipientEmails(
    startDate,
    endDate,
    { batchSize: pendingRequestQueueConfig.scanCursorBatchSize },
  );

  let batch = [];
  let enqueued = 0;

  for await (const row of cursor) {
    const email = row?.email ? String(row.email).trim() : '';
    if (!email) continue;

    batch.push({ email });

    if (batch.length >= pendingRequestQueueConfig.enqueueBatchSize) {
      await enqueuePendingRequestEmails(batch, windowKey);
      enqueued += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await enqueuePendingRequestEmails(batch, windowKey);
    enqueued += batch.length;
  }

  return { enqueued };
};

const processSendEmail = async (job) => {
  const { email } = job.data;
  const emailTemplate = pendingRequestCronEmailTemplate(email);
  const res = await sendEmail(emailTemplate);

  if (!res.success) {
    throw res.error ?? new Error(`SES rejected email to ${email}`);
  }

  return res;
};

const connection = createBullConnection();

export const pendingRequestEmailWorker = new Worker(
  QUEUE_NAMES.PENDING_REQUEST_EMAIL,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.DAILY_DIGEST:
        return processDailyDigest(job);
      case JOB_NAMES.SEND_EMAIL:
        return processSendEmail(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  },
  {
    connection,
    prefix: BULLMQ_PREFIX,
    concurrency: pendingRequestQueueConfig.emailWorkerConcurrency,
  },
);

pendingRequestEmailWorker.on('completed', (job, result) => {
  if (job.name === JOB_NAMES.DAILY_DIGEST) {
    console.log(
      `[pending-request-email] daily digest completed — enqueued ${result?.enqueued ?? 0} send jobs`,
    );
  }
});

pendingRequestEmailWorker.on('failed', (job, err) => {
  console.error(
    `[pending-request-email] job ${job?.id ?? 'unknown'} (${job?.name}) failed:`,
    err.message,
  );
});

export const closePendingRequestEmailWorker = async () => {
  await pendingRequestEmailWorker.close();
  await connection.quit();
};
