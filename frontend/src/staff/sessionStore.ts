import { staffMemberSchema, type StaffMember } from '@kape/contract';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SessionStore = {
  token: string | null;
  staff: StaffMember | null;
  expiresAt: string | null;
  signIn: (session: { token: string; staff: StaffMember; expiresAt: string }) => void;
  signOut: () => void;
};

/**
 * The signed-in barista. Kept in localStorage so a reload, or the tablet going to sleep, does not sign them out
 * mid-shift. The server ends the session after 12 hours without use; a 401 clears this.
 */
export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      token: null,
      staff: null,
      expiresAt: null,
      signIn: ({ token, staff, expiresAt }) => set({ token, staff, expiresAt }),
      signOut: () => set({ token: null, staff: null, expiresAt: null }),
    }),
    {
      name: 'alas-singko-staff-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token, staff: state.staff, expiresAt: state.expiresAt }),
      merge: (saved, current) => {
        const { token, staff, expiresAt } = (saved ?? {}) as Record<string, unknown>;
        const member = staffMemberSchema.safeParse(staff);
        if (typeof token !== 'string' || typeof expiresAt !== 'string' || !member.success) return current;
        return { ...current, token, staff: member.data, expiresAt };
      },
    },
  ),
);
