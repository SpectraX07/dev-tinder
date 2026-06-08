import razorpayInstance from '../../config/razorpay.js';
import * as paymentRepository from './payment.repository.js';
import { AppError } from '../../core/responseHandler.js';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils.js';

export const createOrder = async (payload) => {
  return await razorpayInstance.orders.create({
    amount: payload.amount * 100,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`,
    partial_payment: false,
    notes: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      membershipType: payload.membershipType,
      emailId: payload.emailId,
    },
  });
};

export const savePaymentDetails = async (userId, order) => {
  return await paymentRepository.create({
    userId,
    amount: order.amount / 100,
    currency: order.currency,
    status: 'Pending',
    orderId: order.id,
    receipt: order.receipt,
    notes: order.notes,
  });
};

export const handleRazorpayWebhook = async (
  webhookSecret,
  payload,
  signature,
) => {
  const webhookSignature = signature;
  const isWebhookValid = validateWebhookSignature(
    JSON.stringify(payload),
    webhookSignature,
    webhookSecret,
  );

  if (!isWebhookValid) {
    throw AppError.unauthorized('Invalid webhook signature');
  }

  if (payload.event === 'payment.captured') {
    const paymentId = payload.payload.payment.entity.id;
    const membershipType = payload.payload.payment.entity.notes.membershipType;
    await paymentRepository.updateStatusByPaymentId(paymentId, 'Completed');
    await paymentRepository.updatePaymentDetailsForUser(
      payload.payload.payment.entity.notes.userId,
      { membershipType },
    );
  }

  if (payload.event === 'payment.failed') {
    const paymentId = payload.payload.payment.entity.id;
    const membershipType = payload.payload.payment.entity.notes.membershipType;
    await paymentRepository.updateStatusByPaymentId(paymentId, 'Failed');
    await paymentRepository.updatePaymentDetailsForUser(
      payload.payload.payment.entity.notes.userId,
      { membershipType },
    );
  }
};
