export { TOKEN_KIND, CLAIM_TOKEN_TYPE } from './constants.js';
export { JWT_ERROR_CODE, JwtError, mapJoseError } from './errors.js';
export {
  expiresInToSeconds,
  isValidExpiresIn,
  SUPPORTED_EXPIRES_IN_EXAMPLES,
} from './duration.js';
export { clearJwtCaches } from './cache.js';
export {
  getSigningKey,
  getVerificationKey,
  getSigningHeader,
  clearSigningKeyCache,
} from './keys.js';
export {
  RedisSessionStore,
  noopSessionStore,
  initSessionStore,
  getSessionStore,
  setSessionStore,
  resetSessionStore,
  closeSessionStore,
  assertSessionActive,
} from './session-store.js';
export { MAX_DURATION_VALUE, MAX_DURATION_SECONDS } from './duration.js';
export {
  signToken,
  signTokenRaw,
  signAccessToken,
  signRefreshToken,
  signTokenPair,
} from './signer.js';
export {
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyAccessOrThrow,
  verifyRequestAccessOrThrow,
} from './verifier.js';
export { decodeTokenWithoutVerification, decodeTokenUnsafe } from './decode.js';
export {
  extractBearerToken,
  extractTokenFromCookie,
  extractTokenFromRequest,
} from './extractor.js';
export { getTokenCookieOptions } from './cookies.js';
export { rotateTokenPair } from './rotation.js';

import serverConfig from '../../core/server.js';

export { serverConfig };
export const jwtConfig = serverConfig.jwt;
