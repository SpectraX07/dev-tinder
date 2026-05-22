import * as jose from 'jose';

import serverConfig from '../../config/server.js';
import { AppError } from '../../core/responseHandler.js';
import { CLAIM_TOKEN_TYPE, TOKEN_KIND } from './constants.js';
import { JWT_ERROR_CODE, JwtError, mapJoseError } from './errors.js';
import { getVerificationKey } from './keys.js';
import { assertSessionActive } from './session-store.js';
import { extractTokenFromRequest } from './extractor.js';

const jwtConfig = serverConfig.jwt;

export const verifyToken = async (token, expectedKind) => {
  if (!expectedKind) {
    throw new JwtError(
      'expectedKind is required — use verifyAccessToken or verifyRefreshToken',
      JWT_ERROR_CODE.CONFIG,
    );
  }

  if (!token || typeof token !== 'string') {
    throw new JwtError('Token is required', JWT_ERROR_CODE.MISSING);
  }

  const trimmed = token.trim();
  if (!trimmed) {
    throw new JwtError('Token is required', JWT_ERROR_CODE.MISSING);
  }

  try {
    const key = await getVerificationKey(expectedKind);
    const result = await jose.jwtVerify(trimmed, key, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithms: jwtConfig.algorithms,
      clockTolerance: jwtConfig.clockTolerance,
    });

    const payloadKind = result.payload[CLAIM_TOKEN_TYPE];

    if (typeof payloadKind !== 'string' || payloadKind !== expectedKind) {
      throw new JwtError(
        `Expected ${expectedKind} token`,
        JWT_ERROR_CODE.WRONG_TOKEN_TYPE,
      );
    }

    if (!result.payload.sub) {
      throw new JwtError(
        'Token is missing subject (sub)',
        JWT_ERROR_CODE.INVALID_CLAIMS,
      );
    }

    if (expectedKind === TOKEN_KIND.REFRESH) {
      const jti = typeof result.payload.jti === 'string' ? result.payload.jti : undefined;
      await assertSessionActive(jti);
    }

    return {
      payload: result.payload,
      protectedHeader: result.protectedHeader,
      kind: expectedKind,
    };
  } catch (err) {
    throw mapJoseError(err);
  }
};

export const verifyAccessToken = (token) =>
  verifyToken(token, TOKEN_KIND.ACCESS);

export const verifyRefreshToken = (token) =>
  verifyToken(token, TOKEN_KIND.REFRESH);

export const verifyAccessOrThrow = async (token) => {
  try {
    return await verifyAccessToken(token);
  } catch (err) {
    if (err instanceof JwtError) {
      throw AppError.unauthorized(err.message);
    }
    throw err;
  }
};

export const verifyRequestAccessOrThrow = async (req, options) => {
  const token = extractTokenFromRequest(req, {
    ...options,
    kind: TOKEN_KIND.ACCESS,
  });

  if (!token) {
    throw AppError.unauthorized('Authentication token is required');
  }

  return verifyAccessOrThrow(token);
};
