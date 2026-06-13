import chatHandler from './handlers/chat.handler.js';
import log from '../utils/logger.js';

const registerHandlers = (socket) => {
  socket.on('disconnect', (reason) => {
    log.info(
      { socketId: socket.id, reason },
      '[socket.io] Client disconnected',
    );
    // e.g. await User.findByIdAndUpdate(socket.userId, { online: false })
  });

  chatHandler(socket);
};

export default registerHandlers;
