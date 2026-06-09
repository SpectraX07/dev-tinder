import User from './user.model.js';
import ConnectionRequest from '../request/connectionRequest.model.js';
const USER_SAFE_DATA =
  'firstName lastName photoUrl gender about skills isPremium';

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

export const getFeed = async (userId, limit, offset) => {
  const hiddenUserIds = new Set([userId.toString()]);

  const connectionRequests = await ConnectionRequest.find({
    $or: [{ fromUserId: userId }, { toUserId: userId }],
    $nor: [{ toUserId: userId, status: 'Interested' }],
  })
    .select('fromUserId toUserId')
    .lean();

  connectionRequests.forEach(({ fromUserId, toUserId }) => {
    hiddenUserIds.add(fromUserId.toString());
    hiddenUserIds.add(toUserId.toString());
  });

  const filter = {
    _id: { $nin: [...hiddenUserIds] },
  };

  const [users, total] = await Promise.all([
    User.find(filter).select(USER_SAFE_DATA).skip(offset).limit(limit).lean(),

    User.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  return {
    data: users,
    pagination: {
      total,
      totalPages,
      currentPage: page,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
};
