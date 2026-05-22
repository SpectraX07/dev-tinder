import express, { response } from 'express';
import User from '../features/user/user.model.js';

const router = express.Router();

router
  .route('/')
  .get(async (req, res) => {
    const userData = await User.find({});
    res.status(200).json(userData);
  })
  .post(() => {});

export default router;
