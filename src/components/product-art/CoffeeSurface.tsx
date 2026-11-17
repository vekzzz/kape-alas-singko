import type { MenuItem } from '../../data/menu';
import type { DrinkOptions } from '../../lib/pricing';
import { FOAM_COLOR, scatter, seedFromId } from './artUtils';
import type { SvgIds } from './useSvgIds';

type CoffeeSurfaceProps = {
  ids: SvgIds;
  item: MenuItem;
  options: DrinkOptions;
  y: number;
  width: number;
  height: number;
};

/** The top of a hot drink seen at an angle: crema, latte art, cocoa or plain filter coffee. */
export function CoffeeSurface({ ids, item, options, y, width, height }: CoffeeSurfaceProps) {
  const withMilk = Boolean(item.hasMilk) && options.milk !== 'none';
  const isEspresso = Boolean(item.hasExtraShot) && !withMilk;
  const foamColor = options.milk === 'oat' ? '#efd9b8' : FOAM_COLOR;
  const baseFill = isEspresso ? ids.url('crema') : item.tone;

  return (
    <g>
      <ellipse cx="100" cy={y} rx={width} ry={height} fill={baseFill} />
      {withMilk && (
        <g transform={`translate(100 ${y}) scale(${width / 50} ${height / 14})`} fill={foamColor} filter={ids.url('soft')}>
          <LatteArt itemId={item.id} />
        </g>
      )}
      {isEspresso && <CremaFlecks seed={seedFromId(item.id)} y={y} width={width} height={height} />}
      <ellipse cx="100" cy={y} rx={width} ry={height} fill={ids.url('surface')} />
    </g>
  );
}

/** Drawn in a 100 × 28 box centred on 0,0, then scaled onto the cup. */
function LatteArt({ itemId }: { itemId: string }) {
  if (itemId === 'flat-white') {
    return (
      <>
        <ellipse cx="-14" cy="1" rx="14" ry="8" />
        <ellipse cx="2" cy="0" rx="11" ry="6.5" opacity="0.96" />
        <ellipse cx="15" cy="-0.5" rx="7" ry="4.5" opacity="0.92" />
        <rect x="-26" y="-0.6" width="50" height="1.2" />
      </>
    );
  }

  if (itemId === 'tablea-mocha') {
    return (
      <>
        <ellipse cx="0" cy="0" rx="30" ry="9" opacity="0.5" />
        {scatter(36, 11).map(([x, y, size], i) => (
          <circle key={i} cx={(x - 0.5) * 70} cy={(y - 0.5) * 18} r={0.6 + size * 0.9} fill="#3d1a10" opacity="0.7" />
        ))}
      </>
    );
  }

  const rosettaLeaves = [0, 1, 2, 3, 4, 5];
  return (
    <>
      {rosettaLeaves.map((i) => (
        <ellipse key={i} cx={-22 + i * 7.5} cy="0" rx={10 - i * 1.1} ry={9 - i * 1.2} opacity={1 - i * 0.04} />
      ))}
      <ellipse cx="26" cy="0" rx="4" ry="3.6" />
      <rect x="-30" y="-0.5" width="60" height="1" />
    </>
  );
}

function CremaFlecks({ seed, y, width, height }: { seed: number; y: number; width: number; height: number }) {
  return (
    <g opacity="0.55">
      {scatter(18, seed).map(([px, py, size], i) => (
        <ellipse
          key={i}
          cx={100 + (px - 0.5) * width * 1.5}
          cy={y + (py - 0.5) * height * 1.3}
          rx={1 + size * 2.4}
          ry={0.6 + size}
          fill="#3a1608"
        />
      ))}
    </g>
  );
}
