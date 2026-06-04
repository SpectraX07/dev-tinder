import serverConfig from '../../core/server.js';
import { connectRedis, disconnectRedis } from '../../config/redis.js';
import { JWT_ERROR_CODE, JwtError } from './errors.js';
import { RedisSessionStore } from './redis-session-store.js';

export { RedisSessionStore } from './redis-session-store.js';

const jwtConfig = serverConfig.jwt;

/** @typedef {RedisSessionStore} SessionStore */

export const noopSessionStore = Object.freeze({
  revoke: async () => {},
  validate: async () => true,
});

/** @type {SessionStore | typeof noopSessionStore | null} */
let activeStore = null;

/**
 * Connects to Redis/Valkey and wires the refresh-token denylist store.
 * Call once during app bootstrap before handling auth traffic.
 */
export const initSessionStore = async () => {
  resetSessionStore();

  if (!jwtConfig.session.enabled) {
    activeStore = noopSessionStore;
    return;
  }

  const redis = await connectRedis(serverConfig.redis.url);
  activeStore = new RedisSessionStore(redis, jwtConfig.session.keyPrefix);
};

/** @returns {SessionStore | typeof noopSessionStore} */
export const getSessionStore = () => {
  if (!jwtConfig.session.enabled) return noopSessionStore;

  if (!activeStore) {
    throw new Error(
      '[session] Redis session store is not initialized — call initSessionStore() at startup',
    );
  }

  return activeStore;
};

/** @param {SessionStore | typeof noopSessionStore | null} store */
export const setSessionStore = (store) => {
  activeStore = store;
};

export const resetSessionStore = () => {
  activeStore = null;
};

export const closeSessionStore = async () => {
  resetSessionStore();
  if (jwtConfig.session.enabled) {
    await disconnectRedis();
  }
};

/** @param {string | undefined} jti */
export const assertSessionActive = async (jti) => {
  if (!jti || !jwtConfig.session.enabled) return;
  const valid = await getSessionStore().validate(jti);
  if (!valid) {
    throw new JwtError('Token has been revoked', JWT_ERROR_CODE.REVOKED);
  }
};
