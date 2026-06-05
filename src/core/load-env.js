import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenvx from '@dotenvx/dotenvx';

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

/**
 * Resolve which environment file suffix to load.
 * @returns {string}
 */
export const resolveEnvName = () => {
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  if (process.env.VITEST === 'true' || process.env.VITEST) {
    return 'test';
  }
  return 'development';
};

/**
 * Load layered env files into `process.env` (later files override earlier).
 * Order: `.env` → `.env.<NODE_ENV>` → `.env.local`
 *
 * @param {{ envName?: string }} [options]
 * @returns {string} Resolved NODE_ENV after load
 */
export const loadEnv = (options = {}) => {
  if (globalThis.__devtinderEnvLoaded) {
    return process.env.NODE_ENV ?? resolveEnvName();
  }
  const envName = options.envName ?? resolveEnvName();

  const candidates = ['.env', `.env.${envName}`, '.env.local'];

  const paths = candidates
    .map((file) => resolve(projectRoot, file))
    .filter((filePath) => existsSync(filePath));

  if (paths.length === 0) {
    console.warn(
      `[load-env] No env files found for "${envName}" (checked ${candidates.join(', ')})`,
    );
    return envName;
  }

  dotenvx.config({ path: paths, quiet: true });
  globalThis.__devtinderEnvLoaded = true;

  return process.env.NODE_ENV ?? envName;
};

loadEnv();
