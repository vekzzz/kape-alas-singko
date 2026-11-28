import type { ReactNode } from 'react';
import { useMenu } from '../../api/hooks';
import { useOptionalCatalog } from '../../data/CatalogContext';

/**
 * Shows its children once the menu has loaded. Until then it says what is happening, because the first
 * request after a quiet spell can take a while (the free API host sleeps when nobody is around).
 */
export function RequireCatalog({ children }: { children: ReactNode }) {
  const catalog = useOptionalCatalog();
  const menu = useMenu();

  if (catalog) return children;

  if (menu.isError) {
    return (
      <div className="cart" role="alert">
        <h2 className="head">We couldn't load the menu</h2>
        <p className="lead">Check your connection and try again. Your cart is safe.</p>
        <button type="button" className="btn" onClick={() => void menu.refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="cart" role="status">
      <h2 className="head">Warming up the machine…</h2>
      <p className="lead">Getting today's menu ready. The first visit can take a few seconds.</p>
    </div>
  );
}
