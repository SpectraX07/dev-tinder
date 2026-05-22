import * as jose from 'jose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JWT_ERROR_CODE } from '../../src/utils/jwt/errors.js';

const TEST_SUBJECT = '507f1f77bcf86cd799439011';

/** @returns {Promise<typeof import('../../src/utils/jwt.js')>} */
const loadJwt = async () => {
  vi.resetModules();
  return import('../../src/utils/jwt.js');
};

describe('JWT auth', () => {
  /** @type {typeof import('../../src/utils/jwt.js')} */
  let jwt;

  beforeEach(async () => {
    jwt = await loadJwt();
    jwt.clearJwtCaches();
    jwt.resetSessionStore();
    await jwt.initSessionStore();
  });

  afterEach(async () => {
    if (jwt) await jwt.closeSessionStore();
    vi.resetModules();
  });

  it('signs and verifies access token', async () => {
    const token = await jwt.signAccessToken(TEST_SUBJECT);
    const verified = await jwt.verifyAccessToken(token);
    expect(verified.payload.sub).toBe(TEST_SUBJECT);
    expect(verified.kind).toBe('access');
  });

  it('rejects access token verified as refresh (wrong secret)', async () => {
    const access = await jwt.signAccessToken(TEST_SUBJECT);
    await expect(jwt.verifyRefreshToken(access)).rejects.toMatchObject({
      code: JWT_ERROR_CODE.INVALID_SIGNATURE,
    });
  });

  it('rejects wrong tokenType claim on valid signature', async () => {
    const refresh = await jwt.signRefreshToken(TEST_SUBJECT);
    const { payload } = await jwt.verifyRefreshToken(refresh);
    expect(payload.tokenType).toBe('refresh');

    const access = await jwt.signAccessToken(TEST_SUBJECT);
    const { payload: accessPayload } = await jwt.verifyAccessToken(access);
    expect(accessPayload.tokenType).toBe('access');
  });

  it('rejects malformed token', async () => {
    await expect(jwt.verifyAccessToken('not.a.jwt')).rejects.toMatchObject({
      code: JWT_ERROR_CODE.MALFORMED,
    });
  });

  it('rejects expired token beyond clock tolerance', async () => {
    const secret = new TextEncoder().encode(
      process.env.JWT_ACCESS_SECRET ?? '',
    );
    const exp = Math.floor(Date.now() / 1000) - 30;
    const token = await new jose.SignJWT({ tokenType: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(TEST_SUBJECT)
      .setIssuer('devTinder')
      .setAudience('devTinder:api')
      .setExpirationTime(exp)
      .sign(secret);

    await expect(jwt.verifyAccessToken(token)).rejects.toMatchObject({
      code: JWT_ERROR_CODE.EXPIRED,
    });
  });

  it('accepts token within clock tolerance', async () => {
    const secret = new TextEncoder().encode(
      process.env.JWT_ACCESS_SECRET ?? '',
    );
    const exp = Math.floor(Date.now() / 1000) - 3;
    const token = await new jose.SignJWT({ tokenType: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(TEST_SUBJECT)
      .setIssuer('devTinder')
      .setAudience('devTinder:api')
      .setExpirationTime(exp)
      .sign(secret);

    const verified = await jwt.verifyAccessToken(token);
    expect(verified.payload.sub).toBe(TEST_SUBJECT);
  });

  it('rotates refresh pair and revokes old jti', async () => {
    const pair = await jwt.signTokenPair(TEST_SUBJECT);
    const first = await jwt.verifyRefreshToken(pair.refreshToken);
    expect(typeof first.payload.jti).toBe('string');

    const rotated = await jwt.rotateTokenPair(pair.refreshToken);
    expect(rotated.accessToken).toBeTruthy();

    await expect(jwt.verifyRefreshToken(pair.refreshToken)).rejects.toMatchObject(
      { code: JWT_ERROR_CODE.REVOKED },
    );

    await jwt.verifyRefreshToken(rotated.refreshToken);
  });

  it('supports RS256 when PEM keys are configured', async () => {
    vi.resetModules();
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256', {
      extractable: true,
    });
    const privatePem = await jose.exportPKCS8(privateKey);
    const publicPem = await jose.exportSPKI(publicKey);

    process.env.JWT_ALGORITHM = 'RS256';
    process.env.JWT_PRIVATE_KEY = privatePem;
    process.env.JWT_PUBLIC_KEY = publicPem;
    process.env.JWT_KEY_ID = 'test-key-1';

    const rsJwt = await loadJwt();
    const token = await rsJwt.signAccessToken(TEST_SUBJECT);
    const header = jose.decodeProtectedHeader(token);
    expect(header.alg).toBe('RS256');
    expect(header.kid).toBe('test-key-1');

    const verified = await rsJwt.verifyAccessToken(token);
    expect(verified.payload.sub).toBe(TEST_SUBJECT);

    process.env.JWT_ALGORITHM = 'HS256';
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.JWT_KEY_ID;
  });
});
