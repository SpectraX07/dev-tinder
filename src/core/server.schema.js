import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Dev-only fallback secrets — obviously fake, never commit real secrets
// ─────────────────────────────────────────────────────────────────────────────
const DEV_ACCESS_SECRET = 'dev-only-insecure-access-secret-do-not-use-in-prod';
const DEV_REFRESH_SECRET =
  'dev-only-insecure-refresh-secret-do-not-use-in-prod';

// ─────────────────────────────────────────────────────────────────────────────
// Primitive schemas
// ─────────────────────────────────────────────────────────────────────────────

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

// sameSite: normalize to lowercase inside Zod, not outside
const sameSiteSchema = z.preprocess(
  (v) => (typeof v === 'string' ? v.toLowerCase() : v),
  z.enum(['strict', 'lax', 'none']),
);

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

/** @param {string} value */
const isValidIanaTimezone = (value) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .default('UTC')
  .refine(isValidIanaTimezone, {
    message:
      'Must be a valid IANA timezone (e.g. UTC, Asia/Kolkata, America/New_York)',
  });

const uvThreadpoolSizeSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(128)
  .default(4);

// Redis URL validated properly through Zod, not raw string fallback
const redisUrlSchema = z
  .string()
  .trim()
  .url('REDIS_URL must be a valid URL (e.g. redis://127.0.0.1:6379)')
  .default('redis://127.0.0.1:6379');

/**
 * Parses and validates ALLOWED_ORIGINS.
 * Returns '*' if unset, otherwise validates each entry is a valid URL.
 * @param {string | undefined} originsStr
 * @returns {string[] | '*'}
 */
const parseCorsOrigins = (originsStr) => {
  if (!originsStr?.trim()) return '*';

  const origins = originsStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const schema = z
    .array(
      z
        .string()
        .url(
          'Each ALLOWED_ORIGINS entry must be a valid URL (e.g. https://example.com)',
        ),
    )
    .min(1);

  return schema.parse(origins);
};

// ─────────────────────────────────────────────────────────────────────────────
// JWT config
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {boolean} isProd
 */
