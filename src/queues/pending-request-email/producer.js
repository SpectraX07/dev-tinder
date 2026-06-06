import { JOB_NAMES } from './constants.js';
import { pendingRequestEmailQueue } from './queue.js';

/**
 * Enqueues the daily digest coordinator job (streams DB → bulk email jobs).
 *
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const scheduleDailyPendingRequestDigest = async (startDate, endDate) => {
  const windowKey = startDate.toISOString();

  await pendingRequestEmailQueue.add(
    JOB_NAMES.DAILY_DIGEST,
    { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    {
      jobId: `daily-digest:${windowKey}`,
      removeOnComplete: true,
    },
  );
};

/**
 * @param {string} email
 * @param {string} windowKey ISO start-of-window for deduplication
 */
export const buildSendEmailJobId = (email, windowKey) =>
  `send-email:${windowKey}:${email}`;

/**
 * @param {{ email: string }[]} recipients
 * @param {string} windowKey
 */
export const enqueuePendingRequestEmails = async (recipients, windowKey) => {
  if (recipients.length === 0) return;

  const jobs = recipients.map(({ email }) => ({
    name: JOB_NAMES.SEND_EMAIL,
    data: { email, windowKey },
    opts: {
      jobId: buildSendEmailJobId(email, windowKey),
    },
  }));

  await pendingRequestEmailQueue.addBulk(jobs);
};
