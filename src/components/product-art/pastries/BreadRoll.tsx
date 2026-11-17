import { useId } from 'react';
import { scatter } from '../artUtils';

type BreadRollProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  crustColor: string;
  edgeColor: string;
  crumbColor?: string;
  seed: number;
};

/** A round roll dusted with breadcrumbs. `width` and `height` are radii. */
export function BreadRoll({ x, y, width, height, crustColor, edgeColor, crumbColor = '#f0d6a4', seed }: BreadRollProps) {
  const gradientId = `roll${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <g>
      <defs>
        <radialGradient id={gradientId} cx="0.38" cy="0.3" r="0.75">
          <stop offset="0" stopColor={crustColor} />
          <stop offset="0.7" stopColor={edgeColor} />
          <stop offset="1" stopColor="#2a1206" />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={width} ry={height} fill={`url(#${gradientId})`} />
      {scatter(70, seed).map(([angleShare, distanceShare, size], i) => {
        const angle = angleShare * Math.PI * 2;
        const distance = Math.sqrt(distanceShare) * 0.92;
        return (
          <circle
            key={i}
            cx={x + Math.cos(angle) * width * distance}
            cy={y + Math.sin(angle) * height * distance}
            r={0.6 + size * 1.2}
            fill={crumbColor}
            opacity={0.35 + size * 0.5}
          />
        );
      })}
      <ellipse cx={x - width * 0.3} cy={y - height * 0.45} rx={width * 0.35} ry={height * 0.2} fill="#fff" opacity="0.18" />
    </g>
  );
}
