import { hash, verify } from '@node-rs/argon2';

export const MIN_PASSWORD_LENGTH = 10;

/** Argon2id, with the library's default (OWASP-recommended) cost. The salt and settings live inside the hash. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false; // a malformed hash is a failed login, not a crash
  }
}

let decoy: Promise<string> | undefined;

/**
 * Does the same work as a real check against a hash nobody knows. Used when the email is unknown, so the reply
 * takes as long as for a wrong password and the login page cannot be used to find out which emails have accounts.
 */
export async function spendPasswordCheck(password: string): Promise<void> {
  decoy ??= hash('this is not anyone\'s password');
  await verifyPassword(await decoy, password);
}
