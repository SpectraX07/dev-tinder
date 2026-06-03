import catchAsync from '../../utils/CatchAsync.js';
import * as connectionRequestService from './connectionRequest.service.js';

export const sendConnectionRequest = catchAsync(async (req, res) => {
  const response = await connectionRequestService.sendConnectionRequest(
    req.user._id,
    req.params.toUserId,
    req.params.status,
  );

  res.respond.created(response);
});

export const reviewRequest = catchAsync(async (req, res) => {
  const payload = {
    toUserId: req.user._id,
    status: req.params.status,
    requestId: req.params.requestId,
  };

  const response =
    await connectionRequestService.reviewConnectionRequest(payload);
  res.respond.ok(
    response,
    `Connection request was ${payload.status.toLowerCase()}`,
  );
});

export const getPendingConnectionRequests = catchAsync(async (req, res) => {
  const response = await connectionRequestService.findPendingConnectionRequests(
    req.user._id,
  );
  res.respond.ok(response);
});

export const findConnections = catchAsync(async (req, res) => {
  const response = await connectionRequestService.findConnections(req.user._id);
  res.respond.ok(response);
});
