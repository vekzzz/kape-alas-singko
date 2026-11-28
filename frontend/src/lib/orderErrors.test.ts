import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../api/client';
import { cancelOrderMessage, placeOrderMessage, staleAfter } from './orderErrors';

const apiError = (code: string, extra: ConstructorParameters<typeof ApiRequestError>[3] = {}, status = 409) => new ApiRequestError('server words', status, code, extra);

describe('placeOrderMessage', () => {
  it('shows the new total when prices changed', () => {
    expect(placeOrderMessage(apiError('PRICE_CHANGED', { details: { totalCentavos: 60000 } }))).toContain('₱600');
    expect(placeOrderMessage(apiError('PRICE_CHANGED'))).toContain('Prices changed');
  });

  it('names what is unavailable', () => {
    expect(placeOrderMessage(apiError('ITEM_UNAVAILABLE', { details: { items: ['Ube cheese pandesal'] } }))).toContain('Ube cheese pandesal');
    expect(placeOrderMessage(apiError('ITEM_UNAVAILABLE', { details: { items: ['Latte', 'Pan de sal', 'Banana loaf'] } }))).toContain('Latte, Pan de sal and Banana loaf');
  });

  it('has a message for each refusal', () => {
    expect(placeOrderMessage(apiError('SLOT_UNAVAILABLE'))).toMatch(/pickup time/);
    expect(placeOrderMessage(apiError('ORDERS_PAUSED'))).toMatch(/paused/);
    expect(placeOrderMessage(apiError('RATE_LIMITED', {}, 429))).toMatch(/minute/);
  });

  it('shows the first field problem for a bad request', () => {
    expect(placeOrderMessage(apiError('VALIDATION', { fields: { name: 'Please tell us a name to call out' } }, 400))).toBe('Please tell us a name to call out');
  });

  it('says it could not reach the bar for anything else', () => {
    for (const error of [new TypeError('Failed to fetch'), apiError('INTERNAL', {}, 500), new Error('timeout')]) {
      expect(placeOrderMessage(error)).toMatch(/couldn't reach the bar/);
    }
  });
});

describe('cancelOrderMessage', () => {
  it('sends them to the counter when the bar has started', () => {
    expect(cancelOrderMessage(apiError('CANNOT_CANCEL'))).toMatch(/counter/);
    expect(cancelOrderMessage(new TypeError('Failed to fetch'))).toMatch(/try again/);
  });
});

describe('staleAfter', () => {
  it('says which data to look at again', () => {
    expect(staleAfter(apiError('PRICE_CHANGED'))).toEqual(['menu']);
    expect(staleAfter(apiError('ITEM_UNAVAILABLE'))).toEqual(['menu']);
    expect(staleAfter(apiError('SLOT_UNAVAILABLE'))).toContain('pickup-slots');
    expect(staleAfter(apiError('ORDERS_PAUSED'))).toContain('shop');
    expect(staleAfter(new TypeError('Failed to fetch'))).toEqual([]);
  });
});
