import { motion } from 'motion/react';
import type { MenuItem } from '../../../data/menu';
import type { DrinkOptions } from '../../../lib/pricing';
import { FOAM_COLOR, LAYER_SPRING, MILK_COLORS, mixColors, scatter, seedFromId } from '../artUtils';
import { ContactShadow } from '../SvgEffects';
import type { SvgIds } from '../useSvgIds';

const GLASS_TOP = 44;
const GLASS_FLOOR = 202;
const GLASS_DEPTH = GLASS_FLOOR - GLASS_TOP;
const FILL_LEVEL = 0.86;

const OUTER_WALL = 'M36 36 L52 212 A48 8 0 0 0 148 212 L164 36 Z';
const INNER_WALL = `M40 ${GLASS_TOP} L54 ${GLASS_FLOOR} A46 7 0 0 0 146 ${GLASS_FLOOR} L160 ${GLASS_TOP} Z`;

type DrinkGlassProps = {
  ids: SvgIds;
  item: MenuItem;
  options: DrinkOptions;
  iced: boolean;
};

/** A clear tumbler. The coffee, milk and foam layers animate when the options change. */
export function DrinkGlass({ ids, item, options, iced }: DrinkGlassProps) {
  const layers = measureLayers(item, options, iced);
  const { surfaceY, liquidHeight } = layers;
  const isTonic = item.id === 'calamansi-tonic';
  const isCoconut = item.id === 'coconut-cold-brew';

  return (
    <g>
      <ContactShadow ids={ids} y={218} width={60} />
      <defs>
        <clipPath id={ids.id('glass-clip')}>
          <path d={INNER_WALL} />
        </clipPath>
      </defs>

      <path d={OUTER_WALL} fill="#fff" opacity="0.1" />

      <g clipPath={ids.url('glass-clip')}>
        {isCoconut ? (
          <>
            <rect x="0" y={surfaceY} width="200" height={liquidHeight * 0.5} fill={item.tone} />
            <rect x="0" y={surfaceY + liquidHeight * 0.45} width="200" height={liquidHeight * 0.6} fill="#efe4c8" opacity="0.75" />
          </>
        ) : (
          <LiquidLayers item={item} layers={layers} isTonic={isTonic} />
        )}

        <motion.ellipse
          cx="100"
          fill={layers.topColor}
          initial={false}
          animate={{ cy: surfaceY, rx: innerHalfWidth(surfaceY), ry: 7 }}
          transition={LAYER_SPRING}
        />
        <motion.ellipse
          cx="100"
          fill="#fff"
          opacity="0.18"
          initial={false}
          animate={{ cy: surfaceY - 1, rx: innerHalfWidth(surfaceY) * 0.7, ry: 3 }}
          transition={LAYER_SPRING}
        />

        {isTonic && <TonicBubbles surfaceY={surfaceY} liquidHeight={liquidHeight} />}
        {item.id === 'iced-tablea' && <ChocolateShavings surfaceY={surfaceY} />}
        <IceCubes visible={iced} surfaceY={surfaceY} singleBlock={item.id === 'cold-brew'} />

        <rect x="0" y="0" width="200" height="240" fill={ids.url('depth')} />
      </g>

      <ellipse cx="100" cy="210" rx="48" ry="8" fill="#fff" opacity="0.25" />
      <path d="M52 204 L54 212 A46 8 0 0 0 146 212 L148 204 A48 8 0 0 1 52 204 Z" fill="#fff" opacity="0.35" />
      <path d={OUTER_WALL} fill={ids.url('glass')} />
      <path d="M48 52 L60 196" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.75" />
      <path d="M150 60 L142 170" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="100" cy="36" rx="64" ry="9" fill="none" stroke="#fff" strokeWidth="2.2" opacity="0.85" />

      <Condensation visible={iced} seed={seedFromId(item.id) + 3} />
      {isTonic && <CalamansiSlice />}
      {isCoconut && <path d="M150 34 l22 -30" stroke="#f2ead6" strokeWidth="6" strokeLinecap="round" />}
    </g>
  );
}

type Layers = ReturnType<typeof measureLayers>;

function measureLayers(item: MenuItem, options: DrinkOptions, iced: boolean) {
  const withMilk = Boolean(item.hasMilk) && options.milk !== 'none';
  let coffeeShare = withMilk ? (item.coffeeRatio ?? 1) : 1;
  if (withMilk && item.hasExtraShot && options.extraShot) coffeeShare = Math.min(0.9, coffeeShare + 0.16);
  const foamShare = withMilk && !iced ? 0.1 : 0;

  const liquidHeight = GLASS_DEPTH * FILL_LEVEL;
  const coffeeHeight = liquidHeight * (1 - foamShare) * coffeeShare;
  const milkHeight = liquidHeight * (1 - foamShare) - coffeeHeight;
  const foamHeight = liquidHeight * foamShare;
  const surfaceY = GLASS_FLOOR - liquidHeight;

  // Hot milk is stirred into the coffee; over ice it settles in layers. Tablea is always mixed.
  const plainMilk = MILK_COLORS[options.milk === 'none' ? 'whole' : options.milk];
  const isTablea = item.id === 'iced-tablea';
  const milkColor = isTablea ? mixColors(plainMilk, item.tone, 0.7) : iced ? plainMilk : mixColors(plainMilk, item.tone, 0.45);

  let topColor = item.tone;
  if (foamHeight > 0) topColor = FOAM_COLOR;
  else if (milkHeight > 1) topColor = isTablea ? mixColors(MILK_COLORS.whole, item.tone, 0.7) : MILK_COLORS[options.milk];

  return { withMilk, liquidHeight, coffeeHeight, milkHeight, foamHeight, surfaceY, milkColor, topColor };
}

