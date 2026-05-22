import * as jose from 'jose';

import { JWT_ERROR_CODE, JwtError } from './errors.js';

export const decodeTokenWithoutVerification = (token) => {
  if (!token?.trim()) {
    throw new JwtError('Token is required', JWT_ERROR_CODE.MISSING);
  }
  return jose.decodeJwt(token.trim());
};

/** @deprecated Use decodeTokenWithoutVerification. */
export const decodeTokenUnsafe = decodeTokenWithoutVerification;
