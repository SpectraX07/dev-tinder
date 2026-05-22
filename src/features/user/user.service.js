/**
 * @fileoverview User service — data access and business logic.
 * No req/res here; controllers call these and handle HTTP concerns.
 */

import User from './user.model.js';
import { AppError } from '../../core/responseHandler.js';

/**
 * Finds a user by email.
 * @param {string} email
 */
export const getUserByEmail = async (email) => {
  const user = await User.findOne({ email }).lean();
  if (!user) throw AppError.notFound('User not found');
  return user;
};

/**
 * Finds a user by email for login.
 * @param {string} email
 */
export const getUserByEmailForLogin = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw AppError.notFound('Invalid credentials');
  return user;
};

/**
 * Finds a user by MongoDB ObjectId.
 * @param {string} id
 */
export const getUserById = async (id) => {
  const user = await User.findById(id).lean();
  if (!user) throw AppError.notFound('User not found');
  return user;
};

/**
 * Updates a user by id and returns the updated document.
 * @param {string} id
 * @param {Record<string, unknown>} payload
 */
export const updateUser = async (id, payload) => {
  const updated = await User.findByIdAndUpdate(id, payload, {
    new: true, // return the updated document
    runValidators: true, // run mongoose schema validators on update
  }).lean();

  if (!updated) throw AppError.notFound('User not found');
  return updated;
};

/**
 * Insert a new User
 * @param
 */

export const createUser = async (payload) => {
  return await User.create(payload);
};

/**
 * Deletes a user by id and returns the deleted document.
 * @param {string} id
 */
export const deleteUser = async (id) => {
  const deleted = await User.findByIdAndDelete(id).lean();
  if (!deleted) throw AppError.notFound('User not found');
  return deleted;
};

/**
 * Check email exists or not
 * @param {string} email
 * @param {string} id
 */
export const isEmailExists = async (email, id = null) => {
  const query = { email };

  if (id) query._id = { $ne: id };

  const count = await User.countDocuments(query);
  if (count) throw AppError.conflict('Email id already exists');
  return count;
};
