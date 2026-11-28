import { createHash, randomBytes } from 'node:crypto';
import type { StaffMember } from '@kape/contract';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Database } from '../db/client.js';
import { staff, staffSessions } from '../db/schema.js';

export const SESSION_HOURS = 12;
/** A session in use is extended, but not on every request: the board checks every few seconds. */
export const TOUCH_AFTER_MS = 60_000;

const sessionLength = SESSION_HOURS * 60 * 60 * 1000;

/** Only this hash is stored, so a copy of the database cannot be used to sign in. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type ActiveSession = { sessionId: number; staff: StaffMember; expiresAt: Date; lastUsedAt: Date };

export async function createSession(db: Database, staffId: number, now: Date): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + sessionLength);
  await db.insert(staffSessions).values({ staffId, tokenHash: hashToken(token), createdAt: now, lastUsedAt: now, expiresAt });
  return { token, expiresAt };
}

/** The session behind a token, if it exists, has not been signed out or expired, and its owner still works here. */
export async function findActiveSession(db: Database, token: string, now: Date): Promise<ActiveSession | null> {
  const [found] = await db
    .select({
      sessionId: staffSessions.id,
      expiresAt: staffSessions.expiresAt,
      lastUsedAt: staffSessions.lastUsedAt,
      id: staff.id,
      name: staff.name,
      role: staff.role,
    })
    .from(staffSessions)
    .innerJoin(staff, eq(staff.id, staffSessions.staffId))
    .where(and(eq(staffSessions.tokenHash, hashToken(token)), isNull(staffSessions.revokedAt), gt(staffSessions.expiresAt, now), eq(staff.isActive, true)))
    .limit(1);
  if (!found) return null;
  return {
    sessionId: found.sessionId,
    expiresAt: found.expiresAt,
    lastUsedAt: found.lastUsedAt,
    staff: { id: found.id, name: found.name, role: found.role as StaffMember['role'] },
  };
}

/** Pushes the expiry 12 hours out from now. */
export async function extendSession(db: Database, sessionId: number, now: Date): Promise<Date> {
  const expiresAt = new Date(now.getTime() + sessionLength);
  await db.update(staffSessions).set({ lastUsedAt: now, expiresAt }).where(eq(staffSessions.id, sessionId));
  return expiresAt;
}

export async function revokeSession(db: Database, sessionId: number, now: Date): Promise<void> {
  await db.update(staffSessions).set({ revokedAt: now }).where(eq(staffSessions.id, sessionId));
}
