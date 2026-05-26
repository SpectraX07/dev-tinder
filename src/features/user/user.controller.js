import { AppError } from '../../core/responseHandler.js';
import catchAsync from '../../utils/CatchAsync.js';
import * as userService from './user.service.js';
import jwt from 'jsonwebtoken';
import serverConfig from '../../config/server.js';

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

  const token = await userData.getJWT();

  res.cookie(serverConfig.jwt.access.cookieName, token);

  res.respond.ok({
    token,
  });
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

export const logout = catchAsync(async (req, res, next) => {
  res.clearCookie(serverConfig.jwt.access.cookieName);
  res.respond.ok(null, 'You have been logged out.');
});
