import { statusConflictDetailsSchema, type StaffOrder } from '@kape/contract';
import { ApiRequestError } from '../api/client';
import { STATUS_LABELS } from './boardData';

/** The order as it really is, when the server says someone else already changed it. */
export function conflictOrder(error: unknown): StaffOrder | null {
  if (!(error instanceof ApiRequestError) || error.code !== 'STATUS_CONFLICT') return null;
  const details = statusConflictDetailsSchema.safeParse(error.details);
  return details.success ? details.data.order : null;
}

/** What to tell the barista when something they pressed did not work. */
export function staffErrorMessage(error: unknown): string {
  const conflict = conflictOrder(error);
  if (conflict) return `Order ${conflict.number} was already moved by someone else. It is now ${STATUS_LABELS[conflict.status].toLowerCase()}.`;
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return 'Your session ended. Please sign in again.';
    if (error.status === 429) return 'Too many tries. Wait a moment and try again.';
    if (error.status >= 500) return 'Something went wrong on the server. Try again in a moment.';
    return error.message;
  }
  return "Couldn't reach the server. Check the connection and try again.";
}
