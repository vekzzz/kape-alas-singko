import { ContactShadow } from '../SvgEffects';
import type { SvgIds } from '../useSvgIds';

const PLATE_Y = 200;
const PLATE_RADIUS = 92;

export function Plate({ ids }: { ids: SvgIds }) {
  return (
    <g>
      <ContactShadow ids={ids} y={PLATE_Y + 8} width={PLATE_RADIUS} />
      <ellipse cx="100" cy={PLATE_Y + 4} rx={PLATE_RADIUS} ry={PLATE_RADIUS * 0.24} fill="#b8ad9f" />
      <ellipse cx="100" cy={PLATE_Y} rx={PLATE_RADIUS} ry={PLATE_RADIUS * 0.24} fill={ids.url('saucer')} />
      <ellipse cx="100" cy={PLATE_Y} rx={PLATE_RADIUS * 0.68} ry={PLATE_RADIUS * 0.16} fill="#e7e0d6" />
    </g>
  );
}
