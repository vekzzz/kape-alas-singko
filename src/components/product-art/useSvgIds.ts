import { useId } from 'react';

/**
 * SVG gradients and filters are looked up by id across the whole page,
 * so every drawing needs its own ids.
 */
export function useSvgIds() {
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${prefix}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  return { id, url };
}

export type SvgIds = ReturnType<typeof useSvgIds>;
