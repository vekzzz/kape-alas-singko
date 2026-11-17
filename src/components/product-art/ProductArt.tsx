import { motion } from 'motion/react';
import type { MenuItem } from '../../data/menu';
import type { DrinkOptions } from '../../lib/pricing';
import { LAYER_SPRING, pickVessel, type Vessel } from './artUtils';
import { Pastry } from './pastries/Pastry';
import { Steam } from './SvgEffects';
import { SvgMaterials } from './SvgMaterials';
import { useSvgIds } from './useSvgIds';
import { CeramicCup } from './vessels/CeramicCup';
import { DrinkGlass } from './vessels/DrinkGlass';
import { FrenchPress } from './vessels/FrenchPress';
import { Mug } from './vessels/Mug';
import { PourOver } from './vessels/PourOver';

const STEAM_START_Y: Partial<Record<Vessel, number>> = {
  demitasse: 132,
  'small-cup': 120,
  cup: 100,
  mug: 80,
  press: 6,
  'pour-over': 26,
};

type ProductArtProps = {
  item: MenuItem;
  options: DrinkOptions;
  /** Show rising steam on hot drinks. */
  steaming?: boolean;
};

/** The product as served, seen from the side. */
export function ProductArt({ item, options, steaming = false }: ProductArtProps) {
  const ids = useSvgIds();
  const iced = options.temperature === 'iced' || Boolean(item.icedOnly);
  const vessel = pickVessel(item, iced);
  const steamY = STEAM_START_Y[vessel];
  const shrunk = item.hasSizes && options.size === 'regular';

  return (
    <motion.svg
      className="cup"
      viewBox="0 0 200 240"
      role="img"
      aria-label={accessibleLabel(item.name, vessel)}
      animate={{ scale: shrunk ? 0.88 : 1 }}
      transition={LAYER_SPRING}
      style={{ transformOrigin: '50% 100%', overflow: 'visible' }}
    >
      <SvgMaterials ids={ids} tone={item.tone} />
      {steaming && steamY !== undefined && <Steam ids={ids} y={steamY} />}

      {vessel === 'demitasse' && <CeramicCup ids={ids} item={item} options={options} rimY={148} radius={40} depth={54} />}
      {vessel === 'small-cup' && <CeramicCup ids={ids} item={item} options={options} rimY={132} radius={50} depth={66} />}
      {vessel === 'cup' && <CeramicCup ids={ids} item={item} options={options} rimY={112} radius={62} depth={84} />}
      {vessel === 'mug' && <Mug ids={ids} item={item} options={options} />}
      {vessel === 'glass' && <DrinkGlass ids={ids} item={item} options={options} iced={iced} />}
      {vessel === 'press' && <FrenchPress ids={ids} item={item} />}
      {vessel === 'pour-over' && <PourOver ids={ids} item={item} />}
      {vessel === 'pastry' && <Pastry ids={ids} item={item} />}
    </motion.svg>
  );
}

function accessibleLabel(name: string, vessel: Vessel): string {
  if (vessel === 'pastry') return name;
  if (vessel === 'glass') return `${name} in a glass`;
  return `${name}, served hot`;
}
