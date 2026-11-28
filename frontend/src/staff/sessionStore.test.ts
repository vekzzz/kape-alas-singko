import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionStore } from './sessionStore';

const session = { token: 't'.repeat(43), staff: { id: 1, name: 'Ana', role: 'barista' as const }, expiresAt: '2026-11-28T14:00:00.000Z' };

beforeEach(() => useSessionStore.setState({ token: null, staff: null, expiresAt: null }));

describe('session store', () => {
  it('holds the signed-in barista', () => {
    useSessionStore.getState().signIn(session);
    expect(useSessionStore.getState()).toMatchObject(session);
  });

  it('forgets everything on sign out', () => {
    useSessionStore.getState().signIn(session);
    useSessionStore.getState().signOut();
    expect(useSessionStore.getState()).toMatchObject({ token: null, staff: null, expiresAt: null });
  });
});
