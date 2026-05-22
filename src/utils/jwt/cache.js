import { clearDurationCache } from './duration.js';
import { clearSigningKeyCache } from './keys.js';

/**
 * Clears in-memory JWT caches. Tests and local hot-reload only — restart in production.
 */
import { resetSessionStore } from './session-store.js';

/** Clears in-memory JWT caches only (does not disconnect Redis). */
export const clearJwtCaches = () => {
  clearSigningKeyCache();
  clearDurationCache();
  resetSessionStore();
};
