import 'dotenv/config';
import express from 'express';
import pino from 'pino';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { connectDB } from './config/database.js';
import {
  initSessionStore,
  closeSessionStore,
} from './utils/jwt/session-store.js';
import router from './routes/index.routes.js';
import {
  attach,
  errorMiddleware,
  setResponseLogger,
  HTTP,
} from './core/responseHandler.js';

import serverConfig from './config/server.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const { isDev: IS_DEV, isTest: IS_TEST, port: PORT, host: HOST } = serverConfig;

// ─── Logger ──────────────────────────────────────────────────────────────────

const log = pino(
  IS_DEV
    ? {
        level: serverConfig.logLevel,
        transport: { target: 'pino-pretty', options: { colorize: true } },
      }
    : { level: serverConfig.logLevel },
);

setResponseLogger(log);

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express();

// ─── Security ────────────────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: IS_DEV ? false : undefined,
  }),
);

app.use(
  cors({
    origin: serverConfig.cors.origin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────────

app.use(
  rateLimit({
    windowMs: serverConfig.rateLimit.windowMs,
    max: serverConfig.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      status: 'error',
      statusCode: HTTP.TOO_MANY_REQUESTS,
      message: 'Too many requests, please try again later.',
    },
    skip: () => IS_TEST,
  }),
);

// ─── Inject res.respond ───────────────────────────────────────────────────────
// Must be before any middleware that could call next(err) or res.json(),
// so res.respond is always available in controllers and error handlers.

app.use(attach);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Compression ─────────────────────────────────────────────────────────────

app.use(compression());

// ─── HTTP request logging ─────────────────────────────────────────────────────

if (!IS_TEST) {
  app.use(
    morgan(IS_DEV ? 'dev' : 'combined', {
      stream: { write: (msg) => log.info(msg.trim()) },
      skip: (_req, res) => res.statusCode < 400 && !IS_DEV,
    }),
  );
}

// ─── Health check ─────────────────────────────────────────────────────────────
// Placed before the main router so it's always reachable (load balancer pings etc.)

app.get('/health', (_req, res) => {
  res.respond.ok({
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: serverConfig.env,
  });
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/v1', router);

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.respond.notFound(
    `Can't find ${req.method} ${req.originalUrl} on this server.`,
  );
});

// ─── Centralized error handler ────────────────────────────────────────────────
// Must be last — catches every next(err) from routes and middleware above.

app.use(errorMiddleware);

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const bootstrap = async () => {
  await connectDB();
  await initSessionStore();

  const server = app.listen(PORT, HOST, () => {
    log.info(
      `Server running on http://${HOST}:${PORT} [${serverConfig.env}]`,
    );
  });

  // ── Graceful shutdown ───────────────────────────────────────────────────────

  /**
   * Stops accepting new connections, waits for in-flight requests to finish,
   * then exits. Handles SIGTERM (Docker/K8s) and SIGINT (Ctrl+C).
   *
   * @param {string} signal
   */
  const shutdown = (signal) => {
    log.info(`[${signal}] Shutting down gracefully…`);

    server.close(async (err) => {
      if (err) {
        log.error({ err }, 'Error during server close');
        process.exit(1);
      }

      try {
        await closeSessionStore();
      } catch (closeErr) {
        log.error({ err: closeErr }, 'Error closing session store');
      }

      log.info('HTTP server closed. Exiting.');
      process.exit(0);
    });

    // Force-kill if shutdown takes too long (e.g. hung DB connections)
    setTimeout(() => {
      log.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000).unref(); // .unref() so the timer doesn't keep the event loop alive
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ── Unhandled promise rejections & exceptions ────────────────────────────────

  process.on('unhandledRejection', (reason) => {
    log.error({ reason }, '[unhandledRejection] Unhandled promise rejection');
    // In production, crash and let the process manager (PM2/K8s) restart.
    // In development, keep running so you see the error without losing the REPL.
    if (!IS_DEV) shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err) => {
    log.error(
      { err },
      '[uncaughtException] Uncaught exception — process is in an undefined state',
    );
    // Always exit on uncaughtException — the process is no longer reliable.
    shutdown('uncaughtException');
  });

  return server;
};

await bootstrap();

export default app; // for supertest / integration tests
