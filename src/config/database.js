import mongoose from 'mongoose';
import serverConfig from '../core/server.js';
export const connectDB = async () => {
  try {
    await mongoose.connect(serverConfig.database.uri, {
      dbName: serverConfig.database.name,
      user: serverConfig.database.user,
      pass: serverConfig.database.pass,

      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};
