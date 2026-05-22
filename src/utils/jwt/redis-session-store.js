export class RedisSessionStore {
  constructor(redis, keyPrefix) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  #key(jti) {
    return `${this.keyPrefix}${jti}`;
  }

  async revoke(jti, expiresAtSec) {
    if (!jti) return;
    const ttlSec = expiresAtSec
      ? Math.max(1, expiresAtSec - Math.floor(Date.now() / 1000))
      : 86_400;
    await this.redis.set(this.#key(jti), '1', { EX: ttlSec });
  }

  async validate(jti) {
    if (!jti) return true;
    const revoked = await this.redis.exists(this.#key(jti));
    return revoked === 0;
  }
}
