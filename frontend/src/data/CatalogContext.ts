import { createContext, use } from 'react';
import type { Catalog } from './menu';

/** The menu once it has loaded, or null while it is still on its way. */
export const CatalogContext = createContext<Catalog | null>(null);

/** For code that can run before the menu arrives. */
export function useOptionalCatalog(): Catalog | null {
  return use(CatalogContext);
}

/** For screens that only exist once the menu has loaded (wrap them in <RequireCatalog>). */
export function useCatalog(): Catalog {
  const catalog = use(CatalogContext);
  if (!catalog) throw new Error('useCatalog needs the menu. Wrap this screen in <RequireCatalog>.');
  return catalog;
}
