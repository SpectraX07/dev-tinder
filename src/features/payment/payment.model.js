import mongoose, { Schema } from 'mongoose';

const paymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Completed', 'Failed'],
    },
    orderId: {
      type: String,
      required: true,
    },
    paymentId: {
      type: String,
    },
    receipt: {
      type: String,
      required: true,
    },
    notes: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model('Payment', paymentSchema);
