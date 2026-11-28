import { z } from 'zod';

export const ORDER_TYPES = ['dine-in', 'take-out'] as const;
export const orderTypeSchema = z.enum(ORDER_TYPES);
export type OrderType = z.infer<typeof orderTypeSchema>;

export const ORDER_STATUSES = ['received', 'preparing', 'ready', 'collected', 'cancelled'] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const CANCEL_REASONS = ['sold_out', 'customer_request', 'no_show', 'other'] as const;
export const cancelReasonSchema = z.enum(CANCEL_REASONS);
export type CancelReason = z.infer<typeof cancelReasonSchema>;

export const PAYMENT_METHODS = ['cash', 'gcash'] as const;
export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const STATUS_ACTORS = ['customer', 'staff', 'system'] as const;
export const statusActorSchema = z.enum(STATUS_ACTORS);
export type StatusActor = z.infer<typeof statusActorSchema>;

export const STAFF_ROLES = ['barista', 'manager'] as const;
export const staffRoleSchema = z.enum(STAFF_ROLES);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const OPTION_KINDS = ['single', 'toggle'] as const;
export const optionKindSchema = z.enum(OPTION_KINDS);
export type OptionKind = z.infer<typeof optionKindSchema>;

/** Which drawing the frontend uses for a product. An iced drink is drawn as a glass at runtime regardless. */
export const ART_KINDS = ['cup', 'small-cup', 'demitasse', 'mug', 'glass', 'press', 'pour-over', 'pastry'] as const;
export const artKindSchema = z.enum(ART_KINDS);
export type ArtKind = z.infer<typeof artKindSchema>;

export const ERROR_CODES = [
  'VALIDATION',
  'UNAUTHENTICATED',
  'NOT_FOUND',
  'RATE_LIMITED',
  'PRICE_CHANGED',
  'ITEM_UNAVAILABLE',
  'SLOT_UNAVAILABLE',
  'ORDERS_PAUSED',
  'CANNOT_CANCEL',
  'STATUS_CONFLICT',
  'INVALID_TRANSITION',
  'INTERNAL',
] as const;
export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

/** Philippine mobile number as stored: 09XXXXXXXXX. */
export const phoneSchema = z.string().regex(/^09\d{9}$/, 'Use a number like 0917 123 4567');

export const MAX_NAME_LENGTH = 30;
export const MAX_QUANTITY = 99;
