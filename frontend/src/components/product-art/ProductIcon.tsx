import type { MenuItem } from '../../data/menu';
import { FOAM_COLOR, scatter, seedFromId } from './artUtils';
import { SvgMaterials } from './SvgMaterials';
import { useSvgIds } from './useSvgIds';

export function ProductIcon({ item, size = 64 }: { item: MenuItem; size?: number }) {
  const ids = useSvgIds();
  const isPastry = item.group === 'bakery';

  return (
    <svg className="cupface" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <SvgMaterials ids={ids} tone={item.tone} />
      <circle cx="32" cy="33" r="30" fill="#000" opacity="0.18" />
      <circle cx="32" cy="32" r="30" fill={ids.url('saucer')} />
      {isPastry ? <PastryFromAbove item={item} surface={ids.url('surface')} /> : <DrinkFromAbove item={item} ceramic={ids.url('ceramic')} surface={ids.url('surface')} />}
    </svg>
  );
}

function PastryFromAbove({ item, surface }: { item: MenuItem; surface: string }) {
  return (
    <>
      <circle cx="32" cy="32" r="18" fill={item.tone} />
      <circle cx="32" cy="32" r="18" fill={surface} />
      {scatter(24, seedFromId(item.id)).map(([angleShare, distanceShare, size], i) => {
        const angle = angleShare * Math.PI * 2;
        const distance = Math.sqrt(distanceShare) * 16;
        return (
          <circle key={i} cx={32 + Math.cos(angle) * distance} cy={32 + Math.sin(angle) * distance} r={0.4 + size * 0.6} fill="#fff4dc" opacity="0.7" />
        );
      })}
    </>
  );
}

function DrinkFromAbove({ item, ceramic, surface }: { item: MenuItem; ceramic: string; surface: string }) {
  const inGlass = item.icedOnly || item.id === 'spanish-latte';
  return (
    <>
      <circle cx="32" cy="32" r="22" fill={inGlass ? '#ffffff' : ceramic} opacity={inGlass ? 0.45 : 1} />
      <circle cx="32" cy="32" r="18.5" fill={item.tone} />
      {item.hasMilk && !inGlass && <ellipse cx="31" cy="32" rx="9" ry="7.5" fill={FOAM_COLOR} opacity="0.95" />}
      {inGlass && (
        <>
          <rect x="22" y="23" width="9" height="9" rx="2" fill="#fff" opacity="0.5" />
          <rect x="33" y="31" width="8" height="8" rx="2" fill="#fff" opacity="0.4" transform="rotate(14 37 35)" />
        </>
      )}
      <circle cx="32" cy="32" r="18.5" fill={surface} />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.9" />
    </>
  );
}
