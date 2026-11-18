import type { MenuItem } from '../../../data/menu';
import { ContactShadow } from '../SvgEffects';
import type { SvgIds } from '../useSvgIds';

const SERVER_OUTLINE =
  'M74 116 L126 116 C150 132 160 160 156 190 C154 206 146 214 132 214 L68 214 C54 214 46 206 44 190 C40 160 50 132 74 116 Z';
const DRIPPER_RIBS = [70, 86, 100, 114, 130];

export function PourOver({ ids, item }: { ids: SvgIds; item: MenuItem }) {
  return (
    <g>
      <ContactShadow ids={ids} y={220} width={62} />
      <defs>
        <clipPath id={ids.id('server')}>
          <path d={SERVER_OUTLINE} />
        </clipPath>
        <linearGradient id={ids.id('amber')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a3d18" />
          <stop offset="1" stopColor={item.tone} />
        </linearGradient>
      </defs>

      <g clipPath={ids.url('server')}>
        <rect x="0" y="150" width="200" height="70" fill={ids.url('amber')} />
        <ellipse cx="100" cy="150" rx="56" ry="6" fill="#b5532a" />
        <rect x="0" y="0" width="200" height="240" fill={ids.url('depth')} />
      </g>
      <path d={SERVER_OUTLINE} fill={ids.url('glass')} />
      <path d="M56 156 C52 176 56 196 64 204" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.75" />

      <ellipse cx="100" cy="112" rx="36" ry="7" fill={ids.url('ceramic')} />
      <path d="M46 40 L154 40 L126 106 L74 106 Z" fill={ids.url('ceramic')} />
      {DRIPPER_RIBS.map((x) => (
        <path key={x} d={`M${x} 46 L${100 + (x - 100) * 0.55} 102`} stroke="#000" strokeOpacity="0.06" strokeWidth="2" />
      ))}
      <ellipse cx="100" cy="40" rx="54" ry="10" fill="#e6ded3" />
      <ellipse cx="100" cy="42" rx="44" ry="7" fill="#3b1f12" />
      <ellipse cx="96" cy="41" rx="20" ry="3" fill="#6b3a20" />
      <ellipse cx="100" cy="40" rx="54" ry="10" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M58 50 L78 100" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />

      <path d="M100 112 L100 146" stroke="#6e2412" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    </g>
  );
}
