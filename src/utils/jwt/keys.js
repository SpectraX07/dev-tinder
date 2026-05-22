import * as jose from 'jose';

import serverConfig from '../../config/server.js';
import { TOKEN_KIND } from './constants.js';
import { JWT_ERROR_CODE, JwtError } from './errors.js';

const jwtConfig = serverConfig.jwt;

/** @type {Map<string, Map<string, Uint8Array>>} */
const symmetricKeyCache = new Map();

/** @type {Map<string, CryptoKey>} */
const asymmetricKeyCache = new Map();

/** @type {ReturnType<typeof jose.createRemoteJWKSet> | null} */
let remoteJwks = null;

/** @param {string} pem */
const normalizePem = (pem) => pem.replace(/\\n/g, '\n').trim();

export const clearSigningKeyCache = () => {
  symmetricKeyCache.clear();
  asymmetricKeyCache.clear();
  remoteJwks = null;
};

/** @param {string} raw @param {string} label */
const getSymmetricKey = (raw, label) => {
  let bySecret = symmetricKeyCache.get(label);
  if (!bySecret) {
    bySecret = new Map();
    symmetricKeyCache.set(label, bySecret);
  }

  const cached = bySecret.get(raw);
  if (cached) return cached;

  if (raw.length < jwtConfig.minSecretLength) {
    throw new JwtError(
      `${label} must be at least ${jwtConfig.minSecretLength} characters`,
      JWT_ERROR_CODE.CONFIG,
    );
  }

  const key = new TextEncoder().encode(raw);
  bySecret.set(raw, key);
  return key;
};

/** @param {string} pem @param {'RS256' | 'ES256'} algorithm @param {'private' | 'public'} role */
const importAsymmetricKey = async (pem, algorithm, role) => {
  const cacheKey = `${algorithm}:${role}:${pem.slice(0, 32)}`;
  const cached = asymmetricKeyCache.get(cacheKey);
  if (cached) return cached;

  const normalized = normalizePem(pem);
  const key =
    role === 'private'
      ? await jose.importPKCS8(normalized, algorithm)
      : await jose.importSPKI(normalized, algorithm);

  asymmetricKeyCache.set(cacheKey, key);
  return key;
};

const getRemoteJwks = () => {
  if (!jwtConfig.jwksUri) {
    throw new JwtError('JWKS URI is not configured', JWT_ERROR_CODE.CONFIG);
  }
  if (!remoteJwks) {
    remoteJwks = jose.createRemoteJWKSet(new URL(jwtConfig.jwksUri));
  }
  return remoteJwks;
};

/** @param {import('./constants.js').TokenKind} kind */
export const getSigningKey = async (kind) => {
  if (jwtConfig.mode === 'symmetric') {
    const cfg =
      kind === TOKEN_KIND.REFRESH ? jwtConfig.refresh : jwtConfig.access;
    return getSymmetricKey(cfg.secret, `${kind} secret`);
  }

  const { privateKey } = jwtConfig.asymmetric;
  if (!privateKey) {
    throw new JwtError(
      'JWT_PRIVATE_KEY is required for asymmetric signing',
      JWT_ERROR_CODE.CONFIG,
    );
  }

  return importAsymmetricKey(
    privateKey,
    /** @type {'RS256' | 'ES256'} */ (jwtConfig.algorithm),
    'private',
  );
};

/** @param {import('./constants.js').TokenKind} kind */
export const getVerificationKey = async (kind) => {
  if (jwtConfig.jwksUri) return getRemoteJwks();

  if (jwtConfig.mode === 'symmetric') return getSigningKey(kind);

  const { publicKey } = jwtConfig.asymmetric;
  if (!publicKey) {
    throw new JwtError(
      'JWT_PUBLIC_KEY (or JWT_JWKS_URI) is required for asymmetric verification',
      JWT_ERROR_CODE.CONFIG,
    );
  }

  return importAsymmetricKey(
    publicKey,
    /** @type {'RS256' | 'ES256'} */ (jwtConfig.algorithm),
    'public',
  );
};

export const getSigningHeader = () => {
  /** @type {jose.JWTHeaderParameters} */
  const header = { alg: jwtConfig.algorithm };
  if (jwtConfig.keyId) header.kid = jwtConfig.keyId;
  return header;
};

export const getSecretForKind = getSigningKey;
