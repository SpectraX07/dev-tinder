import cron from 'node-cron';
import { subDays, startOfDay, endOfDay } from 'date-fns';

import serverConfig from '../core/server.js';
import { scheduleDailyPendingRequestDigest } from '../queues/pending-request-email/producer.js';

if (!serverConfig.isTest) {
  cron.schedule('02 20 * * *', async () => {
    const yesterday = startOfDay(subDays(new Date(), 1));
    const yesterdayDayStart = startOfDay(yesterday);
    const yesterdayDayEnd = endOfDay(yesterday);

    try {
      await scheduleDailyPendingRequestDigest(
        yesterdayDayStart,
        yesterdayDayEnd,
      );
      console.log(
        '[pending-requests] daily digest job enqueued for',
        yesterdayDayStart.toISOString(),
      );
    } catch (error) {
      console.error(
        '[pending-requests] failed to enqueue daily digest:',
        error,
      );
    }
  });
}
