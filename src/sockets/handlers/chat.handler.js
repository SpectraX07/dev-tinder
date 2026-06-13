import {
  getIO,
  userRoom,
  chatRoom,
  SOCKET_EVENTS,
} from '../../config/socket.js';
import { AppError } from '../../core/responseHandler.js';
import * as chatService from '../../../src/features/chat/chat.service.js';

const chatHandler = (socket) => {
  socket.on(SOCKET_EVENTS.CHAT_JOIN, ({ firstName, userId, targetUserId }) => {
    const chatRoomId = chatRoom(userId, targetUserId);
    socket.join(chatRoomId);
    // socket.emit('joinedChat', { chatId });
    console.log(`${firstName} Joined room:- ${chatRoomId}`);
  });

  // socket.on('leaveChat', ({ chatId }) => {
  //   socket.leave(`chat:${chatId}`);
  // });

  socket.on(
    SOCKET_EVENTS.CHAT_SEND,
    async ({ firstName, lastName, userId, targetUserId, text }) => {
      try {
        const chatRoomId = chatRoom(userId, targetUserId);
        const chat = await chatService.findChat(userId, targetUserId);
        if (!chat) {
          const chatData = {
            participants: [userId, targetUserId],
            messages: {
              senderId: userId,
              text,
            },
          };
          await chatService.createChat(chatData);
        } else {
          chat.messages.push({
            senderId: userId,
            text,
          });
          await chat.save();
        }

        socket
          .to(chatRoomId)
          .emit(SOCKET_EVENTS.CHAT_NEW_MESSAGE, { firstName, lastName, text });
      } catch (err) {
        console.error(err);
      }
    },
  );
};

export default chatHandler;
