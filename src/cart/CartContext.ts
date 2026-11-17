import { createContext, type Dispatch } from 'react';
import type { CartLine } from '../lib/pricing';
import type { CartAction } from './cartReducer';

export type CartState = {
  lines: CartLine[];
  itemCount: number;
  total: number;
  dispatch: Dispatch<CartAction>;
};

export const CartContext = createContext<CartState | null>(null);
