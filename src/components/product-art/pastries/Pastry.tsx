import type { ReactNode } from 'react';
import type { MenuItem } from '../../../data/menu';
import { scatter, seedFromId } from '../artUtils';
import type { SvgIds } from '../useSvgIds';
import { BreadRoll } from './BreadRoll';
import { Plate } from './Plate';

type PastryProps = { ids: SvgIds; seed: number };

export function Pastry({ ids, item }: { ids: SvgIds; item: MenuItem }) {
  const seed = seedFromId(item.id);
  const Drawing = PASTRIES[item.id] ?? BananaLoaf;
  return (
    <g>
      <Plate ids={ids} />
      <Drawing ids={ids} seed={seed} />
    </g>
  );
}

function PanDeSal({ seed }: PastryProps) {
  return (
    <>
      <BreadRoll x={124} y={164} width={44} height={32} crustColor="#e3a45a" edgeColor="#a8622a" seed={seed} />
      <path d="M72 150 L118 170 L76 184 Z" fill="#f7f2e6" />
      <path d="M72 150 L118 170 L116 174 L74 156 Z" fill="#e2dccd" />
      <BreadRoll x={78} y={180} width={46} height={30} crustColor="#e8ab60" edgeColor="#b06a2e" seed={seed + 7} />
    </>
  );
}

function UbeCheesePandesal({ seed }: PastryProps) {
  const crumb = '#e7c3e0';
  return (
    <>
      <BreadRoll x={130} y={160} width={36} height={27} crustColor="#a35a95" edgeColor="#5e2655" crumbColor={crumb} seed={seed} />
      <BreadRoll x={70} y={162} width={36} height={27} crustColor="#9c5590" edgeColor="#57224f" crumbColor={crumb} seed={seed + 3} />
      <BreadRoll x={100} y={184} width={40} height={28} crustColor="#ad63a0" edgeColor="#62285a" crumbColor={crumb} seed={seed + 9} />
      <path
        d="M84 178 C86 172 114 170 118 178 C120 186 112 190 110 198 C109 206 104 208 102 200 C100 192 92 192 88 188 C84 186 83 182 84 178 Z"
        fill="#f4d878"
      />
      <path d="M90 178 C98 176 108 176 112 180" stroke="#fff6cf" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="103" cy="186" rx="5" ry="3" fill="#fff6cf" opacity="0.6" />
    </>
  );
}

const SPIRAL_RINGS = [0, 1, 2, 3];

function Ensaymada({ ids, seed }: PastryProps) {
  return (
    <>
      <defs>
        <radialGradient id={ids.id('brioche')} cx="0.4" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#f6cf78" />
          <stop offset="0.65" stopColor="#d9953e" />
          <stop offset="1" stopColor="#7a4114" />
        </radialGradient>
      </defs>
      <path d="M36 186 C36 136 66 120 100 120 C134 120 164 136 164 186 C164 196 36 196 36 186 Z" fill={ids.url('brioche')} />
      {SPIRAL_RINGS.map((i) => (
        <ellipse
          key={i}
          cx={100 - i * 3}
          cy={150 + i * 3}
          rx={56 - i * 13}
          ry={22 - i * 5}
          fill="none"
          stroke="#a5611f"
          strokeOpacity="0.55"
          strokeWidth="2.5"
        />
      ))}
      {scatter(110, seed).map(([angleShare, distanceShare, length], i) => {
        const angle = angleShare * Math.PI * 2;
        const distance = Math.sqrt(distanceShare);
        const x = 100 + Math.cos(angle) * 50 * distance;
        const y = 150 + Math.sin(angle) * 22 * distance;
        return (
          <path
            key={i}
            d={`M${x} ${y} q2 -2 ${3 + length * 4} 0`}
            stroke={i % 3 ? '#f4d35e' : '#fff6d8'}
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
      {scatter(60, seed + 5).map(([x, y, size], i) => (
        <circle key={i} cx={46 + x * 108} cy={134 + y * 50} r={0.6 + size * 0.8} fill="#fff" opacity="0.9" />
      ))}
      <ellipse cx="78" cy="132" rx="22" ry="6" fill="#fff" opacity="0.2" />
    </>
  );
}

const SLICE_FACE = 'M46 198 L48 120 Q96 92 146 116 L148 198 Z';

/** A thick slice standing on the plate with the cut face towards the viewer. */
function BananaLoaf({ ids, seed }: PastryProps) {
  return (
    <>
      <path d="M58 194 L62 112 Q104 86 150 104 L156 186 Z" fill="#4a230d" />
      <path d={SLICE_FACE} fill="#d6a064" />
      <path d={SLICE_FACE} fill={ids.url('depth')} opacity="0.4" />
      {scatter(90, seed).map(([x, y, size], i) => (
        <circle key={i} cx={52 + x * 92} cy={126 + y * 68} r={0.5 + size * 1.3} fill={size > 0.5 ? '#a8703c' : '#efc78e'} opacity="0.75" />
      ))}
      {scatter(9, seed + 2).map(([x, y, size], i) => (
        <path key={i} d={`M${58 + x * 76} ${136 + y * 50} l${4 + size * 4} -2 l2 ${4 + size * 3} l-${5 + size * 3} 2 Z`} fill="#7a4a24" />
      ))}
      <path d="M48 120 Q96 92 146 116" fill="none" stroke="#5a2a10" strokeWidth="7" strokeLinecap="round" />
      <path d="M46 198 L48 120 M146 116 L148 198" stroke="#6b3517" strokeWidth="3" />
      <path d="M66 112 Q92 100 116 102" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  );
}

const PASTRIES: Record<string, (props: PastryProps) => ReactNode> = {
  pandesal: PanDeSal,
  'ube-pandesal': UbeCheesePandesal,
  ensaymada: Ensaymada,
  'banana-loaf': BananaLoaf,
};
