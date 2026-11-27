import { useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { cartTotal } from '../lib/pricing';
import { CartContext } from './CartContext';
import { cartReducer } from './cartReducer';
import { loadCart, saveCart } from './cartStorage';

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, undefined, loadCart);

  useEffect(() => saveCart(lines), [lines]);

  const value = useMemo(
    () => ({
      lines,
      dispatch,
      itemCount: lines.reduce((count, line) => count + line.quantity, 0),
      total: cartTotal(lines),
    }),
    [lines],
  );

  return <CartContext value={value}>{children}</CartContext>;
}
