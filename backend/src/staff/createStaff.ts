import { STAFF_ROLES, staffRoleSchema, type StaffMember } from '@kape/contract';
import { z } from 'zod';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../auth/passwords.js';
import type { Database } from '../db/client.js';
import { staff } from '../db/schema.js';

const UNIQUE_VIOLATION = '23505';

export const newStaffSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z
    .string()
    .trim()
    .email('Email address is not valid')
    .transform((email) => email.toLowerCase()),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Password needs at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
  role: staffRoleSchema.default('barista'),
});
export type NewStaff = z.input<typeof newStaffSchema>;

export class StaffCreateError extends Error {}

/** Adds a staff account. The password is stored as an argon2id hash, never as given. */
export async function createStaff(db: Database, input: NewStaff): Promise<StaffMember> {
  const parsed = newStaffSchema.safeParse(input);
  if (!parsed.success) throw new StaffCreateError(parsed.error.issues.map((issue) => issue.message).join('. '));
  const { name, email, password, role } = parsed.data;

  try {
    const [row] = await db.insert(staff).values({ name, email, passwordHash: await hashPassword(password), role }).returning({ id: staff.id, name: staff.name, role: staff.role });
    if (!row) throw new Error('Staff insert returned no row');
    return { id: row.id, name: row.name, role: row.role as StaffMember['role'] };
  } catch (error) {
    const code = (error as { code?: string; cause?: { code?: string } }).code ?? (error as { cause?: { code?: string } }).cause?.code;
    if (code === UNIQUE_VIOLATION) throw new StaffCreateError(`There is already an account for ${email}.`);
    throw error;
  }
}

export { STAFF_ROLES };
