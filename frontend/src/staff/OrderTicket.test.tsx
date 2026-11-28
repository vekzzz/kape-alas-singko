import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { makeStaffOrder } from '../test/orderFixture';
import { OrderTicket } from './OrderTicket';

const NOW = Date.now();
const noop = () => undefined;

function render(overrides: Parameters<typeof makeStaffOrder>[0] = {}, busy = false) {
  return renderToStaticMarkup(<OrderTicket order={makeStaffOrder(overrides)} now={NOW} busy={busy} onMove={noop} onPay={noop} />);
}

describe('OrderTicket', () => {
  it('shows who, what and how to reach them', () => {
    const html = render({ name: 'Maria', number: 'A5-K7P', phone: '09171234567', lines: [{ itemName: 'Latte', optionLabels: ['Large', 'Oat milk'], note: 'less ice', quantity: 2, unitPriceCentavos: 20000, lineTotalCentavos: 40000 }] });
    expect(html).toContain('A5-K7P');
    expect(html).toContain('Maria');
    expect(html).toContain('href="tel:09171234567"');
    expect(html).toContain('2×');
    expect(html).toContain('Latte');
    expect(html).toContain('Large, Oat milk');
    expect(html).toContain('“less ice”');
  });

  it('offers the next step for each status, and only the legal moves', () => {
    expect(render({ status: 'received' })).toContain('Start making');
    expect(render({ status: 'preparing' })).toContain('Mark ready');
    expect(render({ status: 'ready' })).toContain('Hand over');

    expect(render({ status: 'received' })).not.toContain('Back to');
    expect(render({ status: 'preparing' })).toContain('Back to new');
    expect(render({ status: 'ready' })).toContain('Back to making');
  });

  it('lets a collected order be taken back, but not cancelled', () => {
    const html = render({ status: 'collected' });
    expect(html).toContain('Back to ready');
    expect(html).not.toContain('Cancel…');
    expect(html).not.toContain('Hand over');
  });

  it('can cancel until the order is collected', () => {
    for (const status of ['received', 'preparing', 'ready'] as const) expect(render({ status })).toContain('Cancel…');
  });

  it('shows a cancelled order with its reason and no buttons or payment', () => {
    const html = render({ status: 'cancelled', cancelReason: 'sold_out' });
    expect(html).toContain('Cancelled: we ran out');
    expect(html).not.toContain('Start making');
    expect(html).not.toContain('Paid cash');
    expect(html).not.toContain('Unpaid');
    expect(html).not.toContain('Back to');
  });

  it('shows whether it is paid, and offers the payment buttons only while it is not', () => {
    const unpaid = render();
    expect(unpaid).toContain('Unpaid');
    expect(unpaid).toContain('Paid Cash');
    expect(unpaid).toContain('Paid GCash');

    const paid = render({ paid: true, paymentMethod: 'gcash', paidAt: new Date().toISOString() });
    expect(paid).toContain('Paid · GCash');
    expect(paid).not.toContain('Paid Cash');
    expect(paid).toContain('Change');
  });

  it('flags a brand-new order, and a late one', () => {
    expect(render({ placedAt: new Date(NOW - 30_000).toISOString() })).toContain('tag-new');
    expect(render({ placedAt: new Date(NOW - 10 * 60_000).toISOString() })).not.toContain('tag-new');
    expect(render({ pickupAt: new Date(NOW - 10 * 60_000).toISOString(), placedAt: new Date(NOW - 30 * 60_000).toISOString() })).toContain('is-late');
  });

  it('turns every button off while the server is working', () => {
    const html = render({}, true);
    expect(html).toContain('aria-busy="true"');
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toContain('disabled');
  });
});
