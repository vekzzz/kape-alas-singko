import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../api/client';
import { makeStaffOrder } from '../test/orderFixture';
import { conflictOrder, staffErrorMessage } from './staffErrors';

const conflict = new ApiRequestError('Someone already changed this order.', 409, 'STATUS_CONFLICT', {
  details: { order: makeStaffOrder({ number: 'A5-K7P', status: 'preparing' }) },
});

describe('conflictOrder', () => {
  it('returns the order as it really is', () => {
    expect(conflictOrder(conflict)?.status).toBe('preparing');
  });

  it('is null for any other error, or a conflict without its order', () => {
    expect(conflictOrder(new TypeError('Failed to fetch'))).toBeNull();
    expect(conflictOrder(new ApiRequestError('x', 400, 'INVALID_TRANSITION'))).toBeNull();
    expect(conflictOrder(new ApiRequestError('x', 409, 'STATUS_CONFLICT', { details: { nope: true } }))).toBeNull();
  });
});

describe('staffErrorMessage', () => {
  it('says who beat you to it, and where the order is now', () => {
    expect(staffErrorMessage(conflict)).toBe('Order A5-K7P was already moved by someone else. It is now making.');
  });

  it('tells the barista when the session ended', () => {
    expect(staffErrorMessage(new ApiRequestError('Please sign in.', 401, 'UNAUTHENTICATED'))).toMatch(/session ended/);
  });

  it('passes on the server\'s words for a refusal, and has plain words for the rest', () => {
    expect(staffErrorMessage(new ApiRequestError("A cancelled order can't be paid.", 409, 'INVALID_TRANSITION'))).toBe("A cancelled order can't be paid.");
    expect(staffErrorMessage(new ApiRequestError('boom', 500, 'INTERNAL'))).toMatch(/server/);
    expect(staffErrorMessage(new ApiRequestError('slow down', 429, 'RATE_LIMITED'))).toMatch(/Too many/);
    expect(staffErrorMessage(new TypeError('Failed to fetch'))).toMatch(/reach the server/);
  });
});
