import type { StaffMember } from '@kape/contract';
import type { RequestHandler, Response } from 'express';
import type { Database } from '../db/client.js';
import { HttpError } from '../http.js';
import { TOUCH_AFTER_MS, extendSession, findActiveSession } from './sessions.js';

export type StaffContext = StaffMember & { sessionId: number; expiresAt: Date };

/** The signed-in staff member, for handlers that run after `requireStaff`. */
export function staffOf(res: Response): StaffContext {
  return res.locals.staff as StaffContext;
}

function bearerToken(header: string | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return match?.[1] ?? null;
}

/** Lets a request through only with a live session token, and keeps a session that is in use alive. */
export function requireStaff({ db, now }: { db: Database; now: () => Date }): RequestHandler {
  return async (req, res, next) => {
    const token = bearerToken(req.header('authorization'));
    const at = now();
    const session = token ? await findActiveSession(db, token, at) : null;
    if (!session) throw new HttpError(401, 'UNAUTHENTICATED', 'Please sign in.');

    let expiresAt = session.expiresAt;
    if (at.getTime() - session.lastUsedAt.getTime() > TOUCH_AFTER_MS) expiresAt = await extendSession(db, session.sessionId, at);

    res.locals.staff = { ...session.staff, sessionId: session.sessionId, expiresAt } satisfies StaffContext;
    next();
  };
}
