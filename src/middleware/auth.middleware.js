import { AppError } from '../core/responseHandler.js';
import jwt from 'jsonwebtoken';
import catchAsync from '../utils/CatchAsync.js';
import * as userService from '../features/user/user.service.js';
import { request } from 'express';
import serverConfig from '../config/server.js';

export const userAuth = catchAsync(async (req, res, next) => {
  const { accessToken } = req.cookies;

  if (!accessToken) {
    throw AppError.unauthorized('Token not found');
  }

  const decodedObj = await jwt.verify(
    accessToken,
    serverConfig.jwt.access.secret,
  );

  const { userId } = decodedObj;

  const user = await userService.getUserById(userId);
  request.user = user;

  if (!user) {
    throw AppError.unauthorized('User not found');
  }
  next();
});
