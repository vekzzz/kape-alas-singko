import type { MenuItem } from '../../../data/menu';
import type { DrinkOptions } from '../../../lib/pricing';
import { CoffeeSurface } from '../CoffeeSurface';
import { ContactShadow } from '../SvgEffects';
import type { SvgIds } from '../useSvgIds';

type CeramicCupProps = {
  ids: SvgIds;
  item: MenuItem;
  options: DrinkOptions;
  rimY: number;
  radius: number;
  depth: number;
};

export function CeramicCup({ ids, item, options, rimY, radius, depth }: CeramicCupProps) {
  const rimHeight = radius * 0.25;
  const bottom = rimY + depth;
  const left = 100 - radius;
  const right = 100 + radius;
  const saucerRadius = radius * 1.55;

  const body = [
    `M${left} ${rimY}`,
    `C${left} ${rimY + depth * 0.72} ${100 - radius * 0.55} ${bottom} 100 ${bottom}`,
    `C${100 + radius * 0.55} ${bottom} ${right} ${rimY + depth * 0.72} ${right} ${rimY}`,
    'Z',
  ].join(' ');

  const handle = [
    `M${right - 4} ${rimY + depth * 0.18}`,
    `C${right + radius * 0.5} ${rimY + depth * 0.05} ${right + radius * 0.48} ${rimY + depth * 0.72} ${right - radius * 0.18} ${rimY + depth * 0.7}`,
  ].join(' ');

  return (
    <g>
      <ContactShadow ids={ids} y={bottom + 10} width={saucerRadius} />

      <ellipse cx="100" cy={bottom + 6} rx={saucerRadius} ry={saucerRadius * 0.24} fill="#b8ad9f" />
      <ellipse cx="100" cy={bottom + 2} rx={saucerRadius} ry={saucerRadius * 0.24} fill={ids.url('saucer')} />
      <ellipse cx="100" cy={bottom + 2} rx={saucerRadius * 0.52} ry={saucerRadius * 0.12} fill="#e2dbd1" />

      <ellipse cx="100" cy={bottom - 1} rx={radius * 0.42} ry={radius * 0.09} fill="#cfc5b8" />
      <path d={handle} fill="none" stroke={ids.url('ceramic')} strokeWidth={radius * 0.17} strokeLinecap="round" />
      <path d={handle} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth={radius * 0.05} transform="translate(2 2)" />
      <path d={body} fill={ids.url('ceramic')} />

      <ellipse cx="100" cy={rimY} rx={radius} ry={rimHeight} fill={ids.url('inside')} />
      <CoffeeSurface ids={ids} item={item} options={options} y={rimY + rimHeight * 0.32} width={radius * 0.9} height={rimHeight * 0.78} />
      <ellipse cx="100" cy={rimY} rx={radius} ry={rimHeight} fill="none" stroke="#ffffff" strokeWidth="2" />

      <path
        d={`M${left + radius * 0.18} ${rimY + depth * 0.25} Q${left + radius * 0.2} ${rimY + depth * 0.6} ${left + radius * 0.45} ${rimY + depth * 0.85}`}
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />
    </g>
  );
}
