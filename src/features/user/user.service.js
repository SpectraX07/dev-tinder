/**
 * @fileoverview User service — data access and business logic.
 * No req/res here; controllers call these and handle HTTP concerns.
 */

import { AppError } from '../../core/responseHandler.js';
import { signTokenPair } from '../../utils/jwt/signer.js';
import * as userRepository from './user.repository.js';

export const getUserByEmail = async (email) => {
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return user;
};

export const getUserByEmailForLogin = async (email) => {
  const user = await userRepository.findByEmailWithPassword(email);

  if (!user) {
    throw AppError.notFound('Invalid credentials');
  }

  return user;
};

export const getUserById = async (id) => {
  const user = await userRepository.findById(id);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return user;
};

/** Loads user for auth middleware; returns null instead of 404. */
export const getUserForAuth = async (id) => userRepository.findById(id);

export const issueTokenPair = async (userId) =>
  signTokenPair(String(userId));

export const updateUser = async (id, payload) => {
  const updated = await userRepository.updateById(id, payload);

  if (!updated) {
    throw AppError.notFound('User not found');
  }

  return updated;
};

export const changePassword = async (id, payload) => {
  const updated = await userRepository.changePasswordById(id, payload);

  if (!updated) {
    throw AppError.notFound('User not found');
  }

  return updated;
};

export const createUser = async (payload) => {
  return await userRepository.create(payload);
};

export const deleteUser = async (id) => {
  const deleted = await userRepository.deleteById(id);

  if (!deleted) {
    throw AppError.notFound('User not found');
  }

  return deleted;
};

export const isEmailExists = async (email, id = null) => {
  const count = await userRepository.countByEmail(email, id);

  if (count) {
    throw AppError.conflict('Email id already exists');
  }

  return count;
};

export const getFeed = async (userId, page, limit) => {
  const offset = limit * (page - 1);
  return await userRepository.getFeed(userId, limit, offset);
};
