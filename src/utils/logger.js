import pino from 'pino';
import serverConfig from '../core/server.js';

const log = pino(
  serverConfig.isDev
    ? {
        level: serverConfig.logLevel,
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }
    : { level: serverConfig.logLevel },
);

export default log;
