import { AppError } from '../../core/responseHandler.js';
import catchAsync from '../../utils/CatchAsync.js';
import * as userService from './user.service.js';
import jwt from 'jsonwebtoken';
import serverConfig from '../../config/server.js';

/**
 * GET /userDetails?email=
 */
export const getUserByEmail = catchAsync(async (req, res) => {
  const user = await userService.getUserByEmail(req.query.email);
  res.respond.ok({ user });
});

/**
 * GET /:id
 */
export const getUserById = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.respond.ok({ user });
});

/**
 * PATCH /:id
 */
export const updateUser = catchAsync(async (req, res) => {
  const isEmailExists = await userService.isEmailExists(
    req.body?.email,
    req.params?.id,
  );

  const updated = await userService.updateUser(req.params.id, req.body);
  res.respond.ok({ user: updated });
});

/**
 * DELETE /:id
 */
export const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.respond.noContent();
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
  const cookie = req.cookies;
  res.respond.ok(req.user);
});

/**
 * POST logout
 */

export const logout = catchAsync(async (req, res, next) => {
  res.clearCookie(serverConfig.jwt.access.cookieName);
  res.respond.ok(null, 'You have been logged out.');
});
