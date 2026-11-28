import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  menuItemOptionGroups,
  menuItems,
  openingHours,
  optionValues,
  orderItemOptions,
  orderItems,
  orderStatusEvents,
  orders,
  shopSettings,
  staff,
} from '../src/db/schema.js';
import { seedDatabase } from '../src/seed/seedDatabase.js';
import { connectTestDatabase, emptyAllTables, violatedConstraint } from './testDatabase.js';

const { db, pool } = connectTestDatabase();

let counter = 0;
function newOrder(overrides: Partial<typeof orders.$inferInsert> = {}): typeof orders.$inferInsert {
  counter += 1;
  return {
    publicId: `public-${counter}`,
    number: 'A5-K7P',
    businessDate: '2026-11-28',
    idempotencyKey: `key-${counter}`,
    orderType: 'take-out',
    customerName: 'Maria',
    pickupAt: new Date('2026-11-28T01:15:00Z'),
    totalCentavos: 17000,
    ...overrides,
  };
}

async function insertOrder(overrides: Partial<typeof orders.$inferInsert> = {}) {
  const [row] = await db.insert(orders).values(newOrder(overrides)).returning();
  return row!;
}

async function insertLine(orderId: number, overrides: Partial<typeof orderItems.$inferInsert> = {}) {
  const [row] = await db
    .insert(orderItems)
    .values({ orderId, menuItemId: 'latte', itemName: 'Latte', unitPriceCentavos: 17000, quantity: 1, lineTotalCentavos: 17000, position: 0, ...overrides })
    .returning();
  return row!;
}

async function valueId(group: string, code: string) {
  const [row] = await db
    .select({ id: optionValues.id })
    .from(optionValues)
    .where(sql`${optionValues.groupId} = ${group} and ${optionValues.code} = ${code}`);
  return row!.id;
}

beforeEach(async () => {
  await emptyAllTables(pool);
  await seedDatabase(db);
});
afterAll(() => pool.end());

describe('orders', () => {
  it('lets the same number repeat on another business day, but not on the same one', async () => {
    await insertOrder({ number: 'A5-K7P', businessDate: '2026-11-28' });

    await expect(insertOrder({ number: 'A5-K7P', businessDate: '2026-11-29' })).resolves.toBeTruthy();
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-K7P', businessDate: '2026-11-28' })))).toBe(
      'orders_number_business_date_key',
    );
  });

  it('keeps public ids and idempotency keys unique', async () => {
    await insertOrder({ publicId: 'same', idempotencyKey: 'one', number: 'A5-AAA' });

    expect(await violatedConstraint(db.insert(orders).values(newOrder({ publicId: 'same', number: 'A5-CCC' })))).toBe('orders_public_id_unique');
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ idempotencyKey: 'one', number: 'A5-DDD' })))).toBe(
      'orders_idempotency_key_unique',
    );
  });

  it('requires a reason exactly when an order is cancelled', async () => {
    const check = 'orders_cancelled_has_reason_check';
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-AAA', status: 'cancelled' })))).toBe(check);
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-CCC', status: 'ready', cancelReason: 'no_show' })))).toBe(check);

    await expect(insertOrder({ number: 'A5-DDD', status: 'cancelled', cancelReason: 'sold_out' })).resolves.toBeTruthy();
  });

  it('only accepts known statuses, types and reasons', async () => {
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-AAA', status: 'lost' })))).toBe('orders_status_check');
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-CCC', orderType: 'delivery' })))).toBe('orders_order_type_check');
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-DDD', status: 'cancelled', cancelReason: 'bored' })))).toBe(
      'orders_cancel_reason_check',
    );
  });

  it('allows a missing phone but not a malformed one', async () => {
    await expect(insertOrder({ number: 'A5-AAA', phone: null })).resolves.toBeTruthy();
    await expect(insertOrder({ number: 'A5-CCC', phone: '09171234567' })).resolves.toBeTruthy();
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-DDD', phone: '+639171234567' })))).toBe('orders_phone_check');
  });

  it('limits the name to 30 characters', async () => {
    await expect(insertOrder({ number: 'A5-AAA', customerName: 'x'.repeat(30) })).resolves.toBeTruthy();
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-CCC', customerName: 'x'.repeat(31) })))).toBe(
      'orders_customer_name_check',
    );
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-DDD', customerName: '   ' })))).toBe('orders_customer_name_check');
  });

  it('records payment method and time together', async () => {
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-AAA', paymentMethod: 'cash' })))).toBe('orders_paid_check');
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-CCC', paidAt: new Date() })))).toBe('orders_paid_check');
    await expect(insertOrder({ number: 'A5-DDD', paymentMethod: 'gcash', paidAt: new Date() })).resolves.toBeTruthy();
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ number: 'A5-EEE', paymentMethod: 'card', paidAt: new Date() })))).toBe(
      'orders_payment_method_check',
    );
  });

  it('does not allow a negative total', async () => {
    expect(await violatedConstraint(db.insert(orders).values(newOrder({ totalCentavos: -1 })))).toBe('orders_total_check');
  });
});

