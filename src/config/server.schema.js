import { z } from 'zod';

const DEV_ACCESS_SECRET =
  'EnZZCoZ7Ss4MVQcjeGlEzxtx7/R5ObWcG1XpslduI+i9kmUDl38ZU6AEFXWP99+eC2DXu/Xa+/xIDyddfbMv6w==';
const DEV_REFRESH_SECRET =
  '/6QIzy1p6xswm5cb/v2HFwHkT3TjCx0EBhTVvUDW4odLK5mnHwaGS3NpGLRupCG/9n7N5Hv4QA8GauVTYahBig==';

const COMPACT_DURATION_RE = /^(\d+)([smhdwy])$/i;
const WORD_DURATION_RE = /^(\d+)\s+([a-z]+)$/i;

/** @param {string} value */
const isValidExpiresIn = (value) => {
  const trimmed = value.trim();
  return COMPACT_DURATION_RE.test(trimmed) || WORD_DURATION_RE.test(trimmed);
};

const durationSchema = z.string().trim().min(1).refine(isValidExpiresIn, {
  message: 'Use compact (15m, 7d, 2w) or words (2 weeks, 1 year)',
});

const secretSchema = (minLength) =>
  z.string().min(minLength, `Secret must be at least ${minLength} characters`);

const sameSiteSchema = z.enum(['strict', 'lax', 'none']);

const boolFromEnv = z
  .union([
    z.literal('true'),
    z.literal('false'),
    z.literal('1'),
    z.literal('0'),
  ])
  .transform((v) => v === 'true' || v === '1')
  .optional();

const nodeEnvSchema = z
  .enum(['development', 'production', 'test'])
  .default('development');

/**
 * @param {string | undefined} originsStr
 * @returns {string[] | '*'}
 */
const parseCorsOrigins = (originsStr) => {
  if (!originsStr?.trim()) return '*';
  return originsStr.split(',').map((origin) => origin.trim());
};

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {boolean} isProd
 */
const buildJwtConfig = (env, isProd) => {
  const minSecretLength = 32;
  const accessSecretRaw = env.JWT_ACCESS_SECRET ?? env.JWT_SECRET;
  const refreshSecretRaw =
    env.JWT_REFRESH_SECRET ?? accessSecretRaw ?? env.JWT_SECRET;

  if (isProd && !accessSecretRaw) {
    throw new Error(
      '[config] JWT_ACCESS_SECRET (or JWT_SECRET) is required in production.',
    );
  }

  if (isProd && !refreshSecretRaw) {
    throw new Error('[config] JWT_REFRESH_SECRET is required in production.');
  }

  const accessSecret = accessSecretRaw ?? DEV_ACCESS_SECRET;
  const refreshSecret = refreshSecretRaw ?? DEV_REFRESH_SECRET;

  if (!isProd) {
    if (!accessSecretRaw) {
      console.warn(
        '[config] JWT_ACCESS_SECRET is not set — using a development-only fallback.',
      );
    }
    if (!refreshSecretRaw) {
      console.warn(
        '[config] JWT_REFRESH_SECRET is not set — using a development-only fallback.',
      );
    }
  }

  const algorithm = env.JWT_ALGORITHM ?? 'HS256';
  const asymmetricAlgorithms = ['RS256', 'ES256'];
  const isAsymmetric = asymmetricAlgorithms.includes(algorithm);

  if (!['HS256', ...asymmetricAlgorithms].includes(algorithm)) {
    throw new Error(
      `[config] JWT_ALGORITHM "${algorithm}" is not supported. Use HS256, RS256, or ES256.`,
    );
  }

  /** @param {string | undefined} raw */
  const normalizePem = (raw) => raw?.replace(/\\n/g, '\n').trim() || undefined;

  const privateKey = normalizePem(env.JWT_PRIVATE_KEY);
  const publicKey = normalizePem(env.JWT_PUBLIC_KEY);
  const jwksUri = env.JWT_JWKS_URI?.trim() || undefined;
  const keyId = env.JWT_KEY_ID?.trim() || undefined;

  if (isAsymmetric) {
    if (isProd && !privateKey) {
      throw new Error('[config] JWT_PRIVATE_KEY is required for RS256/ES256 in production.');
    }
    if (isProd && !publicKey && !jwksUri) {
      throw new Error(
        '[config] JWT_PUBLIC_KEY or JWT_JWKS_URI is required for RS256/ES256 in production.',
      );
    }
  }

  const sessionEnabled = env.JWT_SESSION_TRACKING !== 'false';
  const sessionKeyPrefix =
    env.JWT_REVOKE_KEY_PREFIX?.trim() || 'devtinder:jwt:revoked:';

  const clockTolerance = env.JWT_CLOCK_TOLERANCE?.trim() || '5s';

  const sameSite = (env.JWT_COOKIE_SAME_SITE ?? 'lax').toLowerCase();

  const parsed = z
    .object({
      issuer: z.string().trim().min(1).default('devTinder'),
      audience: z.string().trim().min(1).default('devTinder:api'),
      accessExpiresIn: durationSchema.default('15m'),
      refreshExpiresIn: durationSchema.default('7d'),
      accessCookieName: z.string().trim().min(1).default('accessToken'),
      refreshCookieName: z.string().trim().min(1).default('refreshToken'),
      cookiePath: z.string().trim().min(1).default('/'),
      cookieDomain: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v === '' ? undefined : v)),
      cookieSameSite: sameSiteSchema.default('lax'),
      cookieHttpOnly: boolFromEnv.default(true),
      cookieSecure: boolFromEnv,
    })
    .parse({
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
      accessCookieName: env.JWT_ACCESS_COOKIE,
      refreshCookieName: env.JWT_REFRESH_COOKIE,
      cookiePath: env.JWT_COOKIE_PATH,
      cookieDomain: env.JWT_COOKIE_DOMAIN,
      cookieSameSite: sameSite,
      cookieHttpOnly: env.JWT_COOKIE_HTTP_ONLY,
      cookieSecure: env.JWT_COOKIE_SECURE,
    });

  if (!isAsymmetric) {
    secretSchema(minSecretLength).parse(accessSecret);
    secretSchema(minSecretLength).parse(refreshSecret);
  }

  const cookieSecure = parsed.cookieSecure ?? isProd;

  if (parsed.cookieSameSite === 'none' && !cookieSecure) {
    throw new Error(
      '[config] JWT_COOKIE_SAME_SITE=none requires JWT_COOKIE_SECURE=true.',
    );
  }

  return Object.freeze({
    issuer: parsed.issuer,
    audience: parsed.audience,
    algorithm: /** @type {'HS256' | 'RS256' | 'ES256'} */ (algorithm),
    algorithms: [/** @type {'HS256' | 'RS256' | 'ES256'} */ (algorithm)],
    mode: isAsymmetric ? 'asymmetric' : 'symmetric',
    minSecretLength,
    keyId,
    jwksUri,
    clockTolerance,
    session: Object.freeze({
      enabled: sessionEnabled,
      keyPrefix: sessionKeyPrefix,
    }),
    asymmetric: Object.freeze({
      privateKey: privateKey ?? '',
      publicKey: publicKey ?? '',
    }),
    access: Object.freeze({
      secret: isAsymmetric ? '' : accessSecret,
      expiresIn: parsed.accessExpiresIn,
      cookieName: parsed.accessCookieName,
    }),
    refresh: Object.freeze({
      secret: isAsymmetric ? '' : refreshSecret,
      expiresIn: parsed.refreshExpiresIn,
      cookieName: parsed.refreshCookieName,
    }),
    cookie: Object.freeze({
      httpOnly: parsed.cookieHttpOnly ?? true,
      secure: cookieSecure,
      sameSite: parsed.cookieSameSite,
      path: parsed.cookiePath,
      domain: parsed.cookieDomain,
    }),
  });
};

