/**
 * @fileoverview User routes — wires validators and controllers.
 * No business logic or DB access here.
 */

import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import * as userController from './user.controller.js';
import { userAuth } from '../../middleware/auth.middleware.js';
import {
  mongoIdSchema,
  getUserByEmailSchema,
  signupSchema,
  updateUserSchema,
  loginSchema,
  changePasswordSchema,
} from './user.validator.js';

const router = Router();

// Auth Routes
router.post(
  '/auth/login',
  validate({ body: loginSchema }),
  userController.doLogin,
);

router.post(
  '/auth/signup',
  validate({ body: signupSchema }),
  userController.signup,
);
router.post('/auth/logout', userController.logout);

router.use(userAuth);

// Profile Routes
router.get('/profile/view', userController.getProfileDetails);
router.patch(
  '/profile/edit',
  validate({ body: updateUserSchema }),
  userController.updateUser,
);
router.patch(
  '/profile/password',
  validate({ body: changePasswordSchema }),
  userController.changePassword,
);

export default router;
