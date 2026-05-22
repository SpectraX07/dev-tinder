import { JWT_ERROR_CODE, JwtError } from './errors.js';

/** Seconds per unit — year is 365d (config/TTL approximation, not calendar-accurate). */
const DURATION_UNIT_SECONDS = Object.freeze({
  s: 1,
  sec: 1,
  secs: 1,
  second: 1,
  seconds: 1,
  m: 60,
  min: 60,
  mins: 60,
  minute: 60,
  minutes: 60,
  h: 3600,
  hr: 3600,
  hrs: 3600,
  hour: 3600,
  hours: 3600,
  d: 86400,
  day: 86400,
  days: 86400,
  w: 604800,
  week: 604800,
  weeks: 604800,
  y: 31536000,
  yr: 31536000,
  yrs: 31536000,
  year: 31536000,
  years: 31536000,
});

/**
 * Supported `expiresIn` shapes for {@link expiresInToSeconds} and env config.
 *
 * @readonly
 */
export const SUPPORTED_EXPIRES_IN_EXAMPLES = Object.freeze([
  '15m',
  '7d',
  '2w',
  '1y',
  '90s',
  '2 hours',
  '3 weeks',
]);

/** Max numeric component in a duration string (e.g. 9999 in `9999d`). */
export const MAX_DURATION_VALUE = 10_000;

/** Max total TTL in seconds (~10 years). */
export const MAX_DURATION_SECONDS = 10 * 365 * 24 * 60 * 60;

const COMPACT_DURATION_RE = /^(\d+)([smhdwy])$/i;
const WORD_DURATION_RE = /^(\d+)\s+([a-z]+)$/i;

/** @type {Map<string, number>} */
const durationSecondsCache = new Map();

/**
 * @param {string} unit
 */
const resolveDurationUnit = (unit) => {
  const key = unit.toLowerCase();
  const seconds = DURATION_UNIT_SECONDS[/** @type {keyof typeof DURATION_UNIT_SECONDS} */ (key)];
  if (seconds === undefined) return null;
  return seconds;
};

/**
 * @param {string} expiresIn
 * @returns {boolean}
 */
export const isValidExpiresIn = (expiresIn) => {
  try {
    expiresInToSeconds(expiresIn);
    return true;
  } catch {
    return false;
  }
};

/**
 * @param {string} expiresIn
 * @returns {number}
 */
export const expiresInToSeconds = (expiresIn) => {
  const trimmed = expiresIn.trim();
  const cached = durationSecondsCache.get(trimmed);
  if (cached !== undefined) return cached;

  const compact = COMPACT_DURATION_RE.exec(trimmed);
  const word = compact ? null : WORD_DURATION_RE.exec(trimmed);
  const match = compact ?? word;

  if (!match) {
    throw new JwtError(
      `Invalid expiresIn: "${expiresIn}". Use compact (15m, 7d, 2w, 1y) or words (2 weeks, 1 year). Examples: ${SUPPORTED_EXPIRES_IN_EXAMPLES.join(', ')}`,
      JWT_ERROR_CODE.CONFIG,
    );
  }

  const value = Number(match[1]);
  if (value <= 0 || value > MAX_DURATION_VALUE) {
    throw new JwtError(
      `Duration value must be between 1 and ${MAX_DURATION_VALUE}: "${expiresIn}"`,
      JWT_ERROR_CODE.CONFIG,
    );
  }

  const unitSeconds = resolveDurationUnit(match[2]);

  if (!unitSeconds) {
    throw new JwtError(
      `Unknown expiresIn unit in "${expiresIn}". Supported: s/m/h/d/w/y and second|minute|hour|day|week|year (with optional plurals).`,
      JWT_ERROR_CODE.CONFIG,
    );
  }

  const total = value * unitSeconds;
  if (total > MAX_DURATION_SECONDS) {
    throw new JwtError(
      `Duration exceeds maximum of ${MAX_DURATION_SECONDS} seconds: "${expiresIn}"`,
      JWT_ERROR_CODE.CONFIG,
    );
  }

  durationSecondsCache.set(trimmed, total);
  return total;
};

export const clearDurationCache = () => {
  durationSecondsCache.clear();
};
