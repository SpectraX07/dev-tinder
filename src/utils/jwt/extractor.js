import serverConfig from '../../core/server.js';
import { TOKEN_KIND } from './constants.js';

const jwtConfig = serverConfig.jwt;

export const extractBearerToken = (req, headerName = 'authorization') => {
  const raw = req.headers[headerName.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value || typeof value !== 'string') return null;

  const [scheme, ...rest] = value.trim().split(/\s+/);
  if (!/^Bearer$/i.test(scheme)) return null;

  const token = rest.join(' ').trim();
  return token || null;
};

export const extractTokenFromCookie = (req, kind = TOKEN_KIND.ACCESS) => {
  const name =
    kind === TOKEN_KIND.REFRESH
      ? jwtConfig.refresh.cookieName
      : jwtConfig.access.cookieName;

  const token = req.cookies?.[name];
  return typeof token === 'string' && token.trim() ? token.trim() : null;
};

export const extractTokenFromRequest = (
  req,
  { prefer = 'any', kind = TOKEN_KIND.ACCESS } = {},
) => {
  const fromHeader = extractBearerToken(req);
  const fromCookie = extractTokenFromCookie(req, kind);

  if (prefer === 'header') return fromHeader;
  if (prefer === 'cookie') return fromCookie;

  return fromHeader ?? fromCookie;
};
