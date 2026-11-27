type StageColors = { background: string; ink: string };

export const STAGE_COLORS: Record<string, StageColors> = {
  'alas-singko': { background: '#ff99d3', ink: '#3d0012' },
  americano: { background: '#1f0a0d', ink: '#ffb9df' },
  'flat-white': { background: '#e9b792', ink: '#33110a' },
  latte: { background: '#dca845', ink: '#2b1400' },
  'spanish-latte': { background: '#f6cfa6', ink: '#3a1608' },
  'tablea-mocha': { background: '#5a2418', ink: '#ffd9b8' },
  'benguet-pour-over': { background: '#802e21', ink: '#fff1e3' },
  'sagada-pour-over': { background: '#641c44', ink: '#ffc9e6' },
  'barako-press': { background: '#1d1210', ink: '#f3cc7c' },
  'batch-brew': { background: '#664220', ink: '#fff3df' },
  'cold-brew': { background: '#113a4a', ink: '#c6ecff' },
  'calamansi-tonic': { background: '#f2b632', ink: '#2b1400' },
  'iced-tablea': { background: '#693324', ink: '#ffe2cb' },
  'coconut-cold-brew': { background: '#bfe3d0', ink: '#0f3326' },
  pandesal: { background: '#f0c878', ink: '#3d1a00' },
  ensaymada: { background: '#ffd66b', ink: '#3d1a00' },
  'banana-loaf': { background: '#6e3f1f', ink: '#fff3e0' },
  'ube-pandesal': { background: '#633557', ink: '#ffe3f5' },
};

const FALLBACK: StageColors = { background: '#113a4a', ink: '#c6ecff' };

export function stageColorsFor(itemId: string): StageColors {
  return STAGE_COLORS[itemId] ?? FALLBACK;
}
