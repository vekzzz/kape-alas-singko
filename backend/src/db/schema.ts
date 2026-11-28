import {
  ART_KINDS,
  CANCEL_REASONS,
  OPTION_KINDS,
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  STAFF_ROLES,
  STATUS_ACTORS,
} from '@kape/contract';
import { sql, type SQL } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  time,
  timestamp,
  unique,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

/** `column IN ('a', 'b')` with the values written into the SQL, because CHECK constraints cannot take parameters. */
function literals(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

function oneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  return sql`${column} in (${literals(values)})`;
}

function nullOrOneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  return sql`${column} is null or ${column} in (${literals(values)})`;
}

const id = () => bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity();
const moment = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const stamp = (name: string) => moment(name).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export const menuGroups = pgTable('menu_groups', {
  id: text().primaryKey(),
  name: text().notNull(),
  tagline: text().notNull(),
  morningPosition: smallint('morning_position').notNull(),
  afternoonPosition: smallint('afternoon_position').notNull(),
});

export const menuItems = pgTable(
  'menu_items',
  {
    id: text().primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => menuGroups.id),
    name: text().notNull(),
    description: text().notNull(),
    note: text(),
    basePriceCentavos: integer('base_price_centavos').notNull(),
    tone: text().notNull(),
    stageBackground: text('stage_background').notNull(),
    stageInk: text('stage_ink').notNull(),
    art: text().notNull(),
    coffeeRatio: real('coffee_ratio'),
    icedOnly: boolean('iced_only').notNull().default(false),
    isSoldOut: boolean('is_sold_out').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    position: smallint().notNull(),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at'),
  },
  (t) => [
    check('menu_items_price_check', sql`${t.basePriceCentavos} >= 0`),
    check('menu_items_art_check', oneOf(t.art, ART_KINDS)),
    check('menu_items_coffee_ratio_check', sql`${t.coffeeRatio} is null or (${t.coffeeRatio} >= 0 and ${t.coffeeRatio} <= 1)`),
    index('menu_items_group_idx').on(t.groupId, t.position),
  ],
);

export const optionGroups = pgTable(
  'option_groups',
  {
    id: text().primaryKey(),
    label: text().notNull(),
    kind: text().notNull(),
    position: smallint().notNull(),
  },
  (t) => [check('option_groups_kind_check', oneOf(t.kind, OPTION_KINDS))],
);

export const optionValues = pgTable(
  'option_values',
  {
    id: id(),
    groupId: text('group_id')
      .notNull()
      .references(() => optionGroups.id),
    code: text().notNull(),
    label: text().notNull(),
    priceDeltaCentavos: integer('price_delta_centavos').notNull().default(0),
    position: smallint().notNull(),
  },
  (t) => [
    unique('option_values_group_code_key').on(t.groupId, t.code),
    // Lets other tables point at (value, group) together, so a value can never be paired with the wrong group.
    unique('option_values_id_group_key').on(t.id, t.groupId),
    check('option_values_price_delta_check', sql`${t.priceDeltaCentavos} >= 0`),
  ],
);

