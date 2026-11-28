import { z } from 'zod';
import {
  MAX_NAME_LENGTH,
  MAX_QUANTITY,
  cancelReasonSchema,
  orderStatusSchema,
  orderTypeSchema,
  phoneSchema,
} from './common.js';

export const MAX_NOTE_LENGTH = 60;
export const MAX_ORDER_LINES = 50;

// POST /api/v1/orders

export const orderLineRequestSchema = z.object({
  itemId: z.string().min(1),
  /** Option group id to value code, e.g. { size: "large", milk: "oat" }. A group left out takes the item's default. */
  options: z.record(z.string(), z.string()).default({}),
  note: z
    .string()
    .trim()
    .max(MAX_NOTE_LENGTH)
    .nullish()
    .transform((note) => note || null),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});
export type OrderLineRequest = z.input<typeof orderLineRequestSchema>;
export type OrderLineInput = z.output<typeof orderLineRequestSchema>;

export const createOrderRequestSchema = z.object({
  orderType: orderTypeSchema,
  name: z.string().trim().min(1, 'Please tell us a name to call out').max(MAX_NAME_LENGTH),
  /** 09XXXXXXXXX, or null when the customer did not give one. */
  phone: phoneSchema.nullish().transform((phone) => phone ?? null),
  pickupAt: z.iso.datetime(),
  lines: z.array(orderLineRequestSchema).min(1).max(MAX_ORDER_LINES),
  /** What the customer saw. The server prices the order itself and refuses if the two differ. */
  expectedTotalCentavos: z.number().int().min(0),
});
export type CreateOrderRequest = z.input<typeof createOrderRequestSchema>;
export type CreateOrderInput = z.output<typeof createOrderRequestSchema>;

/** The `Idempotency-Key` header: one per checkout attempt, so a retry never creates a second order. */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

// Order replies: POST /orders, GET /orders/:publicId, POST /orders/:publicId/cancel

export const orderLineSchema = z.object({
  itemName: z.string(),
  optionLabels: z.array(z.string()),
  note: z.string().nullable(),
  quantity: z.number().int(),
  unitPriceCentavos: z.number().int(),
  lineTotalCentavos: z.number().int(),
});
export type OrderLine = z.infer<typeof orderLineSchema>;

export const orderEventSchema = z.object({
  status: orderStatusSchema,
  at: z.iso.datetime(),
});
export type OrderEvent = z.infer<typeof orderEventSchema>;

export const orderResponseSchema = z.object({
  /** Unguessable id used in URLs. The short `number` is for calling out at the counter and repeats every day. */
  publicId: z.string(),
  number: z.string(),
  status: orderStatusSchema,
  cancelReason: cancelReasonSchema.nullable(),
  orderType: orderTypeSchema,
  name: z.string(),
  pickupAt: z.iso.datetime(),
  placedAt: z.iso.datetime(),
  totalCentavos: z.number().int(),
  paid: z.boolean(),
  lines: z.array(orderLineSchema),
  events: z.array(orderEventSchema),
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;

/** `details` on the 409 answers to POST /orders. */
export const priceChangedDetailsSchema = z.object({ totalCentavos: z.number().int() });
export const itemUnavailableDetailsSchema = z.object({ items: z.array(z.string()) });
