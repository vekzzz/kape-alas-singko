import type { SvgIds } from './useSvgIds';

export function ContactShadow({ ids, y, width }: { ids: SvgIds; y: number; width: number }) {
  return <ellipse cx="100" cy={y} rx={width} ry={width * 0.14} fill="#000" opacity="0.32" filter={ids.url('shadow')} />;
}

export function Steam({ ids, y }: { ids: SvgIds; y: number }) {
  return (
    <g className="steam" filter={ids.url('steam')} fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round">
      <path d={`M86 ${y} C74 ${y - 22} 98 ${y - 38} 86 ${y - 62}`} />
      <path d={`M104 ${y - 4} C116 ${y - 26} 92 ${y - 44} 106 ${y - 70}`} />
      <path d={`M120 ${y} C112 ${y - 18} 130 ${y - 34} 120 ${y - 54}`} />
    </g>
  );
}