export const menuItemOptionGroups = pgTable(
  'menu_item_option_groups',
  {
    menuItemId: text('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    optionGroupId: text('option_group_id')
      .notNull()
      .references(() => optionGroups.id),
    defaultValueId: bigint('default_value_id', { mode: 'number' }),
  },
  (t) => [
    primaryKey({ columns: [t.menuItemId, t.optionGroupId] }),
    // The default must belong to this option group. Skipped while default_value_id is null.
    foreignKey({
      name: 'menu_item_option_groups_default_fkey',
      columns: [t.defaultValueId, t.optionGroupId],
      foreignColumns: [optionValues.id, optionValues.groupId],
    }),
  ],
);

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export const staff = pgTable(
  'staff',
  {
    id: id(),
    name: text().notNull(),
    email: text().notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text().notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: stamp('created_at'),
  },
  (t) => [
    check('staff_role_check', oneOf(t.role, STAFF_ROLES)),
    check('staff_email_lower_check', sql`${t.email} = lower(${t.email})`),
  ],
);

export const staffSessions = pgTable(
  'staff_sessions',
  {
    id: id(),
    staffId: bigint('staff_id', { mode: 'number' })
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: stamp('created_at'),
    lastUsedAt: stamp('last_used_at'),
    expiresAt: moment('expires_at').notNull(),
    revokedAt: moment('revoked_at'),
  },
  (t) => [index('staff_sessions_staff_idx').on(t.staffId)],
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const orders = pgTable(
  'orders',
  {
    id: id(),
    publicId: text('public_id').notNull().unique(),
    number: text().notNull(),
    /** Manila date of pickup_at. Order numbers are unique within it. */
    businessDate: date('business_date', { mode: 'string' }).notNull(),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    orderType: text('order_type').notNull(),
    customerName: text('customer_name').notNull(),
    phone: text(),
    pickupAt: moment('pickup_at').notNull(),
    placedAt: moment('placed_at').notNull().defaultNow(),
    totalCentavos: integer('total_centavos').notNull(),
    status: text().notNull().default('received'),
    cancelReason: text('cancel_reason'),
    paymentMethod: text('payment_method'),
    paidAt: moment('paid_at'),
    createdAt: stamp('created_at'),
    updatedAt: stamp('updated_at'),
  },
  (t) => [
    unique('orders_number_business_date_key').on(t.number, t.businessDate),
    check('orders_order_type_check', oneOf(t.orderType, ORDER_TYPES)),
    check('orders_customer_name_check', sql`char_length(btrim(${t.customerName})) between 1 and 30`),
    check('orders_phone_check', sql`${t.phone} is null or ${t.phone} ~ '^09[0-9]{9}$'`),
    check('orders_total_check', sql`${t.totalCentavos} >= 0`),
    check('orders_status_check', oneOf(t.status, ORDER_STATUSES)),
    check('orders_cancel_reason_check', nullOrOneOf(t.cancelReason, CANCEL_REASONS)),
    // A cancelled order always says why, and nothing else carries a reason.
    check('orders_cancelled_has_reason_check', sql`(${t.status} = 'cancelled') = (${t.cancelReason} is not null)`),
    check('orders_payment_method_check', nullOrOneOf(t.paymentMethod, PAYMENT_METHODS)),
    check('orders_paid_check', sql`(${t.paymentMethod} is null) = (${t.paidAt} is null)`),
    index('orders_board_idx').on(t.businessDate, t.status, t.pickupAt),
    index('orders_changed_idx').on(t.businessDate, t.updatedAt),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: text('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),
    itemName: text('item_name').notNull(),
    unitPriceCentavos: integer('unit_price_centavos').notNull(),
    quantity: smallint().notNull(),
    lineTotalCentavos: integer('line_total_centavos').notNull(),
    note: text(),
    position: smallint().notNull(),
  },
  (t) => [
    unique('order_items_order_position_key').on(t.orderId, t.position),
    check('order_items_quantity_check', sql`${t.quantity} between 1 and 99`),
    check('order_items_prices_check', sql`${t.unitPriceCentavos} >= 0 and ${t.lineTotalCentavos} = ${t.unitPriceCentavos} * ${t.quantity}`),
  ],
);

export const orderItemOptions = pgTable(
  'order_item_options',
  {
    orderItemId: bigint('order_item_id', { mode: 'number' })
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    optionGroupId: text('option_group_id').notNull(),
    optionValueId: bigint('option_value_id', { mode: 'number' }).notNull(),
    label: text().notNull(),
    priceDeltaCentavos: integer('price_delta_centavos').notNull(),
  },
  (t) => [
    // One choice per group per line, and the value must belong to that group.
    primaryKey({ columns: [t.orderItemId, t.optionGroupId] }),
    foreignKey({
      name: 'order_item_options_value_fkey',
      columns: [t.optionValueId, t.optionGroupId],
      foreignColumns: [optionValues.id, optionValues.groupId],
    }),
  ],
);

export const orderStatusEvents = pgTable(
  'order_status_events',
  {
    id: id(),
    orderId: bigint('order_id', { mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: text().notNull(),
    actor: text().notNull(),
    staffId: bigint('staff_id', { mode: 'number' }).references(() => staff.id),
    changedAt: moment('changed_at').notNull().defaultNow(),
  },
  (t) => [
    check('order_status_events_status_check', oneOf(t.status, ORDER_STATUSES)),
    check('order_status_events_actor_check', oneOf(t.actor, STATUS_ACTORS)),
    check('order_status_events_staff_check', sql`${t.actor} <> 'staff' or ${t.staffId} is not null`),
    index('order_status_events_order_idx').on(t.orderId, t.changedAt),
  ],
);

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export const shopSettings = pgTable(
  'shop_settings',
  {
    id: smallint().primaryKey().default(1),
    name: text().notNull(),
    address: text().notNull(),
    timezone: text().notNull(),
    orderPrefix: text('order_prefix').notNull(),
    slotMinutes: smallint('slot_minutes').notNull(),
    minLeadMinutes: smallint('min_lead_minutes').notNull(),
    acceptingOrders: boolean('accepting_orders').notNull().default(true),
    updatedAt: stamp('updated_at'),
  },
  (t) => [
    check('shop_settings_single_row_check', sql`${t.id} = 1`),
    check('shop_settings_slot_check', sql`${t.slotMinutes} > 0 and ${t.minLeadMinutes} >= 0`),
  ],
);

export const openingHours = pgTable(
  'opening_hours',
  {
    weekday: smallint().primaryKey(),
    opensAt: time('opens_at').notNull(),
    closesAt: time('closes_at').notNull(),
    isClosed: boolean('is_closed').notNull().default(false),
  },
  (t) => [
    check('opening_hours_weekday_check', sql`${t.weekday} between 0 and 6`),
    check('opening_hours_order_check', sql`${t.closesAt} > ${t.opensAt}`),
  ],
);

export const shopClosures = pgTable('shop_closures', {
  closedOn: date('closed_on', { mode: 'string' }).primaryKey(),
  reason: text().notNull(),
});
