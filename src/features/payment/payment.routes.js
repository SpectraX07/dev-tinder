import express from 'express';
import { userAuth } from '../../middleware/auth.middleware.js';
import * as paymentController from './payment.controller.js';

const router = express.Router();

router.post('/create', userAuth, paymentController.createOrder);
router.post('/razorpay-webhook', paymentController.razorpayWebhook);
router.get('/razorpay-webhook', async (req, res) => {
  console.log('Received GET request on Razorpay webhook endpoint');
  return res
    .status(200)
    .json({ success: true, message: 'GET request received' });
}); // For testing webhook with GET requests

export default router;
