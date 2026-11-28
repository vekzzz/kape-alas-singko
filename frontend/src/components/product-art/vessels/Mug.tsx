import type { MenuItem } from '../../../data/menu';
import type { DrinkOptions } from '../../../lib/pricing';
import { CoffeeSurface } from '../CoffeeSurface';
import { ContactShadow } from '../SvgEffects';
import type { SvgIds } from '../useSvgIds';

const RIM_Y = 92;
const BOTTOM_Y = 210;
const RADIUS = 52;
const RIM_HEIGHT = 12;

export function Mug({ ids, item, options }: { ids: SvgIds; item: MenuItem; options: DrinkOptions }) {
  const left = 100 - RADIUS;
  const right = 100 + RADIUS;

  return (
    <g>
      <ContactShadow ids={ids} y={BOTTOM_Y + 6} width={64} />
      <path d="M150 108 C188 104 190 176 150 172" fill="none" stroke={ids.url('ceramic')} strokeWidth="13" strokeLinecap="round" />
      <path d={`M${left} ${RIM_Y} V${BOTTOM_Y} A${RADIUS} ${RIM_HEIGHT} 0 0 0 ${right} ${BOTTOM_Y} V${RIM_Y} Z`} fill={ids.url('ceramic')} />

      <ellipse cx="100" cy={RIM_Y} rx={RADIUS} ry={RIM_HEIGHT} fill={ids.url('inside')} />
      <CoffeeSurface ids={ids} item={item} options={options} y={RIM_Y + 5} width={RADIUS * 0.9} height={RIM_HEIGHT * 0.75} />
      <ellipse cx="100" cy={RIM_Y} rx={RADIUS} ry={RIM_HEIGHT} fill="none" stroke="#fff" strokeWidth="2" />

      <rect x={left + 9} y={RIM_Y + 18} width="6" height="96" rx="3" fill="#fff" opacity="0.8" />
    </g>
  );
}