const buildJwtConfig = (env, isProd) => {
  const minSecretLength = 32;
  const accessSecretRaw = env.JWT_ACCESS_SECRET ?? env.JWT_SECRET;
  const refreshSecretRaw = env.JWT_REFRESH_SECRET;

  if (isProd && !accessSecretRaw) {
    throw new Error(
      '[config] JWT_ACCESS_SECRET (or JWT_SECRET) is required in production.',
    );
  }

  if (isProd && !refreshSecretRaw) {
    throw new Error('[config] JWT_REFRESH_SECRET is required in production.');
  }

  const accessSecret = accessSecretRaw ?? DEV_ACCESS_SECRET;

  // Refresh falls back to access secret only as a last resort — warn loudly
  const refreshSecret = (() => {
    if (refreshSecretRaw) return refreshSecretRaw;

    if (!isProd) {
      if (accessSecretRaw) {
        console.warn(
          '[config] JWT_REFRESH_SECRET is not set — falling back to the access secret. ' +
            'Set a separate JWT_REFRESH_SECRET for proper security.',
        );
        return accessSecretRaw;
      }
      console.warn(
        '[config] JWT_REFRESH_SECRET is not set — using a development-only fallback.',
      );
    }

    return DEV_REFRESH_SECRET;
  })();

  if (!isProd) {
    if (!accessSecretRaw) {
      console.warn(
        '[config] JWT_ACCESS_SECRET is not set — using a development-only fallback.',
      );
    }
  }

  /**
   * Descriptor map — add new algorithms here only; all downstream logic is derived.
   * @type {Record<string, { asymmetric: boolean }>}
   */
  const SUPPORTED_ALGORITHMS = {
    HS256: { asymmetric: false },
    RS256: { asymmetric: true },
    ES256: { asymmetric: true },
    RS384: { asymmetric: true },
    RS512: { asymmetric: true },
    ES384: { asymmetric: true },
    ES512: { asymmetric: true },
  };

  const algorithm = env.JWT_ALGORITHM ?? 'HS256';
  const algorithmMeta = SUPPORTED_ALGORITHMS[algorithm];

  if (!algorithmMeta) {
    throw new Error(
      `[config] JWT_ALGORITHM "${algorithm}" is not supported. ` +
        `Use one of: ${Object.keys(SUPPORTED_ALGORITHMS).join(', ')}.`,
    );
  }

  const isAsymmetric = algorithmMeta.asymmetric;

  /** @param {string | undefined} raw */
  const normalizePem = (raw) => raw?.replace(/\\n/g, '\n').trim() || undefined;

  const privateKey = normalizePem(env.JWT_PRIVATE_KEY);
  const publicKey = normalizePem(env.JWT_PUBLIC_KEY);
  const jwksUri = env.JWT_JWKS_URI?.trim() || undefined;
  const keyId = env.JWT_KEY_ID?.trim() || undefined;

  if (isAsymmetric) {
    if (isProd && !privateKey) {
      throw new Error(
        '[config] JWT_PRIVATE_KEY is required for RS256/ES256 in production.',
      );
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

  const clockTolerance = durationSchema
    .default('5s')
    .parse(env.JWT_CLOCK_TOLERANCE);

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
      // sameSite normalization now happens inside the schema
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
      // No more manual .toLowerCase() before passing in
      cookieSameSite: env.JWT_COOKIE_SAME_SITE,
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
    algorithm: /** @type {keyof typeof SUPPORTED_ALGORITHMS} */ (algorithm),
    algorithms: [/** @type {keyof typeof SUPPORTED_ALGORITHMS} */ (algorithm)],
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

// ─────────────────────────────────────────────────────────────────────────────
// AWS config
// ─────────────────────────────────────────────────────────────────────────────

// AWS access key IDs are 20 uppercase alphanumeric chars starting with AKIA/ASIA/AROA etc.
// Secret access keys are 40 base64-ish chars. Patterns match real AWS credentials.
const AWS_ACCESS_KEY_RE = /^[A-Z0-9]{16,128}$/;
const AWS_SECRET_KEY_RE = /^[A-Za-z0-9/+=]{16,128}$/;

/**
 * @param {string | undefined} accessKeyId
 * @param {string | undefined} secretAccessKey
 * @returns {{ accessKeyId: string, secretAccessKey: string } | undefined}
 */
const buildStaticCredentials = (accessKeyId, secretAccessKey) => {
  const key = accessKeyId?.trim();
  const secret = secretAccessKey?.trim();

  if (!key || !secret) return undefined;

  if (!AWS_ACCESS_KEY_RE.test(key)) {
    throw new Error(
      `[config] AWS access key ID "${key}" looks invalid. ` +
        'Expected 16–128 uppercase alphanumeric characters.',
    );
  }

  if (!AWS_SECRET_KEY_RE.test(secret)) {
    throw new Error(
      '[config] AWS secret access key looks invalid. ' +
        'Expected 16–128 base64-safe characters.',
    );
  }

  return { accessKeyId: key, secretAccessKey: secret };
};

/**
 * @param {string | undefined} region
 * @param {{ accessKeyId: string, secretAccessKey: string } | undefined} credentials
 */
const buildAwsClientOptions = (region, credentials) =>
  Object.freeze({
    region,
    ...(credentials ? { credentials } : {}),
  });

/**
 * @param {NodeJS.ProcessEnv} env
 * @param {boolean} isProd
 */
const buildAWSConfig = (env, isProd) => {
  const globalRegion =
    env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || undefined;
  const globalCredentials = buildStaticCredentials(
    env.AWS_ACCESS_KEY_ID,
    env.AWS_SECRET_ACCESS_KEY,
  );

  const sesEnabled = env.AWS_SES_ENABLED !== 'false';
  const sesRegionRaw = env.AWS_SES_REGION?.trim() || globalRegion;
  const sesRegion = sesRegionRaw ?? (isProd ? undefined : 'us-east-1');
  const sesCredentials =
    buildStaticCredentials(
      env.AWS_SES_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID,
      env.AWS_SES_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY,
    ) ?? globalCredentials;

  if (isProd && sesEnabled && !sesRegion) {
    throw new Error(
      '[config] AWS_SES_REGION (or AWS_REGION) is required in production.',
    );
  }

  if (!isProd) {
    if (sesEnabled && !sesRegionRaw) {
      console.warn(
        '[config] AWS_SES_REGION is not set — defaulting to us-east-1.',
      );
    }
    if (sesEnabled && !sesCredentials) {
      console.warn(
        '[config] AWS SES credentials are not set — using the AWS SDK credential provider chain.',
      );
    }
  }

  const resolvedSesRegion = sesRegion ?? 'us-east-1';

  return Object.freeze({
    region: globalRegion ?? resolvedSesRegion,
    defaultRegion: globalRegion ?? resolvedSesRegion,
    credentials: globalCredentials,
    ses: Object.freeze({
      enabled: sesEnabled,
      region: resolvedSesRegion,
      credentials: sesCredentials,
      client: buildAwsClientOptions(resolvedSesRegion, sesCredentials),
    }),
  });
};

/**
 * @param {NodeJS.ProcessEnv} env
 */
const buildQueueConfig = (env) => {
  const queue = z
    .object({
      PENDING_REQUEST_ENQUEUE_BATCH_SIZE: z.coerce
        .number()
        .int()
        .positive()
        .default(100),
      PENDING_REQUEST_EMAIL_CONCURRENCY: z.coerce
        .number()
        .int()
        .positive()
        .default(10),
      PENDING_REQUEST_SCAN_BATCH_SIZE: z.coerce
        .number()
        .int()
        .positive()
        .default(500),
    })
    .parse({
      PENDING_REQUEST_ENQUEUE_BATCH_SIZE:
        env.PENDING_REQUEST_ENQUEUE_BATCH_SIZE,
      PENDING_REQUEST_EMAIL_CONCURRENCY: env.PENDING_REQUEST_EMAIL_CONCURRENCY,
      PENDING_REQUEST_SCAN_BATCH_SIZE: env.PENDING_REQUEST_SCAN_BATCH_SIZE,
    });

  return Object.freeze({
    bullmq: Object.freeze({
      prefix: 'devtinder:bull',
    }),
    pendingRequestEmail: Object.freeze({
      enqueueBatchSize: queue.PENDING_REQUEST_ENQUEUE_BATCH_SIZE,
      emailWorkerConcurrency: queue.PENDING_REQUEST_EMAIL_CONCURRENCY,
      scanCursorBatchSize: queue.PENDING_REQUEST_SCAN_BATCH_SIZE,
      defaultJobOptions: Object.freeze({
        removeOnComplete: { count: 1_000 },
        removeOnFail: { count: 5_000 },
        attempts: 3,
        backoff: Object.freeze({ type: 'exponential', delay: 5_000 }),
      }),
    }),
  });
};

/**
 * @param {NodeJS.ProcessEnv} env
 */
const buildRazorpayConfig = (env) => {
  const razorpay = z
    .object({
      RAZORPAY_KEY_ID: z
        .string()
        .trim()
        .regex(/^rzp_(live|test)_[A-Za-z0-9]+$/, 'Invalid Razorpay key ID'),
      RAZORPAY_KEY_SECRET: z
        .string()
        .trim()
        .min(20, 'Invalid Razorpay key secret'),
      RAZORPAY_WEBHOOK_SECRET: z.string().trim().optional(),
    })
    .parse({
      RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: env.RAZORPAY_WEBHOOK_SECRET,
    });

  return Object.freeze({
    key: razorpay.RAZORPAY_KEY_ID,
    secret: razorpay.RAZORPAY_KEY_SECRET,
    webhookSecret: razorpay.RAZORPAY_WEBHOOK_SECRET,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

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
      TZ: timezoneSchema,
      UV_THREADPOOL_SIZE: uvThreadpoolSizeSchema,
      // Redis validated via Zod, not raw fallback
      REDIS_URL: redisUrlSchema,
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
      TZ: env.TZ,
      UV_THREADPOOL_SIZE: env.UV_THREADPOOL_SIZE,
      REDIS_URL: env.REDIS_URL,
    });

  const envName = runtime.NODE_ENV;
  const isProd = envName === 'production';
  const isDev = envName === 'development';
  const isTest = envName === 'test';

  return Object.freeze({
    env: envName,
    isProd,
    isDev,
    isTest,
    port: runtime.PORT,
    host: runtime.HOST,
    timezone: runtime.TZ,
    uvThreadpoolSize: runtime.UV_THREADPOOL_SIZE,
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
      user: runtime.DB_USER,
      pass: runtime.DB_PASS,
    }),
    redis: Object.freeze({ url: runtime.REDIS_URL }),
    queues: buildQueueConfig(env),
    jwt: buildJwtConfig(env, isProd),
    aws: buildAWSConfig(env, isProd),
    razorpay: buildRazorpayConfig(env),
  });
};
