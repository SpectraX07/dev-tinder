import * as chatService from './chat.service.js';
import catchAsync from '../../utils/catchAsync.js';

export const fetchChat = catchAsync(async (req, res) => {
  const { targetUserId } = req.params;
  const chat = await chatService.findChat(req?.user._id, targetUserId);
  if (!chat) {
    const chatData = {
      participants: [req?.user._id, targetUserId],
      messages: [],
    };
    await chatService.createChat(chatData);
  }

  res.respond.ok(chat);
});