describe('order lines', () => {
  it('keeps the line total equal to unit price times quantity', async () => {
    const order = await insertOrder();

    await expect(insertLine(order.id, { quantity: 3, lineTotalCentavos: 51000, position: 0 })).resolves.toBeTruthy();
    expect(await violatedConstraint(db.insert(orderItems).values({ orderId: order.id, itemName: 'Latte', unitPriceCentavos: 17000, quantity: 2, lineTotalCentavos: 17000, position: 1 }))).toBe(
      'order_items_prices_check',
    );
  });

  it('limits quantity to 1 through 99', async () => {
    const order = await insertOrder();
    for (const quantity of [0, 100]) {
      expect(
        await violatedConstraint(
          db.insert(orderItems).values({ orderId: order.id, itemName: 'Latte', unitPriceCentavos: 0, quantity, lineTotalCentavos: 0, position: quantity }),
        ),
      ).toBe('order_items_quantity_check');
    }
  });

  it('keeps the receipt when a menu item is deleted later', async () => {
    const order = await insertOrder();
    await insertLine(order.id, { menuItemId: 'latte' });

    await db.delete(menuItemOptionGroups).where(eq(menuItemOptionGroups.menuItemId, 'latte'));
    await db.delete(menuItems).where(eq(menuItems.id, 'latte'));

    const [line] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    expect(line).toMatchObject({ menuItemId: null, itemName: 'Latte', unitPriceCentavos: 17000 });
  });

  it('removes lines, options and events with their order', async () => {
    const order = await insertOrder();
    const line = await insertLine(order.id);
    await db.insert(orderItemOptions).values({
      orderItemId: line.id,
      optionGroupId: 'size',
      optionValueId: await valueId('size', 'large'),
      label: 'Large',
      priceDeltaCentavos: 3000,
    });
    await db.insert(orderStatusEvents).values({ orderId: order.id, status: 'received', actor: 'customer' });

    await db.delete(orders).where(eq(orders.id, order.id));

    expect(await db.select().from(orderItems)).toHaveLength(0);
    expect(await db.select().from(orderItemOptions)).toHaveLength(0);
    expect(await db.select().from(orderStatusEvents)).toHaveLength(0);
  });
});

describe('order line options', () => {
  it('allows one choice per group, and not two milks on a line', async () => {
    const order = await insertOrder();
    const line = await insertLine(order.id);

    await db.insert(orderItemOptions).values({
      orderItemId: line.id,
      optionGroupId: 'milk',
      optionValueId: await valueId('milk', 'oat'),
      label: 'Oat milk',
      priceDeltaCentavos: 4000,
    });

    const second = await violatedConstraint(
      db.insert(orderItemOptions).values({
        orderItemId: line.id,
        optionGroupId: 'milk',
        optionValueId: await valueId('milk', 'whole'),
        label: 'Whole milk',
        priceDeltaCentavos: 0,
      }),
    );
    expect(second).toContain('order_item_options');
  });

  it('rejects a value that belongs to a different group', async () => {
    const order = await insertOrder();
    const line = await insertLine(order.id);

    expect(
      await violatedConstraint(
        db.insert(orderItemOptions).values({
          orderItemId: line.id,
          optionGroupId: 'milk',
          optionValueId: await valueId('size', 'large'),
          label: 'Large',
          priceDeltaCentavos: 3000,
        }),
      ),
    ).toBe('order_item_options_value_fkey');
  });
});

describe('menu options', () => {
  it('requires an item default to belong to its option group', async () => {
    expect(
      await violatedConstraint(
        db
          .update(menuItemOptionGroups)
          .set({ defaultValueId: await valueId('milk', 'oat') })
          .where(sql`${menuItemOptionGroups.menuItemId} = 'latte' and ${menuItemOptionGroups.optionGroupId} = 'size'`),
      ),
    ).toBe('menu_item_option_groups_default_fkey');
  });

  it('rejects an art kind the frontend cannot draw', async () => {
    expect(await violatedConstraint(db.update(menuItems).set({ art: 'teapot' }).where(eq(menuItems.id, 'latte')))).toBe('menu_items_art_check');
  });
});

describe('status events', () => {
  it('needs a staff member when the actor is staff', async () => {
    const order = await insertOrder();

    expect(await violatedConstraint(db.insert(orderStatusEvents).values({ orderId: order.id, status: 'preparing', actor: 'staff' }))).toBe(
      'order_status_events_staff_check',
    );
    await expect(db.insert(orderStatusEvents).values({ orderId: order.id, status: 'received', actor: 'customer' })).resolves.toBeTruthy();

    const [barista] = await db.insert(staff).values({ name: 'Ana', email: 'ana@example.com', passwordHash: 'x', role: 'barista' }).returning();
    await expect(
      db.insert(orderStatusEvents).values({ orderId: order.id, status: 'preparing', actor: 'staff', staffId: barista!.id }),
    ).resolves.toBeTruthy();
  });
});

describe('staff', () => {
  it('stores emails in lower case only', async () => {
    expect(await violatedConstraint(db.insert(staff).values({ name: 'Ana', email: 'Ana@Example.com', passwordHash: 'x', role: 'barista' }))).toBe(
      'staff_email_lower_check',
    );
  });

  it('knows only barista and manager', async () => {
    expect(await violatedConstraint(db.insert(staff).values({ name: 'Ana', email: 'ana@example.com', passwordHash: 'x', role: 'owner' }))).toBe('staff_role_check');
  });
});

describe('shop', () => {
  it('has a single settings row', async () => {
    expect(
      await violatedConstraint(db.insert(shopSettings).values({ id: 2, name: 'Other', address: 'x', timezone: 'Asia/Manila', orderPrefix: 'B-', slotMinutes: 15, minLeadMinutes: 10 })),
    ).toBe('shop_settings_single_row_check');
  });

  it('keeps weekdays between 0 and 6 and closing after opening', async () => {
    await db.delete(openingHours);

    expect(await violatedConstraint(db.insert(openingHours).values({ weekday: 7, opensAt: '05:00', closesAt: '21:00' }))).toBe('opening_hours_weekday_check');
    expect(await violatedConstraint(db.insert(openingHours).values({ weekday: 1, opensAt: '21:00', closesAt: '05:00' }))).toBe('opening_hours_order_check');
  });
});
