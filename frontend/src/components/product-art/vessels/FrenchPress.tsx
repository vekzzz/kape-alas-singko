import type { MenuItem } from '../../../data/menu';
import { ContactShadow } from '../SvgEffects';
import type { SvgIds } from '../useSvgIds';

export function FrenchPress({ ids, item }: { ids: SvgIds; item: MenuItem }) {
  const chrome = ids.url('chrome');

  return (
    <g>
      <ContactShadow ids={ids} y={220} width={58} />
      <path d="M136 82 C176 84 176 182 136 184" fill="none" stroke="#1c1916" strokeWidth="12" strokeLinecap="round" />

      <rect x="62" y="80" width="74" height="128" fill={item.tone} />
      <rect x="62" y="80" width="74" height="10" fill="#4a2312" />
      <rect x="62" y="80" width="74" height="128" fill={ids.url('depth')} />

      <ellipse cx="99" cy="196" rx="37" ry="5" fill={chrome} />
      <rect x="97" y="22" width="4" height="174" fill={chrome} />

      <rect x="60" y="62" width="78" height="148" rx="4" fill={ids.url('glass')} />
      <rect x="66" y="76" width="6" height="120" rx="3" fill="#fff" opacity="0.7" />

      <rect x="56" y="58" width="86" height="10" rx="3" fill={chrome} />
      <rect x="56" y="204" width="86" height="10" rx="3" fill={chrome} />
      <rect x="58" y="66" width="5" height="140" fill={chrome} />
      <rect x="135" y="66" width="5" height="140" fill={chrome} />
      <path d="M58 58 Q99 30 140 58 Z" fill={chrome} />

      <circle cx="99" cy="18" r="9" fill="#1c1916" />
      <circle cx="96" cy="15" r="3" fill="#fff" opacity="0.35" />
      <rect x="60" y="214" width="10" height="5" rx="2" fill="#4a4a4a" />
      <rect x="128" y="214" width="10" height="5" rx="2" fill="#4a4a4a" />
    </g>
  );
}
