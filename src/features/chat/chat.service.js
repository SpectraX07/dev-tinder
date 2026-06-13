import * as chatRepository from './chat.repository.js';

export const findChat = async (userId1, userId2) => {
  return await chatRepository.findChat(userId1, userId2);
};

export const createChat = async (chatData) => {
  return await chatRepository.createChat(chatData);
};