/** The glass tapers, so the liquid surface is wider near the rim. */
function innerHalfWidth(y: number): number {
  return 46 + ((GLASS_FLOOR - y) / GLASS_DEPTH) * 14;
}

function LiquidLayers({ item, layers, isTonic }: { item: MenuItem; layers: Layers; isTonic: boolean }) {
  const { coffeeHeight, milkHeight, foamHeight, surfaceY, withMilk, milkColor } = layers;
  return (
    <>
      <motion.rect
        x="0"
        width="200"
        fill={isTonic ? '#e0a050' : item.tone}
        initial={false}
        animate={{ y: GLASS_FLOOR - coffeeHeight, height: coffeeHeight + 10 }}
        transition={LAYER_SPRING}
      />
      {isTonic && <rect x="0" y={surfaceY} width="200" height="22" fill="#3a140a" opacity="0.85" />}
      <motion.rect
        x="0"
        width="200"
        fill={withMilk ? milkColor : 'transparent'}
        initial={false}
        animate={{ y: GLASS_FLOOR - coffeeHeight - milkHeight, height: milkHeight }}
        transition={LAYER_SPRING}
      />
      <motion.rect x="0" width="200" fill={FOAM_COLOR} initial={false} animate={{ y: surfaceY, height: foamHeight }} transition={LAYER_SPRING} />
    </>
  );
}

const SINGLE_BLOCK = [{ x: 100, y: 0, size: 30, angle: 8 }];
const THREE_CUBES = [
  { x: 80, y: 6, size: 22, angle: 14 },
  { x: 118, y: 24, size: 20, angle: -12 },
  { x: 92, y: 46, size: 19, angle: 22 },
];

function IceCubes({ visible, surfaceY, singleBlock }: { visible: boolean; surfaceY: number; singleBlock: boolean }) {
  const cubes = singleBlock ? SINGLE_BLOCK : THREE_CUBES;
  return (
    <motion.g className="ice" initial={false} animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -30 }} transition={LAYER_SPRING}>
      {cubes.map(({ x, y, size, angle }) => (
        // The outer <g> is moved by the CSS float animation, the inner one holds the cube's own position.
        <g key={`${x}-${y}`}>
          <g transform={`translate(${x} ${surfaceY + 6 + y}) rotate(${angle})`}>
            <rect x={-size} y={-size * 0.8} width={size * 2} height={size * 1.6} rx={size * 0.3} fill="#fff" opacity="0.32" />
            <rect
              x={-size}
              y={-size * 0.8}
              width={size * 2}
              height={size * 1.6}
              rx={size * 0.3}
              fill="none"
              stroke="#fff"
              strokeOpacity="0.75"
              strokeWidth="1.5"
            />
            <path d={`M${-size * 0.6} ${-size * 0.5} h${size * 0.9}`} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </g>
        </g>
      ))}
    </motion.g>
  );
}

function Condensation({ visible, seed }: { visible: boolean; seed: number }) {
  return (
    <motion.g initial={false} animate={{ opacity: visible ? 1 : 0 }} transition={LAYER_SPRING}>
      {scatter(30, seed).map(([x, y, size], i) => (
        <circle key={i} cx={56 + x * 88} cy={70 + y * 130} r={0.8 + size * 1.8} fill="#fff" opacity={0.35 + size * 0.4} />
      ))}
    </motion.g>
  );
}

function TonicBubbles({ surfaceY, liquidHeight }: { surfaceY: number; liquidHeight: number }) {
  return scatter(26, 5).map(([x, y, size], i) => (
    <circle key={i} cx={56 + x * 88} cy={surfaceY + 26 + y * (liquidHeight - 30)} r={0.8 + size * 1.6} fill="none" stroke="#fff" strokeOpacity="0.7" />
  ));
}

function ChocolateShavings({ surfaceY }: { surfaceY: number }) {
  return scatter(22, 9).map(([x, y, size], i) => (
    <rect key={i} x={70 + x * 60} y={surfaceY - 3 + y * 5} width={2 + size * 4} height="1.6" rx="0.8" fill="#2b120a" />
  ));
}

const CALAMANSI_SEGMENTS = [0, 45, 90, 135, 180, 225, 270, 315];

function CalamansiSlice() {
  return (
    <g transform="translate(152 40) rotate(-20)">
      <circle r="17" fill="#3f7a1f" />
      <circle r="14" fill="#d8e27a" />
      {CALAMANSI_SEGMENTS.map((angle) => (
        <path key={angle} d="M0 0 L0 -12" stroke="#f3f6c8" strokeWidth="1.4" transform={`rotate(${angle})`} />
      ))}
      <circle r="2" fill="#f3f6c8" />
    </g>
  );
}
