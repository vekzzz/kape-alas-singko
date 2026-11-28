import type { MenuResponse, OrderLineInput } from '@kape/contract';

export type PricedOption = { optionGroupId: string; optionValueId: number; label: string; priceDeltaCentavos: number };

export type PricedLine = {
  itemId: string;
  itemName: string;
  note: string | null;
  quantity: number;
  unitPriceCentavos: number;
  lineTotalCentavos: number;
  /** Only the choices worth writing on the receipt: a toggle that is off (no extra shot) is left out. */
  options: PricedOption[];
};

export type PriceResult = { ok: true; lines: PricedLine[]; totalCentavos: number } | { ok: false; unavailable: string[] };

/**
 * Prices an order from the menu, ignoring whatever prices the customer's screen showed.
 * An item that is unknown, hidden or sold out, or an option it does not offer, makes the order unavailable.
 */
export function priceOrder(menu: MenuResponse, lines: OrderLineInput[]): PriceResult {
  const items = new Map(menu.items.map((item) => [item.id, item]));
  const groups = new Map(menu.optionGroups.map((group) => [group.id, group]));
  const unavailable = new Set<string>();
  const priced: PricedLine[] = [];

  for (const line of lines) {
    const item = items.get(line.itemId);
    if (!item) {
      unavailable.add(line.itemId);
      continue;
    }
    if (item.isSoldOut) {
      unavailable.add(item.name);
      continue;
    }

    const offered = new Set(item.options.map((option) => option.optionGroupId));
    if (Object.keys(line.options).some((groupId) => !offered.has(groupId))) {
      unavailable.add(item.name);
      continue;
    }

    const options: PricedOption[] = [];
    let unitPriceCentavos = item.basePriceCentavos;
    let valid = true;

    for (const offer of item.options) {
      const group = groups.get(offer.optionGroupId);
      const wanted = line.options[offer.optionGroupId];
      const value = group && (wanted !== undefined ? group.values.find((v) => v.code === wanted) : (group.values.find((v) => v.id === offer.defaultValueId) ?? group.values[0]));
      if (!group || !value) {
        valid = false;
        break;
      }
      unitPriceCentavos += value.priceDeltaCentavos;
      const isSwitchedOff = group.kind === 'toggle' && value.priceDeltaCentavos === 0;
      if (!isSwitchedOff) options.push({ optionGroupId: group.id, optionValueId: value.id, label: value.label, priceDeltaCentavos: value.priceDeltaCentavos });
    }
    if (!valid) {
      unavailable.add(item.name);
      continue;
    }

    priced.push({
      itemId: item.id,
      itemName: item.name,
      note: line.note,
      quantity: line.quantity,
      unitPriceCentavos,
      lineTotalCentavos: unitPriceCentavos * line.quantity,
      options,
    });
  }

  if (unavailable.size > 0) return { ok: false, unavailable: [...unavailable] };
  return { ok: true, lines: priced, totalCentavos: priced.reduce((sum, line) => sum + line.lineTotalCentavos, 0) };
}
