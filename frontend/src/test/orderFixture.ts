import type { OrderResponse } from '@kape/contract';

/** An order as the API sends it back, due to be picked up half an hour from now. */
export function makeOrder(overrides: Partial<OrderResponse> = {}): OrderResponse {
  const placed = Date.now();
  return {
    publicId: 'k3T9xQ2mV7bN4cR8wY1zAg',
    number: 'A5-K7P',
    status: 'received',
    cancelReason: null,
    orderType: 'take-out',
    name: 'Maria',
    pickupAt: new Date(placed + 30 * 60_000).toISOString(),
    placedAt: new Date(placed).toISOString(),
    totalCentavos: 34000,
    paid: false,
    lines: [{ itemName: 'Latte', optionLabels: ['Regular', 'Hot', 'Whole milk'], note: null, quantity: 2, unitPriceCentavos: 17000, lineTotalCentavos: 34000 }],
    events: [{ status: 'received', at: new Date(placed).toISOString() }],
    ...overrides,
  };
}
