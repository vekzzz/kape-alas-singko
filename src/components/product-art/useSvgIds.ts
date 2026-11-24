import { useId } from 'react';

export function useSvgIds() {
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (name: string) => `${prefix}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  return { id, url };
}

export type SvgIds = ReturnType<typeof useSvgIds>;
