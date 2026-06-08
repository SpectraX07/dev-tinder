import express from 'express';
import userRoutes from '../features/user/user.routes.js';
import connectionRequestRouter from '../features/request/connectionRequest.routes.js';
import paymentRouter from '../features/payment/payment.routes.js';

const router = express.Router();
router.use('/user/payment', paymentRouter);
router.use('/user/request', connectionRequestRouter);
router.use('/user', userRoutes);

export default router;
