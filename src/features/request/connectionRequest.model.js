import mongoose, { Schema } from 'mongoose';

const connectionRequestSchema = new Schema(
  {
    fromUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: 'User',
    },
    status: {
      type: String,
      required: true,
      enum: ['Ignored', 'Interested', 'Accepted', 'Rejected'],
    },
  },
  { timestamps: true },
);

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

export default mongoose.model('ConnectionRequest', connectionRequestSchema);
