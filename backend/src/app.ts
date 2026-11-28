import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Database } from './db/client.js';
import { HttpError, errorBody } from './http.js';
import { createOrdersRouter } from './routes/ordersRouter.js';
import { createPublicRouter } from './routes/publicRouter.js';
import { createStaffRouter } from './routes/staffRouter.js';

export { errorBody };

export type AppOptions = {
  db: Database;
  /** Origins allowed by CORS. Empty means no cross-origin browser may call the API. */
  frontendOrigins: string[];
  logLevel?: string;
  /** The clock. Tests pass a fixed one. */
  now?: () => Date;
  /** Trust the X-Forwarded-For header from one proxy in front of the API (Render does this). */
  trustProxy?: boolean;
  /** Orders one address may place per minute. */
  ordersPerMinute?: number;
  /** Makes order numbers. Tests swap it to force a clash. */
  generateNumber?: (prefix: string) => string;
  /** Sign-in attempts one address may make per 15 minutes. */
  loginAttempts?: number;
};

export function createApp({
  db,
  frontendOrigins,
  logLevel = 'info',
  now = () => new Date(),
  trustProxy = false,
  ordersPerMinute = 10,
  generateNumber,
  loginAttempts = 10,
}: AppOptions) {
  const app = express();

  app.disable('x-powered-by');
  // Without this every visitor looks like the proxy, and the rate limit would count them all together.
  if (trustProxy) app.set('trust proxy', 1);
  app.use(pinoHttp({ level: logLevel }));
  app.use(helmet());
  app.use(
    cors({
      origin: frontendOrigins.length > 0 ? frontendOrigins : false,
      methods: ['GET', 'POST', 'PATCH'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  // Render's health check. Kept at the root and off the database so it never wakes a sleeping Postgres.
  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/v1', createPublicRouter({ db, now }));
  app.use('/api/v1', createOrdersRouter({ db, now, ordersPerMinute, generateNumber }));
  app.use(
    '/api/v1/staff',
    createStaffRouter({ db, now, loginAttempts, log: logLevel === 'silent' ? undefined : (message, error) => console.error(message, error) }),
  );

  app.use((_req, res) => {
    res.status(404).json(errorBody('NOT_FOUND', 'Nothing here.'));
  });

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json(error.body);
      return;
    }
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 500;
    if (status >= 400 && status < 500) {
      res.status(status).json(errorBody('VALIDATION', 'The request body could not be read.'));
      return;
    }
    req.log.error(error);
    res.status(500).json(errorBody('INTERNAL', 'Something went wrong.'));
  });

  return app;
}
