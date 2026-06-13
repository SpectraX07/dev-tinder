import Chat from './chat.model.js';

export const findChat = async (userId1, userId2) => {
  return await Chat.findOne({
    participants: {
      $all: [userId1, userId2],
    },
  }).populate({ path: 'messages.senderId', select: 'firstName lastName' });
};

export const createChat = async (chatData) => {
  return await Chat.create(chatData);
};
