import express from 'express';
import publicRoutes from '../features/user/user.routes.js';

const router = express.Router();

router.use('/user', publicRoutes);

export default router;
