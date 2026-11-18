import { useEffect, useState } from 'react';
import { useCart } from '../cart/useCart';
import type { MenuItem } from '../data/menu';
import { flyToCart } from '../lib/flyToCart';
import { defaultOptions } from '../lib/pricing';

const ADDED_MESSAGE_MS = 1400;

export function useQuickAdd(item: MenuItem) {
  const { dispatch } = useCart();
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  useEffect(() => {
    if (!justAddedId) return;
    const timer = setTimeout(() => setJustAddedId(null), ADDED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [justAddedId]);

  const add = (button: HTMLElement | null) => {
    dispatch({ type: 'add', itemId: item.id, options: defaultOptions(item), note: '', quantity: 1 });
    flyToCart(button);
    setJustAddedId(item.id);
  };

  return { add, justAdded: justAddedId === item.id };
}
