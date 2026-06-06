import { set } from 'mongoose';
import ConnectionRequest from './connectionRequest.model.js';

const USER_SAFE_DATA = 'firstName lastName photoUrl gender about skills';

export const create = async (payload) => {
  return await ConnectionRequest.create(payload);
};

export const updateStatusById = async (id, status) => {
  return await ConnectionRequest.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true },
  );
};

export const findBetweenUsers = async (fromUserId, toUserId) => {
  return await ConnectionRequest.findOne({
    $or: [
      { fromUserId, toUserId },
      { fromUserId: toUserId, toUserId: fromUserId },
    ],
  });
};

export const findRequestForReview = async (requestId, toUserId) => {
  return await ConnectionRequest.findOne({
    _id: requestId,
    toUserId,
    status: 'Interested',
  });
};

export const findPendingConnectionRequests = async (toUserId) => {
  return await ConnectionRequest.find({
    toUserId,
    status: 'Interested',
  }).populate('fromUserId', USER_SAFE_DATA);
  // }).populate([
  //   { path: 'fromUserId', select: 'firstName' },
  //   { path: 'toUserId', select: 'firstName' },
  // ]);
};

export const findConnections = async (userId) => {
  return await ConnectionRequest.find({
    $or: [
      { toUserId: userId, status: 'Accepted' },
      { fromUserId: userId, status: 'Accepted' },
    ],
  }).populate([
    { path: 'fromUserId', select: USER_SAFE_DATA },
    { path: 'toUserId', select: USER_SAFE_DATA },
  ]);
};

// export const getPendingRequestsBetween = async (startDate, endDate) => {
//   return await ConnectionRequest.find({
//     status: 'Interested',
//     createdAt: { $gte: startDate, $lte: endDate },
//   })
//     .select('toUserId')
//     .groupBy({
//       _id: '$toUserId',
//       email: { $first: '$toUserEmail' },
//     })
//     .populate([{ path: 'toUserId', select: 'email' }])
//     .lean();
// };

const pendingRecipientPipeline = (startDate, endDate) => [
  {
    $match: {
      status: 'Interested',
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    },
  },
  {
    $group: {
      _id: '$toUserId',
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'user',
    },
  },
  {
    $unwind: '$user',
  },
  {
    $project: {
      _id: 0,
      email: '$user.email',
    },
  },
];

export const getPendingRequestsBetween = async (startDate, endDate) => {
  return ConnectionRequest.aggregate(pendingRecipientPipeline(startDate, endDate));
};

/**
 * Streams distinct recipient emails for pending requests in a date window.
 *
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {{ batchSize?: number }} [options]
 */
export const streamPendingRecipientEmails = (
  startDate,
  endDate,
  { batchSize = 500 } = {},
) => {
  return ConnectionRequest.aggregate(
    pendingRecipientPipeline(startDate, endDate),
  ).cursor({ batchSize });
};
