import { createClient } from 'redis';

import serverConfig from '../core/server.js';

/** @type {import('redis').RedisClientType | null} */
let client = null;

export const connectRedis = async (url = serverConfig.redis.url) => {
  if (client?.isOpen) return client;

  client = createClient({ url });
  client.on('error', (err) => {
    console.error('[redis] client error:', err.message);
  });
  await client.connect();
  return client;
};

export const getRedis = () => {
  if (!client?.isOpen) {
    throw new Error(
      '[redis] Client is not connected — call connectRedis() during bootstrap',
    );
  }
  return client;
};

export const disconnectRedis = async () => {
  if (!client) return;
  if (client.isOpen) await client.quit();
  client = null;
};
