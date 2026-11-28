import { z } from 'zod';
import { cancelReasonSchema, orderStatusSchema, paymentMethodSchema, staffRoleSchema } from './common.js';
import { orderResponseSchema } from './orders.js';

// ---------------------------------------------------------------------------
// Order status rules, shared so the board only offers moves the server allows
// ---------------------------------------------------------------------------

/** The steps an order moves through, in order. `cancelled` sits outside them. */
export const STATUS_STEPS = ['received', 'preparing', 'ready', 'collected'] as const;

export type StatusMove = 'forward' | 'back' | 'cancel';

/**
 * What staff may do to an order that is currently `from`:
 * one step forward, one step back (an undo after a mis-tap), or cancel while it is not yet collected.
 * A cancelled order stays cancelled.
 */
export function statusMove(from: z.infer<typeof orderStatusSchema>, to: z.infer<typeof orderStatusSchema>): StatusMove | null {
  if (to === 'cancelled') return from === 'received' || from === 'preparing' || from === 'ready' ? 'cancel' : null;
  const a = STATUS_STEPS.indexOf(from as (typeof STATUS_STEPS)[number]);
  const b = STATUS_STEPS.indexOf(to as (typeof STATUS_STEPS)[number]);
  if (a === -1 || b === -1) return null;
  if (b === a + 1) return 'forward';
  if (b === a - 1) return 'back';
  return null;
}

/** The status one step on, or null when there is none (collected, cancelled). */
export function nextStatus(from: z.infer<typeof orderStatusSchema>): (typeof STATUS_STEPS)[number] | null {
  const index = STATUS_STEPS.indexOf(from as (typeof STATUS_STEPS)[number]);
  return index === -1 ? null : (STATUS_STEPS[index + 1] ?? null);
}

/** The status one step back, or null when there is none. */
export function previousStatus(from: z.infer<typeof orderStatusSchema>): (typeof STATUS_STEPS)[number] | null {
  const index = STATUS_STEPS.indexOf(from as (typeof STATUS_STEPS)[number]);
  return index <= 0 ? null : (STATUS_STEPS[index - 1] ?? null);
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export const staffLoginRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter your email address')
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, 'Enter your password').max(200),
});
export type StaffLoginRequest = z.input<typeof staffLoginRequestSchema>;

export const staffMemberSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  role: staffRoleSchema,
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

export const staffLoginResponseSchema = z.object({
  /** Opaque bearer token. Send it as `Authorization: Bearer <token>`. */
  token: z.string(),
  staff: staffMemberSchema,
  /** Pushed forward while the token is in use. */
  expiresAt: z.iso.datetime(),
});
export type StaffLoginResponse = z.infer<typeof staffLoginResponseSchema>;

export const staffMeResponseSchema = z.object({ staff: staffMemberSchema, expiresAt: z.iso.datetime() });
export type StaffMeResponse = z.infer<typeof staffMeResponseSchema>;

// ---------------------------------------------------------------------------
// The board
// ---------------------------------------------------------------------------

/** An order as the board sees it: the customer's view plus what only staff need. */
export const staffOrderSchema = orderResponseSchema.extend({
  /** The pickup day this order belongs to, as a shop-local date. */
  businessDate: z.string(),
  /** Cleared 30 days after the order is done. */
  phone: z.string().nullable(),
  paymentMethod: paymentMethodSchema.nullable(),
  paidAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});
export type StaffOrder = z.infer<typeof staffOrderSchema>;

export const staffOrdersResponseSchema = z.object({
  /** The business day these orders are for. */
  date: z.string(),
  /** Soonest pickup first. With `since`, only orders that changed after it. */
  orders: z.array(staffOrderSchema),
  /** Pass back as `since` on the next call. It runs a few seconds behind, so nothing is missed. */
  cursor: z.iso.datetime(),
});
export type StaffOrdersResponse = z.infer<typeof staffOrdersResponseSchema>;

export const staffStatusRequestSchema = z
  .object({
    /** What the board thinks the status is. If someone else already changed it, the answer is STATUS_CONFLICT. */
    from: orderStatusSchema,
    to: orderStatusSchema,
    /** Required when cancelling. */
    reason: cancelReasonSchema.optional(),
  })
  .superRefine((request, context) => {
    if (request.to === 'cancelled' && !request.reason) {
      context.addIssue({ code: 'custom', path: ['reason'], message: 'Say why the order is being cancelled' });
    }
    if (request.to !== 'cancelled' && request.reason) {
      context.addIssue({ code: 'custom', path: ['reason'], message: 'A reason only goes with a cancellation' });
    }
  });
export type StaffStatusRequest = z.input<typeof staffStatusRequestSchema>;

export const staffPaymentRequestSchema = z.object({ method: paymentMethodSchema });
export type StaffPaymentRequest = z.infer<typeof staffPaymentRequestSchema>;

/** `details` on the 409 STATUS_CONFLICT answer: where the order really is. */
export const statusConflictDetailsSchema = z.object({ order: staffOrderSchema });

export const staffMenuItemPatchSchema = z.object({ isSoldOut: z.boolean() });
export const staffMenuItemResponseSchema = z.object({ id: z.string(), isSoldOut: z.boolean() });
export type StaffMenuItemResponse = z.infer<typeof staffMenuItemResponseSchema>;

export const staffShopPatchSchema = z.object({ acceptingOrders: z.boolean() });
export const staffShopResponseSchema = z.object({ acceptingOrders: z.boolean() });
export type StaffShopResponse = z.infer<typeof staffShopResponseSchema>;
