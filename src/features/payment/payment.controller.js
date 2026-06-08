import { AppError } from '../../core/responseHandler.js';
import catchAsync from '../../utils/catchAsync.js';
import * as paymentService from './payment.service.js';
import { membershipAmount } from '../../utils/constants.js';
import serverConfig from '../../core/server.js';

export const createOrder = catchAsync(async (req, res) => {
  const { membershipType } = req.body;
  const payload = {
    amount: membershipAmount[membershipType],
    firstName: req?.user.firstName,
    lastName: req?.user.lastName,
    emailId: req?.user.email,
    membershipType,
  };

  const response = await paymentService.createOrder(payload);
  const savedPayment = await paymentService.savePaymentDetails(
    req?.user._id,
    response,
  );

  res.respond.ok({
    keyId: serverConfig.razorpay.key,
    ...savedPayment.toJSON(),
  });
});

export const razorpayWebhook = catchAsync(async (req, res) => {
  const response = await paymentService.handleRazorpayWebhook(
    serverConfig.razorpay.webhookSecret,
    req.body,
  );

  return res.status(200).json({ success: true, message: 'Webhook processed' });
});
