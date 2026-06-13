import { Server as SocketIOServer } from 'socket.io';
import pino from 'pino';
import serverConfig from '../core/server.js';
import registerHandlers from '../sockets/index.js';
import log from '../utils/logger.js';
import crypto from 'crypto';

// ─── Socket.io options ────────────────────────────────────────────────────────

const socketOptions = {
  cors: {
    origin: serverConfig.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],

  // How long to wait before considering a client disconnected (ms)
  pingTimeout: 20_000,

  // How often the server pings connected clients (ms)
  pingInterval: 25_000,

  // Max HTTP buffer size for a single message (bytes) — matches Express body limit
  maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB

  // Namespace used for the Socket.io path (default: /socket.io)
  path: '/socket.io',
};

// ─── Event name constants ─────────────────────────────────────────────────────
// Single source of truth — import these in both server handlers and client code.

export const SOCKET_EVENTS = {
  // Add your domain events below, e.g.:
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  CHAT_SEND: 'chat:send', // client → server: user sends a message
  CHAT_NEW_MESSAGE: 'chat:newMessage',
};

// ─── Room helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the room name for a specific user.
 * Useful for targeting a single user across multiple tabs/devices.
 *
 * @param {string} userId
 * @returns {string}
 */
export const userRoom = (userId) =>
  crypto.createHash('sha256', userId).digest('hex');

/**
 * Returns the chat id to start the conversation
 *
 * @param {string} userId1
 * @param {string} userId2
 */
export const chatRoom = (userId1, userId2) =>
  crypto
    .createHash('sha256', [userId1, userId2].sort().join('-'))
    .digest('hex');

/**
 * Returns the room name for a tenant / organization.
 *
 * @param {string} tenantId
 * @returns {string}
 */
export const tenantRoom = (tenantId) =>
  crypto.createHash('sha256', tenantId).digest('hex');

/** @type {import('socket.io').Server | null} */
let _io = null;

/**
 * Initialises Socket.io on the given HTTP server.
 * Must be called once, before `httpServer.listen()`.
 *
 * @param {import('node:http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
export const initSocket = (httpServer) => {
  if (_io) {
    log.warn(
      '[socket.io] initSocket called more than once — returning existing instance',
    );
    return _io;
  }

  _io = new SocketIOServer(httpServer, socketOptions);

  _io.on('connection', registerHandlers);

  log.info('[socket.io] Initialised');
  return _io;
};

/**
 * Returns the Socket.io server instance.
 * Throws if `initSocket` has not been called yet.
 *
 * @returns {import('socket.io').Server}
 */
export const getIO = () => {
  if (!_io)
    throw new Error(
      '[socket.io] Not initialised — call initSocket(httpServer) first',
    );
  return _io;
};
