import { describe, expect, it } from 'vitest';
import { nextStatus, previousStatus, staffLoginRequestSchema, staffStatusRequestSchema, statusMove } from './index.js';

describe('statusMove', () => {
  it('allows one step forward', () => {
    expect(statusMove('received', 'preparing')).toBe('forward');
    expect(statusMove('preparing', 'ready')).toBe('forward');
    expect(statusMove('ready', 'collected')).toBe('forward');
  });

  it('allows one step back, to undo a mis-tap', () => {
    expect(statusMove('preparing', 'received')).toBe('back');
    expect(statusMove('ready', 'preparing')).toBe('back');
    expect(statusMove('collected', 'ready')).toBe('back');
  });

  it('allows cancelling until the order is collected', () => {
    for (const from of ['received', 'preparing', 'ready'] as const) expect(statusMove(from, 'cancelled')).toBe('cancel');
    expect(statusMove('collected', 'cancelled')).toBeNull();
    expect(statusMove('cancelled', 'cancelled')).toBeNull();
  });

  it('refuses skipping a step, standing still, and bringing a cancelled order back', () => {
    expect(statusMove('received', 'ready')).toBeNull();
    expect(statusMove('received', 'collected')).toBeNull();
    expect(statusMove('ready', 'received')).toBeNull();
    expect(statusMove('ready', 'ready')).toBeNull();
    expect(statusMove('cancelled', 'received')).toBeNull();
    expect(statusMove('received', 'received')).toBeNull();
  });
});

describe('nextStatus and previousStatus', () => {
  it('walk the steps and stop at the ends', () => {
    expect(nextStatus('received')).toBe('preparing');
    expect(nextStatus('collected')).toBeNull();
    expect(nextStatus('cancelled')).toBeNull();
    expect(previousStatus('ready')).toBe('preparing');
    expect(previousStatus('received')).toBeNull();
    expect(previousStatus('cancelled')).toBeNull();
  });
});

describe('staffStatusRequestSchema', () => {
  it('needs a reason to cancel, and only then', () => {
    expect(staffStatusRequestSchema.safeParse({ from: 'received', to: 'cancelled' }).success).toBe(false);
    expect(staffStatusRequestSchema.safeParse({ from: 'received', to: 'cancelled', reason: 'sold_out' }).success).toBe(true);
    expect(staffStatusRequestSchema.safeParse({ from: 'received', to: 'preparing', reason: 'sold_out' }).success).toBe(false);
    expect(staffStatusRequestSchema.safeParse({ from: 'received', to: 'preparing' }).success).toBe(true);
  });
});

describe('staffLoginRequestSchema', () => {
  it('lower-cases the email so it matches how emails are stored', () => {
    expect(staffLoginRequestSchema.parse({ email: ' Ana@Example.COM ', password: 'x' }).email).toBe('ana@example.com');
    expect(staffLoginRequestSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });
});
