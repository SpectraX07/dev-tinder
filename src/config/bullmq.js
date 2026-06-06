import IORedis from 'ioredis';

import serverConfig from '../core/server.js';

/**
 * BullMQ requires `maxRetriesPerRequest: null` on ioredis.
 * @returns {import('ioredis').default}
 */
export const createBullConnection = () =>
  new IORedis(serverConfig.redis.url, {
    maxRetriesPerRequest: null,
  });
