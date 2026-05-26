/**
 * @fileoverview HTTP status registry, Express `res.respond` helpers, `AppError`,
 *               `ValidationError`, Zod global error-map, injectable error logging, and error middleware.
 * @author Subrata Jana
 */

import * as z from 'zod';

import serverConfig from '../config/server.js';

/** `true` in development — derived from `config/server.js` `env` (same as `app.js`). */
const IS_DEV = serverConfig.isDev;

/**
 * Logger used by {@link errorMiddleware} (and related paths). Swap for pino, winston, etc.
 *
 * @typedef {object} ResponseLogger
 * @property {(...args: unknown[]) => void} error Same variadic shape as `console.error`
 *   (works with `pino`’s `logger.error(obj, msg)` or plain strings).
 */

/** @type {ResponseLogger} */
const defaultResponseLogger = {
  error: (...args) => {
    console.error(...args);
  },
};

/** @type {ResponseLogger} */
let responseLogger = defaultResponseLogger;

/**
 * Installs the logger used for server-side error reporting. Call once at startup.
 *
 * @param {ResponseLogger} logger Must define `error(...args)`.
 *
 * @example
 * import pino from 'pino';
 * const log = pino({ level: serverConfig.logLevel });
 * setResponseLogger(log);
 *
 * @example
 * setResponseLogger({ error: (...a) => myWinston.error(...a) });
 */
export const setResponseLogger = (logger) => {
  if (!logger || typeof logger.error !== 'function') {
    throw new TypeError(
      'setResponseLogger(): logger must be an object with an error() method',
    );
  }
  responseLogger = logger;
};

/** Restores the default logger (`console.error`). Useful in tests. */
export const resetResponseLogger = () => {
  responseLogger = defaultResponseLogger;
};

/** Current logger (read-only use; prefer {@link setResponseLogger} to replace). */
export const getResponseLogger = () => responseLogger;

/** HTTP status codes for the API and error layer. */
export const HTTP = Object.freeze({
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  MULTI_STATUS: 207,
  ALREADY_REPORTED: 208,
  IM_USED: 226,
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTH_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  IM_A_TEAPOT: 418,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_ENTITY: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  HEADERS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NOT_EXTENDED: 510,
  NETWORK_AUTH_REQUIRED: 511,
});

/**
 * Registers a global Zod custom error map via `z.config({ customError })`.
 * Lowest precedence after schema-level and per-parse maps; use for i18n or defaults.
 *
 * Precedence (high to low): schema `error` → per-parse `error` in `safeParse` →
 * this global map → `z.config(z.locales.en())`.
 *
 * @param {(iss: z.core.$ZodIssue) => string | undefined} errorMap
 *
 * @example
 * import { configureGlobalErrorMap } from '../core/responseHandler.js';
 * configureGlobalErrorMap((iss) => {
 *   if (iss.code === 'invalid_type') return 'This field has an invalid type';
 * });
 */
export const configureGlobalErrorMap = (errorMap) => {
  z.config({ customError: errorMap });
};

/** Status codes that must not include a response body (RFC 7230 / 7231). */
const NOBODY_CODES = new Set([
  HTTP.NO_CONTENT,
  HTTP.NOT_MODIFIED,
  HTTP.RESET_CONTENT,
]);

const buildResponder = (res) => {
  /**
   * Sends JSON with a consistent envelope; used by all `res.respond` shorthands.
   * @param {number} statusCode
   * @param {Record<string, unknown> | null} [payload]
   */
  const send = (statusCode, payload = null, message = null) => {
    if (NOBODY_CODES.has(statusCode)) return res.status(statusCode).end();

    const isSuccess = statusCode < 400;
    return res.status(statusCode).json(
      isSuccess
        ? {
            status: 'success',
            statusCode,
            ...(message !== null && { message }),
            ...(payload !== null && { data: payload }),
          }
        : { status: 'error', statusCode, ...(payload !== null && payload) },
    );
  };

  return {
    /** Any status: `res.respond.send(HTTP.ACCEPTED, { jobId })`. */
    send,
    ok: (data, message) => send(HTTP.OK, data, message),
    created: (data, message) => send(HTTP.CREATED, data, message),
    accepted: (data, message) => send(HTTP.ACCEPTED, data, message),
    noContent: () => send(HTTP.NO_CONTENT),
    partialContent: (data, message) =>
      send(HTTP.PARTIAL_CONTENT, data, message),
    notModified: () => send(HTTP.NOT_MODIFIED),
    badRequest: (msg, extra) =>
      send(HTTP.BAD_REQUEST, { message: msg, ...extra }),
    unauthorized: (msg, extra) =>
      send(HTTP.UNAUTHORIZED, { message: msg ?? 'Unauthorized', ...extra }),
    forbidden: (msg, extra) =>
      send(HTTP.FORBIDDEN, { message: msg ?? 'Forbidden', ...extra }),
    notFound: (msg, extra) =>
      send(HTTP.NOT_FOUND, { message: msg ?? 'Not found', ...extra }),
    conflict: (msg, extra) => send(HTTP.CONFLICT, { message: msg, ...extra }),
    gone: (msg, extra) => send(HTTP.GONE, { message: msg, ...extra }),
    unprocessable: (msg, extra) =>
      send(HTTP.UNPROCESSABLE_ENTITY, { message: msg, ...extra }),
    tooManyRequests: (msg, extra) =>
      send(HTTP.TOO_MANY_REQUESTS, {
        message: msg ?? 'Too many requests',
        ...extra,
      }),
    internal: (msg, extra) =>
      send(HTTP.INTERNAL_SERVER_ERROR, {
        message: IS_DEV ? msg : 'Something went wrong',
        ...extra,
      }),
    notImplemented: (msg, extra) =>
      send(HTTP.NOT_IMPLEMENTED, {
        message: msg ?? 'Not implemented',
        ...extra,
      }),
    badGateway: (msg, extra) =>
      send(HTTP.BAD_GATEWAY, { message: msg ?? 'Bad gateway', ...extra }),
    unavailable: (msg, extra) =>
      send(HTTP.SERVICE_UNAVAILABLE, {
        message: msg ?? 'Service unavailable',
        ...extra,
      }),
  };
};

