/**
 * @fileoverview Zod schemas for user route validation.
 */

import * as z from 'zod';

export const mongoIdSchema = z.object({
  id: z
    .string()
    .length(24, 'Invalid MongoDB ObjectId')
    .regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId format'),
});

export const getUserByEmailSchema = z.object({
  email: z.email('Invalid email address'),
});

export const updateUserSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'First name is too short')
      .max(50, 'First name is too long')
      .optional(),
    lastName: z
      .string()
      .min(2, 'Last name is too short')
      .max(50, 'Last name is too long')
      .optional(),
    email: z.email('Invalid email address').optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const signupSchema = z
  .object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain one uppercase letter')
      .regex(/[a-z]/, 'Must contain one lowercase letter')
      .regex(/[0-9]/, 'Must contain one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain one special character'),
    gender: z.enum(['Male', 'Female', 'Other']),
    age: z.coerce.number().min(18),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .strict();
