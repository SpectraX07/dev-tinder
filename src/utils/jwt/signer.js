import * as jose from 'jose';

import serverConfig from '../../core/server.js';
import { CLAIM_TOKEN_TYPE, TOKEN_KIND } from './constants.js';
import { getSigningHeader, getSigningKey } from './keys.js';
import { expiresInToSeconds } from './duration.js';

const jwtConfig = serverConfig.jwt;

/**

 * @typedef {object} SignTokenOptions
 * @property {string} subject
 * @property {import('./constants.js').TokenKind} [kind='access']
 * @property {import('./constants.js').JwtClaims} [claims]
 * @property {string} [expiresIn]
 * @property {string} [jwtId]
 */

/**
 * @typedef {object} SignedToken
 * @property {string} token
 * @property {string | undefined} jti
 */

/**
 * @typedef {object} TokenPair
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {number} accessExpiresInSec
 * @property {number} refreshExpiresInSec
 */

export const signToken = async ({
  subject,
  kind = TOKEN_KIND.ACCESS,
  claims = {},
  expiresIn,
  jwtId,
}) => {
  const cfg =
    kind === TOKEN_KIND.REFRESH ? jwtConfig.refresh : jwtConfig.access;
  const ttl = expiresIn ?? cfg.expiresIn;
  const key = await getSigningKey(kind);
  const jti =
    jwtId ?? (jwtConfig.session.enabled ? crypto.randomUUID() : undefined);

  const builder = new jose.SignJWT({
    ...claims,
    [CLAIM_TOKEN_TYPE]: kind,
  })
    .setProtectedHeader(getSigningHeader())
    .setSubject(subject)
    .setIssuedAt()
    .setIssuer(jwtConfig.issuer)
    .setAudience(jwtConfig.audience)
    .setExpirationTime(ttl);

  if (jti) builder.setJti(jti);

  const token = await builder.sign(key);
  return { token, jti };
};

export const signTokenRaw = async (options) => (await signToken(options)).token;

export const signAccessToken = (subject, options = {}) =>
  signTokenRaw({ subject, kind: TOKEN_KIND.ACCESS, ...options });

export const signRefreshToken = (subject, options = {}) =>
  signTokenRaw({ subject, kind: TOKEN_KIND.REFRESH, ...options });

export const signTokenPair = async (subject, options = {}) => {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(subject, options),
    signRefreshToken(subject, options),
  ]);

  return {
    accessToken,
    refreshToken,
    accessExpiresInSec: expiresInToSeconds(jwtConfig.access.expiresIn),
    refreshExpiresInSec: expiresInToSeconds(jwtConfig.refresh.expiresIn),
  };
};
