import { createClient } from 'redis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RedisSessionStore } from '../../src/utils/jwt/redis-session-store.js';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const PREFIX = 'devtinder:test:revoked:';

describe('RedisSessionStore integration', () => {
  let redis;

  beforeAll(async () => {
    redis = createClient({ url: REDIS_URL });
    await redis.connect();
  }, 10_000);

  afterAll(async () => {
    const keys = await redis.keys(`${PREFIX}*`);
    if (keys.length) await redis.del(keys);
    await redis.quit();
  });

  it('revoke then validate returns false', async () => {
    const store = new RedisSessionStore(redis, PREFIX);
    const jti = `test-jti-${Date.now()}`;
    const exp = Math.floor(Date.now() / 1000) + 3600;

    expect(await store.validate(jti)).toBe(true);
    await store.revoke(jti, exp);
    expect(await store.validate(jti)).toBe(false);
  });
});
