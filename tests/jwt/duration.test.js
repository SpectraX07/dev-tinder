import { describe, expect, it } from 'vitest';

import { expiresInToSeconds, MAX_DURATION_VALUE } from '../../src/utils/jwt/duration.js';
import { JwtError, JWT_ERROR_CODE } from '../../src/utils/jwt/errors.js';

describe('expiresInToSeconds', () => {
  it('parses compact and word durations', () => {
    expect(expiresInToSeconds('15m')).toBe(900);
    expect(expiresInToSeconds('2 weeks')).toBe(1_209_600);
  });

  it('rejects zero and oversized numeric values', () => {
    expect(() => expiresInToSeconds('0m')).toThrow(JwtError);
    expect(() => expiresInToSeconds(`${MAX_DURATION_VALUE + 1}m`)).toThrow(
      JwtError,
    );
  });

  it('rejects total duration above cap', () => {
    try {
      expiresInToSeconds(`${MAX_DURATION_VALUE}y`);
    } catch (e) {
      expect(e).toBeInstanceOf(JwtError);
      expect(/** @type {JwtError} */ (e).code).toBe(JWT_ERROR_CODE.CONFIG);
    }
  });

  it('rejects invalid format', () => {
    expect(() => expiresInToSeconds('not-a-duration')).toThrow(JwtError);
  });
});