/**
 * @param {NodeJS.ProcessEnv} [env=process.env]
 */
export const parseServerConfig = (env = process.env) => {
  const runtime = z
    .object({
      NODE_ENV: nodeEnvSchema,
      PORT: z.coerce.number().int().positive().default(5000),
      HOST: z.string().trim().min(1).default('0.0.0.0'),
      LOG_LEVEL: z
        .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
        .optional(),
      ALLOWED_ORIGINS: z.string().optional(),
      RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
      MONGO_URI: z
        .string()
        .trim()
        .min(1)
        .default('mongodb://localhost:27017/devTinder'),
      DB_NAME: z.string().trim().min(1).default('devTinder'),
      DB_USER: z.string().optional(),
      DB_PASS: z.string().optional(),
    })
    .parse({
      NODE_ENV: env.NODE_ENV,
      PORT: env.PORT,
      HOST: env.HOST,
      LOG_LEVEL: env.LOG_LEVEL,
      ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
      RATE_LIMIT_MAX: env.RATE_LIMIT_MAX,
      MONGO_URI: env.MONGO_URI,
      DB_NAME: env.DB_NAME,
      DB_USER: env.DB_USER,
      DB_PASS: env.DB_PASS,
    });

  const envName = runtime.NODE_ENV;
  const isProd = envName === 'production';
  const isDev = envName === 'development';
  const isTest = envName === 'test';

  const redisUrl = env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';

  return Object.freeze({
    env: envName,
    isProd,
    isDev,
    isTest,
    port: runtime.PORT,
    host: runtime.HOST,
    logLevel: runtime.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
    cors: Object.freeze({
      origin: parseCorsOrigins(runtime.ALLOWED_ORIGINS),
    }),
    rateLimit: Object.freeze({
      windowMs: 15 * 60 * 1000,
      max: runtime.RATE_LIMIT_MAX ?? 100,
    }),
    database: Object.freeze({
      uri: runtime.MONGO_URI,
      name: runtime.DB_NAME,
      user: runtime.DB_USER ?? '',
      pass: runtime.DB_PASS ?? '',
    }),
    redis: Object.freeze({ url: redisUrl }),
    jwt: buildJwtConfig(env, isProd),
  });
};
