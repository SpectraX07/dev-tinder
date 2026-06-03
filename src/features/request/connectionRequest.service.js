import { AppError } from '../../core/responseHandler.js';
import * as userService from '../user/user.service.js';
import * as connectionRequestRepository from './connectionRequest.repository.js';

const TERMINAL_STATUSES = new Set(['Accepted', 'Rejected']);

const isSameUser = (a, b) => String(a) === String(b);

const isOutgoing = (doc, fromUserId, toUserId) =>
  isSameUser(doc.fromUserId, fromUserId) && isSameUser(doc.toUserId, toUserId);

const isIncoming = (doc, fromUserId, toUserId) =>
  isSameUser(doc.fromUserId, toUserId) && isSameUser(doc.toUserId, fromUserId);

export const sendConnectionRequest = async (fromUserId, toUserId, status) => {
  if (isSameUser(fromUserId, toUserId)) {
    throw AppError.badRequest('Cannot send a connection request to yourself');
  }

  await userService.getUserById(toUserId);

  const existing = await connectionRequestRepository.findBetweenUsers(
    fromUserId,
    toUserId,
  );

  if (!existing) {
    return await connectionRequestRepository.create({
      fromUserId,
      toUserId,
      status,
    });
  }

  if (TERMINAL_STATUSES.has(existing.status)) {
    throw AppError.conflict(
      `Connection is already ${existing.status.toLowerCase()}`,
    );
  }

  // They already sent Interested → you Interested back = mutual match
  if (
    isIncoming(existing, fromUserId, toUserId) &&
    existing.status === 'Interested' &&
    status === 'Interested'
  ) {
    return await connectionRequestRepository.updateStatusById(
      existing._id,
      'Accepted',
    );
  }

  // They sent Interested → you Ignored = decline their request
  if (
    isIncoming(existing, fromUserId, toUserId) &&
    existing.status === 'Interested' &&
    status === 'Ignored'
  ) {
    return await connectionRequestRepository.updateStatusById(
      existing._id,
      'Rejected',
    );
  }

  // They previously ignored you — rejection is private, silently overwrite
  // Covers: they ignored you + you retry with Interested (fresh chance)
  //         they ignored you + you ignore back (harmless no-op)
  if (
    isIncoming(existing, fromUserId, toUserId) &&
    existing.status === 'Ignored'
  ) {
    return await connectionRequestRepository.updateStatusById(
      existing._id,
      status,
    );
  }

  // You already swiped them — update Interested ↔ Ignored
  if (isOutgoing(existing, fromUserId, toUserId)) {
    if (existing.status === status) {
      throw AppError.conflict('Connection request already exists');
    }

    return await connectionRequestRepository.updateStatusById(
      existing._id,
      status,
    );
  }

  throw AppError.conflict('Connection request already exists');
};

export const reviewConnectionRequest = async (payload) => {
  const existing = await connectionRequestRepository.findRequestForReview(
    payload.requestId,
    payload.toUserId,
  );

  if (!existing) {
    throw AppError.notFound('Request not found');
  }

  return await connectionRequestRepository.updateStatusById(
    payload.requestId,
    payload.status,
  );
};

export const findPendingConnectionRequests = async (toUserId) => {
  return await connectionRequestRepository.findPendingConnectionRequests(
    toUserId,
  );
};

export const findConnections = async (userId) => {
  const data = await connectionRequestRepository.findConnections(userId);
  return data.map((row) =>
    row.fromUserId._id.equals(userId) ? row.toUserId : row.fromUserId,
  );
};
