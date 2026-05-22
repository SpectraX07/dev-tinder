/** @typedef {'access' | 'refresh'} TokenKind */

/** @typedef {Record<string, unknown>} JwtClaims */

export const TOKEN_KIND = Object.freeze({
  ACCESS: /** @type {const} */ ('access'),
  REFRESH: /** @type {const} */ ('refresh'),
});

/** Standard claim used to distinguish access vs refresh tokens. */
export const CLAIM_TOKEN_TYPE = 'tokenType';
