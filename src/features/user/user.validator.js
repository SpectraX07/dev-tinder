/**
 * @fileoverview Zod schemas for user route validation.
 */

import * as z from 'zod';

const passwordValidationSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain one uppercase letter')
  .regex(/[a-z]/, 'Must contain one lowercase letter')
  .regex(/[0-9]/, 'Must contain one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain one special character');

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
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    age: z.coerce.number().min(18).optional(),
    photoUrl: z.url({ protocol: /^https$/ }).optional(),
    skills: z.array(z.string()).min(1).optional(),
    about: z.string().max(500).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: passwordValidationSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Passwords don't match",
    path: ['confirmPassword'], // path of error
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    error: 'New password and current password can not be same',
    path: 'newPassword',
  })
  .strict();

export const signupSchema = z
  .object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    password: passwordValidationSchema,
    gender: z.enum(['Male', 'Female', 'Other']).default('Other').optional(),
    age: z.coerce.number().min(18).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
  })
  .strict();

export const feedQuerySchema = z
  .object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(10).max(100).default(10).optional(),
  })
  .strict();
