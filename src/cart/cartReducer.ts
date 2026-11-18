import type { CartLine, DrinkOptions } from '../lib/pricing';

type LineDetails = { options: DrinkOptions; note: string; quantity: number };

export type CartAction =
  | ({ type: 'add'; itemId: string } & LineDetails)
  | ({ type: 'update'; id: string } & LineDetails)
  | { type: 'setQuantity'; id: string; quantity: number }
  | { type: 'remove'; id: string }
  /** Puts a removed line back where it was (undo). */
  | { type: 'restore'; line: CartLine; index: number }
  | { type: 'clear' };

function sameOptions(a: DrinkOptions, b: DrinkOptions): boolean {
  return a.size === b.size && a.temperature === b.temperature && a.milk === b.milk && a.extraShot === b.extraShot;
}

function newLineId(itemId: string): string {
  return `${itemId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const { itemId, options, note, quantity } = action;
      // The same drink with the same choices stacks onto one line.
      const match = lines.find((line) => line.itemId === itemId && line.note === note && sameOptions(line.options, options));
      if (match) {
        return lines.map((line) => (line === match ? { ...line, quantity: line.quantity + quantity } : line));
      }
      return [...lines, { id: newLineId(itemId), itemId, options, note, quantity }];
    }

    case 'update': {
      const { id, options, note, quantity } = action;
      return lines.map((line) => (line.id === id ? { ...line, options, note, quantity } : line));
    }

    case 'setQuantity':
      if (action.quantity < 1) return lines.filter((line) => line.id !== action.id);
      return lines.map((line) => (line.id === action.id ? { ...line, quantity: action.quantity } : line));

    case 'remove':
      return lines.filter((line) => line.id !== action.id);

    case 'restore': {
      if (lines.some((line) => line.id === action.line.id)) return lines;
      const index = Math.min(Math.max(action.index, 0), lines.length);
      return [...lines.slice(0, index), action.line, ...lines.slice(index)];
    }

    case 'clear':
      return [];
  }
}
