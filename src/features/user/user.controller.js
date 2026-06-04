import { AppError } from '../../core/responseHandler.js';
import catchAsync from '../../utils/CatchAsync.js';
import serverConfig from '../../core/server.js';
import { TOKEN_KIND } from '../../utils/jwt/constants.js';
import { getTokenCookieOptions } from '../../utils/jwt/cookies.js';
import * as userService from './user.service.js';
import sendEmail from '../../utils/aws-ses/emailService.js';
import sendWelcomeEmail from '../../templates/email/welcome.js';

/**
 * PATCH /:id
 */
export const updateUser = catchAsync(async (req, res) => {
  const updated = await userService.updateUser(req.user._id, req.body);
  res.respond.ok({ user: updated });
});

/**
 * PATCH /password
 */
export const changePassword = catchAsync(async (req, res) => {
  const user = req.user;
  const isCurrentPasswordValid = await user.comparePassword(
    req.body.currentPassword,
  );
  if (!isCurrentPasswordValid) {
    throw AppError.forbidden('Current password is not valid');
  }
  const response = await userService.changePassword(req.user._id, req.body);
  res.respond.ok(response);
});

/**
 * POST /signup
 */
export const signup = catchAsync(async (req, res) => {
  await userService.isEmailExists(req.body?.email);

  const insert = await userService.createUser(req.body);
  await sendEmail(
    sendWelcomeEmail(insert.email, `${insert.firstName} ${insert.lastName}`),
  );
  res.respond.created(insert);
});

/**
 * POST /login
 */

export const doLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const userData = await userService.getUserByEmailForLogin(email);
  const isPasswordCorrect = await userData.comparePassword(password);
  if (!isPasswordCorrect) {
    throw AppError.unauthorized('Invalid credentials');
  }

  const tokenPair = await userService.issueTokenPair(userData._id);

  res.cookie(
    serverConfig.jwt.access.cookieName,
    tokenPair.accessToken,
    getTokenCookieOptions(TOKEN_KIND.ACCESS),
  );
  res.cookie(
    serverConfig.jwt.refresh.cookieName,
    tokenPair.refreshToken,
    getTokenCookieOptions(TOKEN_KIND.REFRESH),
  );

  res.respond.ok(userData);
});

/**
 * GET profile
 */

export const getProfileDetails = catchAsync(async (req, res) => {
  res.respond.ok(req.user);
});

/**
 * POST logout
 */

export const logout = catchAsync(async (req, res) => {
  res.clearCookie(
    serverConfig.jwt.access.cookieName,
    getTokenCookieOptions(TOKEN_KIND.ACCESS),
  );
  res.clearCookie(
    serverConfig.jwt.refresh.cookieName,
    getTokenCookieOptions(TOKEN_KIND.REFRESH),
  );
  res.respond.ok(null, 'You have been logged out.');
});

export const getFeed = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const response = await userService.getFeed(req.user._id, page, limit);
  res.respond.ok(response);
});
