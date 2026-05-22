import { AppError } from '../../core/responseHandler.js';
import catchAsync from '../../utils/CatchAsync.js';
import { verifyAccessToken } from '../../utils/jwt.js';
import { signAccessToken, signToken } from '../../utils/jwt/signer.js';
import * as userService from './user.service.js';
import jwt from 'jsonwebtoken';

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

  // const token = await jwt.sign(
  //   { userId: userData._id },
  //   process.env.JWT_ACCESS_SECRET,
  // );

  const token = await signAccessToken(String(userData._id), {
    claims: { userId: String(userData._id) }, // only if you need userId in the token body in addition to sub
  });
  const { payload } = await verifyAccessToken(token);
  res.cookie('token', token);

  res.respond.ok({
    token,
    payload,
  });
});

/**
 * GET profile
 */

export const getProfileDetails = catchAsync(async (req, res) => {
  const cookie = req.cookies;
  console.log(cookie);
});
