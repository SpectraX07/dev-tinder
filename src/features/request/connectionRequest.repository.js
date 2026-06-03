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
