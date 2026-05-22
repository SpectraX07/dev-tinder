import { describe, expect, it } from 'vitest';

import { TOKEN_KIND } from '../../src/utils/jwt/constants.js';
import {
  extractBearerToken,
  extractTokenFromCookie,
  extractTokenFromRequest,
} from '../../src/utils/jwt/extractor.js';

describe('extractTokenFromRequest', () => {
  const token = 'header.jwt.token';

  it('prefers header when prefer=header', () => {
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: { accessToken: 'cookie-token' },
    };
    expect(extractTokenFromRequest(req, { prefer: 'header' })).toBe(token);
  });

  it('prefers cookie when prefer=cookie', () => {
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: { accessToken: 'cookie-token' },
    };
    expect(extractTokenFromRequest(req, { prefer: 'cookie' })).toBe(
      'cookie-token',
    );
  });

  it('falls back to cookie when header missing', () => {
    const req = { headers: {}, cookies: { accessToken: 'cookie-only' } };
    expect(extractTokenFromRequest(req)).toBe('cookie-only');
  });

  it('extracts refresh cookie by kind', () => {
    const req = { cookies: { refreshToken: 'refresh.jwt.here' } };
    expect(extractTokenFromCookie(req, TOKEN_KIND.REFRESH)).toBe(
      'refresh.jwt.here',
    );
  });

  it('returns null for invalid bearer scheme', () => {
    const req = { headers: { authorization: 'Basic abc' } };
    expect(extractBearerToken(req)).toBeNull();
  });
});
