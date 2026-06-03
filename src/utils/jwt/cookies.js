import serverConfig from '../../config/server.js';
import { TOKEN_KIND } from './constants.js';
import { expiresInToSeconds } from './duration.js';

const jwtConfig = serverConfig.jwt;

export const getTokenCookieOptions = (kind = TOKEN_KIND.ACCESS) => {
  const cfg =
    kind === TOKEN_KIND.REFRESH ? jwtConfig.refresh : jwtConfig.access;
  const cookie = jwtConfig.cookie;

  const secure = cookie.secure ?? serverConfig.isProd;

  const options = {
    httpOnly: cookie.httpOnly,
    secure,
    sameSite: cookie.sameSite,
    maxAge: expiresInToSeconds(cfg.expiresIn) * 1000,
    path: cookie.path,
  };

  if (cookie.domain) {
    options.domain = cookie.domain;
  }
  console.log(options);

  return options;
};
