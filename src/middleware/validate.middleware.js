/**
 * @fileoverview Zod-based Express validation for `body`, `query`, and `params`.
 * @author Subrata Jana
 */

import * as z from 'zod';
import { ValidationError } from '../core/responseHandler.js';

export { ValidationError };

/**
 * @typedef {'body' | 'query' | 'params'} RequestSource
 */

const SOURCES = /** @type {const} */ (['body', 'query', 'params']);

/**
 * @param {Partial<Record<RequestSource, z.ZodTypeAny>>} schemas
 */
const hasAnySchema = (schemas) => SOURCES.some((key) => schemas[key] != null);

/**
 * Factory for middleware that validates request slices with Zod (`safeParseAsync`).
 *
 * **Atomic behavior:** all configured sources are parsed first. If any fail, `req` is
 * not mutated. On full success, parsed outputs are written to `req.body` / `req.query` /
 * `req.params` (coercions and transforms from Zod apply).
 *
 * **errorFormat**
 * - `flat` (default): `z.flattenError` — `formErrors` + `fieldErrors`.
 * - `tree`: `z.treeifyError` — nested paths for deep schemas.
 * - `pretty`: `z.prettifyError` — human-readable string (logs, tooling).
 *
 * **errorMap:** per-parse messages; precedence below schema-level `error`, above
 * `configureGlobalErrorMap` and locale defaults. See https://zod.dev/error-customization
 *
 * @param {Partial<Record<RequestSource, z.ZodTypeAny>>} schemas At least one of body, query, params.
 * @param {{
 *   errorFormat?: 'flat' | 'tree' | 'pretty',
 *   errorMap?: (iss: z.core.$ZodIssue) => string | undefined,
 *   assignParsed?: boolean,
 * }} [options]
 * @param {boolean} [options.assignParsed=true] When false, validates only; leaves `req` unchanged even on success.
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/login', validate({ body: loginSchema }), loginController);
 *
 * @example
 * router.get('/items/:id', validate({ params: idSchema, query: filterSchema }), getItem);
 */
export const validate = (schemas, options = {}) => {
  if (schemas == null || typeof schemas !== 'object') {
    throw new TypeError('validate(): schemas must be a non-null object.');
  }
  if (!hasAnySchema(schemas)) {
    throw new TypeError(
      'validate(): pass at least one schema — { body }, { query }, { params }, or a combination.',
    );
  }

  const { errorFormat = 'flat', errorMap, assignParsed = true } = options;

  const parseOptions = errorMap ? { error: errorMap } : undefined;

  return async (req, _res, next) => {
    /** @type {Partial<Record<RequestSource, unknown>>} */
    const parsed = {};
    /** @type {Partial<Record<RequestSource, unknown>>} */
    const errors = {};

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = await schema.safeParseAsync(req[source], parseOptions);

      if (result.success) {
        parsed[source] = result.data;
      } else {
        errors[source] = formatError(result.error, errorFormat);
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new ValidationError(errors));
    }

    if (assignParsed) {
      for (const source of SOURCES) {
        if (source in parsed) {
          req[source] = parsed[source];
        }
      }
    }

    return next();
  };
};

/**
 * @param {z.ZodError} error
 * @param {'flat' | 'tree' | 'pretty'} format
 */
const formatError = (error, format) => {
  switch (format) {
    case 'tree':
      return z.treeifyError(error);
    case 'pretty':
      return z.prettifyError(error);
    default:
      return z.flattenError(error);
  }
};

export const validateBody = (schema, opts) => validate({ body: schema }, opts);
export const validateQuery = (schema, opts) =>
  validate({ query: schema }, opts);
export const validateParams = (schema, opts) =>
  validate({ params: schema }, opts);
