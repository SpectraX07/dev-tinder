import express from 'express';
import { userAuth } from '../../middleware/auth.middleware.js';
import * as chatController from './chat.controller.js';

const router = express.Router();

router.use(userAuth);

router.get('/:targetUserId', chatController.fetchChat);

export default router;
