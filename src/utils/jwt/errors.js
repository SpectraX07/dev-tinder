import * as jose from 'jose';

/** @readonly */
export const JWT_ERROR_CODE = Object.freeze({
  MISSING: 'JWT_MISSING',
  MALFORMED: 'JWT_MALFORMED',
  EXPIRED: 'JWT_EXPIRED',
  INVALID_SIGNATURE: 'JWT_INVALID_SIGNATURE',
  INVALID_CLAIMS: 'JWT_INVALID_CLAIMS',
  WRONG_TOKEN_TYPE: 'JWT_WRONG_TOKEN_TYPE',
  REVOKED: 'JWT_REVOKED',
  CONFIG: 'JWT_CONFIG',
});

/**
 * Operational JWT failure — map to HTTP 401 in middleware via verifyAccessOrThrow.
 */
export class JwtError extends Error {
  /**
   * @param {string} message
   * @param {typeof JWT_ERROR_CODE[keyof typeof JWT_ERROR_CODE]} code
   * @param {unknown} [cause]
   */
  constructor(message, code, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'JwtError';
    this.code = code;
    this.isOperational = true;
  }
}

/**
 * Maps `jose` verification errors into {@link JwtError}.
 *
 * @param {unknown} err
 * @returns {JwtError}
 */
export const mapJoseError = (err) => {
  if (err instanceof JwtError) return err;

  if (err instanceof jose.errors.JWTExpired) {
    return new JwtError('Token has expired', JWT_ERROR_CODE.EXPIRED, err);
  }

  if (err instanceof jose.errors.JWSSignatureVerificationFailed) {
    return new JwtError(
      'Invalid token signature',
      JWT_ERROR_CODE.INVALID_SIGNATURE,
      err,
    );
  }

  if (err instanceof jose.errors.JWTClaimValidationFailed) {
    return new JwtError(
      err.message ?? 'Token claim validation failed',
      JWT_ERROR_CODE.INVALID_CLAIMS,
      err,
    );
  }

  if (err instanceof jose.errors.JOSEError) {
    return new JwtError(
      err.message ?? 'Invalid token',
      JWT_ERROR_CODE.MALFORMED,
      err,
    );
  }

  return new JwtError(
    err instanceof Error ? err.message : 'Token verification failed',
    JWT_ERROR_CODE.MALFORMED,
    err,
  );
};