/**
 * Attaches `res.respond` to each response. Register before route handlers.
 *
 * @type {import('express').RequestHandler}
 */
export const attach = (_req, res, next) => {
  res.respond = buildResponder(res);
  next();
};

/**
 * Operational or programming error with HTTP status and optional `meta` payload.
 * Static factories align with `res.respond` naming.
 *
 * @example
 * throw new AppError('User not found', HTTP.NOT_FOUND);
 * throw AppError.forbidden('Admins only');
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode]
   * @param {Record<string, unknown>} [meta] Merged into JSON body when present.
   * @param {boolean} [isOperational] When false, treated as a bug: always logged; message sanitized in prod.
   */
  constructor(
    message,
    statusCode = HTTP.INTERNAL_SERVER_ERROR,
    meta = {},
    isOperational = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.meta = meta;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest = (msg, meta) => new AppError(msg, HTTP.BAD_REQUEST, meta);
  static unauthorized = (msg, meta) =>
    new AppError(msg ?? 'Unauthorized', HTTP.UNAUTHORIZED, meta);
  static forbidden = (msg, meta) =>
    new AppError(msg ?? 'Forbidden', HTTP.FORBIDDEN, meta);
  static notFound = (msg, meta) =>
    new AppError(msg ?? 'Not found', HTTP.NOT_FOUND, meta);
  static conflict = (msg, meta) => new AppError(msg, HTTP.CONFLICT, meta);
  static gone = (msg, meta) => new AppError(msg, HTTP.GONE, meta);
  static unprocessable = (msg, meta) =>
    new AppError(msg, HTTP.UNPROCESSABLE_ENTITY, meta);
  static tooMany = (msg, meta) =>
    new AppError(msg ?? 'Too many requests', HTTP.TOO_MANY_REQUESTS, meta);
  static internal = (msg, meta) =>
    new AppError(
      msg ?? 'Internal server error',
      HTTP.INTERNAL_SERVER_ERROR,
      meta,
      false,
    );
  static unavailable = (msg, meta) =>
    new AppError(msg ?? 'Service unavailable', HTTP.SERVICE_UNAVAILABLE, meta);
}

/**
 * Validation failure with structured errors per request slice (`body` / `query` / `params`).
 * Created by `validate()` in `validate.middleware.js`; handled by {@link errorMiddleware}.
 */
export class ValidationError extends AppError {
  /**
   * @param {Record<string, unknown>} errors Keys are sources; values are formatter output (flat/tree/pretty).
   */
  constructor(errors) {
    super('Validation failed', HTTP.UNPROCESSABLE_ENTITY);
    this.name = 'ValidationError';
    /** @type {Record<string, unknown>} */
    this.errors = errors;
  }
}

/**
 * Sends an error-shaped JSON body without using `res.respond` (safe when `attach` did not run).
 *
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {Record<string, unknown>} payload
 */
const jsonError = (res, statusCode, payload) =>
  res.status(statusCode).json({ status: 'error', statusCode, ...payload });

/**
 * Maps errors to JSON responses. Handles `ValidationError`, `z.ZodError`, `AppError`,
 * malformed JSON (`SyntaxError` from `express.json()`), and unknown errors.
 *
 * Does not use `res.respond` so it stays safe when `attach` has not run or failed early.
 * Uses `z.flattenError` for raw `ZodError`; in development, logs `z.prettifyError`.
 *
 * If headers were already sent, only logs (avoids a double-send crash).
 *
 * Mount last: `app.use(errorMiddleware)`.
 *
 * @type {import('express').ErrorRequestHandler}
 */
export const errorMiddleware = (err, _req, res, _next) => {
  if (res.headersSent) {
    if (IS_DEV) {
      responseLogger.error(
        '[errorMiddleware] Response already sent; skipping JSON body.',
        err,
      );
    } else {
      responseLogger.error(
        '[errorMiddleware] Response already sent; skipping.',
        err.message,
      );
    }
    return;
  }

  if (!(err instanceof AppError) || !err.isOperational) {
    responseLogger.error('[Unhandled Error]', err);
  }

  if (err instanceof ValidationError) {
    return jsonError(res, HTTP.UNPROCESSABLE_ENTITY, {
      message: err.message,
      errors: err.errors,
    });
  }

  if (err instanceof z.ZodError) {
    if (IS_DEV) responseLogger.error('[ZodError]\n' + z.prettifyError(err));
    return jsonError(res, HTTP.UNPROCESSABLE_ENTITY, {
      message: 'Validation failed',
      errors: z.flattenError(err),
    });
  }

  if (err instanceof AppError) {
    return jsonError(res, err.statusCode, {
      message: err.isOperational ? err.message : 'Something went wrong',
      ...(Object.keys(err.meta).length && { meta: err.meta }),
    });
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return jsonError(res, HTTP.BAD_REQUEST, {
      message: 'Malformed JSON in request body',
    });
  }

  return jsonError(res, HTTP.INTERNAL_SERVER_ERROR, {
    message: IS_DEV ? err.message : 'Something went wrong',
    ...(IS_DEV && { stack: err.stack }),
  });
};
