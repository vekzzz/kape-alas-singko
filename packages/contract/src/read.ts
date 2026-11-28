import { z } from 'zod';
import { artKindSchema, optionKindSchema } from './common.js';

// GET /api/v1/menu

export const menuGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  /** Menu order before 11 AM and after 6 PM. */
  morningPosition: z.number().int(),
  /** Menu order from 11 AM to 6 PM. */
  afternoonPosition: z.number().int(),
});
export type MenuGroup = z.infer<typeof menuGroupSchema>;

export const optionValueSchema = z.object({
  id: z.number().int(),
  code: z.string(),
  label: z.string(),
  priceDeltaCentavos: z.number().int(),
});
export type OptionValue = z.infer<typeof optionValueSchema>;

export const optionGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: optionKindSchema,
  values: z.array(optionValueSchema),
});
export type OptionGroup = z.infer<typeof optionGroupSchema>;

export const menuItemSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  description: z.string(),
  note: z.string().nullable(),
  basePriceCentavos: z.number().int(),
  tone: z.string(),
  stageBackground: z.string(),
  stageInk: z.string(),
  art: artKindSchema,
  coffeeRatio: z.number().nullable(),
  icedOnly: z.boolean(),
  isSoldOut: z.boolean(),
  /** Customizations this item offers, with the value picked by default. */
  options: z.array(z.object({ optionGroupId: z.string(), defaultValueId: z.number().int().nullable() })),
});
export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuResponseSchema = z.object({
  groups: z.array(menuGroupSchema),
  optionGroups: z.array(optionGroupSchema),
  items: z.array(menuItemSchema),
});
export type MenuResponse = z.infer<typeof menuResponseSchema>;

// GET /api/v1/shop

const clockTime = z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM');

export const openingHoursSchema = z.object({
  /** 0 is Sunday, 6 is Saturday. */
  weekday: z.number().int().min(0).max(6),
  opensAt: clockTime,
  closesAt: clockTime,
  isClosed: z.boolean(),
});
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const shopClosureSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  reason: z.string(),
});
export type ShopClosure = z.infer<typeof shopClosureSchema>;

export const shopResponseSchema = z.object({
  name: z.string(),
  address: z.string(),
  timezone: z.string(),
  acceptingOrders: z.boolean(),
  slotMinutes: z.number().int(),
  minLeadMinutes: z.number().int(),
  openingHours: z.array(openingHoursSchema),
  /** Upcoming closure dates only. */
  closures: z.array(shopClosureSchema),
});
export type ShopResponse = z.infer<typeof shopResponseSchema>;

// GET /api/v1/pickup-slots

export const pickupSlotsResponseSchema = z.object({
  /** The shop's local date the slots are for, or null when there are none. */
  date: z.string().nullable(),
  slots: z.array(z.object({ pickupAt: z.iso.datetime() })),
});
export type PickupSlotsResponse = z.infer<typeof pickupSlotsResponseSchema>;
