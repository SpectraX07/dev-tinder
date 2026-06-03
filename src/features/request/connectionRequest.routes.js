import express from 'express';
import { userAuth } from '../../middleware/auth.middleware.js';
import * as connectionRequestController from './connectionRequest.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  connectionRequestParamsSchema,
  connectionRequestReviewParamsSchema,
} from './connectionRequest.validator.js';

const router = express.Router();

router.post(
  '/:status/:toUserId',
  validate({ params: connectionRequestParamsSchema }),
  userAuth,
  connectionRequestController.sendConnectionRequest,
);

router.post(
  '/review/:status/:requestId',
  validate({ params: connectionRequestReviewParamsSchema }),
  userAuth,
  connectionRequestController.reviewRequest,
);

router.get(
  '/pendingConnectionRequests',
  userAuth,
  connectionRequestController.getPendingConnectionRequests,
);

router.get(
  '/connections',
  userAuth,
  connectionRequestController.findConnections,
);

export default router;
