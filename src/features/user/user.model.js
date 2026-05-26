import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import serverConfig from '../../config/server.js';

const userSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    age: { type: Number, min: 18 },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    photoUrl: {
      type: String,
      default: 'https://placehold.co/200',
    },
    about: {
      type: String,
      default: 'This is default about of the user.',
    },
    skills: { type: [String] },
  },
  { timestamps: true },
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

/**
 * Methods for comparePassword
 */
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.getJWT = async function () {
  return await jwt.sign({ userId: this._id }, serverConfig.jwt.access.secret, {
    expiresIn: serverConfig.jwt.access.expiresIn,
  });
};

export default mongoose.model('User', userSchema);
