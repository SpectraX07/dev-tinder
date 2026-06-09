import express from 'express';
import { userAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createOrderSchema } from './payment.validator.js';
import * as paymentController from './payment.controller.js';

const router = express.Router();

router.post(
  '/create',
  userAuth,
  validate({ body: createOrderSchema }),
  paymentController.createOrder,
);
router.post('/razorpay-webhook', paymentController.razorpayWebhook);

export default router;
