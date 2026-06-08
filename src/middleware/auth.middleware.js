import { AppError } from '../core/responseHandler.js';
import catchAsync from '../utils/catchAsync.js';
import * as userService from '../features/user/user.service.js';
import { verifyRequestAccessOrThrow } from '../utils/jwt/verifier.js';

export const userAuth = catchAsync(async (req, res, next) => {
  console.log(req.cookies);

  const { payload } = await verifyRequestAccessOrThrow(req, {
    prefer: 'cookie',
  });

  const user = await userService.getUserForAuth(payload.sub);
  if (!user) {
    throw AppError.unauthorized('User not found');
  }

  req.user = user;
  next();
});
