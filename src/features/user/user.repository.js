import User from './user.model.js';

export const findByEmail = async (email) => {
  return await User.findOne({ email }).lean();
};

export const findByEmailWithPassword = async (email) => {
  return await User.findOne({ email });
};

export const findById = async (id) => {
  return await User.findById(id);
};

export const updateById = async (id, payload) => {
  return await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean();
};

export const changePasswordById = async (id, payload) => {
  const user = await User.findById(id);

  user.password = payload.confirmPassword;

  return await user.save();
};

export const create = async (payload) => {
  return await User.create(payload);
};

export const deleteById = async (id) => {
  return await User.findByIdAndDelete(id).lean();
};

export const countByEmail = async (email, id = null) => {
  const query = { email };

  if (id) query._id = { $ne: id };

  return await User.countDocuments(query);
};
