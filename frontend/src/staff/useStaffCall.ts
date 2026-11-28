import { useCallback } from 'react';
import { ApiRequestError } from '../api/client';
import { useSessionStore } from './sessionStore';

/**
 * Runs an API call with the signed-in token. If the server says the session is over (401), signs out, so the
 * board drops back to the sign-in screen instead of failing quietly every five seconds.
 */
export function useStaffCall() {
  const token = useSessionStore((state) => state.token);
  const signOut = useSessionStore((state) => state.signOut);

  return useCallback(
    async <T>(call: (token: string) => Promise<T>): Promise<T> => {
      if (!token) throw new Error('Not signed in');
      try {
        return await call(token);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) signOut();
        throw error;
      }
    },
    [token, signOut],
  );
}
