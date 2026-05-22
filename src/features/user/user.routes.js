/**
 * @fileoverview User routes — wires validators and controllers.
 * No business logic or DB access here.
 */

import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware.js';
import * as userController from './user.controller.js';
import feedRouter from '../../routes/Feed.routes.js';
import {
  mongoIdSchema,
  getUserByEmailSchema,
  signupSchema,
  updateUserSchema,
  loginSchema,
} from './user.validator.js';

const router = Router();

router.use('/feed', feedRouter);

router.post('/login', validate({ body: loginSchema }), userController.doLogin);

router.get(
  '/userDetails',
  validate({ query: getUserByEmailSchema }),
  userController.getUserByEmail,
);

router.post('/signup', validate({ body: signupSchema }), userController.signup);
router.get('/profile', userController.getProfileDetails);

router
  .route('/:id')
  .get(validate({ params: mongoIdSchema }), userController.getUserById)
  .patch(
    validate({ params: mongoIdSchema, body: updateUserSchema }),
    userController.updateUser,
  )
  .delete(validate({ params: mongoIdSchema }), userController.deleteUser);

export default router;
