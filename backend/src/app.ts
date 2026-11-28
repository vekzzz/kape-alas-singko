import type { ApiError, ErrorCode } from '@kape/contract';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Database } from './db/client.js';
import { createPublicRouter } from './routes/publicRouter.js';

export type AppOptions = {
  db: Database;
  /** Origins allowed by CORS. Empty means no cross-origin browser may call the API. */
  frontendOrigins: string[];
  logLevel?: string;
  /** The clock. Tests pass a fixed one. */
  now?: () => Date;
};

export function errorBody(code: ErrorCode, message: string, extra: Partial<ApiError['error']> = {}): ApiError {
  return { error: { code, message, ...extra } };
}

export function createApp({ db, frontendOrigins, logLevel = 'info', now = () => new Date() }: AppOptions) {
  const app = express();

  app.disable('x-powered-by');
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

  app.use((_req, res) => {
    res.status(404).json(errorBody('NOT_FOUND', 'Nothing here.'));
  });

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
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
