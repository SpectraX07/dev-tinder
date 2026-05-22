import { JWT_ERROR_CODE, JwtError } from './errors.js';
import { getSessionStore } from './session-store.js';
import { signTokenPair } from './signer.js';
import { verifyRefreshToken } from './verifier.js';

export const rotateTokenPair = async (
  refreshToken,
  { claims = {}, onRotate } = {},
) => {
  const { payload } = await verifyRefreshToken(refreshToken);
  const subject = payload.sub;

  if (!subject) {
    throw new JwtError(
      'Refresh token missing subject',
      JWT_ERROR_CODE.INVALID_CLAIMS,
    );
  }

  const store = getSessionStore();
  if (typeof payload.jti === 'string') {
    await store.revoke(payload.jti, payload.exp);
  }

  if (onRotate) {
    await onRotate({ subject, oldPayload: payload });
  }

  return signTokenPair(subject, { claims });
};
