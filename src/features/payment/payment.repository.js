import Payment from './payment.model.js';
import User from '../user/user.model.js';

export const create = async (paymentData) => {
  const payment = new Payment(paymentData);
  return await payment.save();
};

export const updateStatusByPaymentId = async (paymentId, status) => {
  const response = await Payment.findOneAndUpdate(
    { orderId: paymentId },
    { status },
    { new: true },
  );
};

const updatePaymentDetailsForUser = async (userId, paymentData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.membershipType = paymentData.membershipType;
  user.isPremium = true;
  return await user.save();
};
