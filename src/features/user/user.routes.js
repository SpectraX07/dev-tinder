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

router.get(
  '/userDetails',
  validate({ query: getUserByEmailSchema }),
  userController.getUserByEmail,
);

router
  .route('/:id')
  .get(validate({ params: mongoIdSchema }), userController.getUserById)
  .patch(
    validate({ params: mongoIdSchema, body: updateUserSchema }),
    userController.updateUser,
  )
  .delete(validate({ params: mongoIdSchema }), userController.deleteUser);

export default router;
