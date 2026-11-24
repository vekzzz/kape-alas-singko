type StageColors = { background: string; ink: string };

export const STAGE_COLORS: Record<string, StageColors> = {
  'alas-singko': { background: '#ff99d3', ink: '#3d0012' },
  americano: { background: '#1f0a0d', ink: '#ffb9df' },
  'flat-white': { background: '#e9b792', ink: '#33110a' },
  latte: { background: '#dba53f', ink: '#2b1400' },
  'spanish-latte': { background: '#f6cfa6', ink: '#3a1608' },
  'tablea-mocha': { background: '#5a2418', ink: '#ffd9b8' },
  'benguet-pour-over': { background: '#b8432f', ink: '#fff1e3' },
  'sagada-pour-over': { background: '#6e1f4a', ink: '#ffc9e6' },
  'barako-press': { background: '#1d1210', ink: '#f3cc7c' },
  'batch-brew': { background: '#8a5a2b', ink: '#fff3df' },
  'cold-brew': { background: '#113a4a', ink: '#c6ecff' },
  'calamansi-tonic': { background: '#f2b632', ink: '#2b1400' },
  'iced-tablea': { background: '#7a3b2a', ink: '#ffe2cb' },
  'coconut-cold-brew': { background: '#bfe3d0', ink: '#0f3326' },
  pandesal: { background: '#f0c878', ink: '#3d1a00' },
  ensaymada: { background: '#ffd66b', ink: '#3d1a00' },
  'banana-loaf': { background: '#a8602f', ink: '#fff3e0' },
  'ube-pandesal': { background: '#8a4a7a', ink: '#ffe3f5' },
};

const FALLBACK: StageColors = { background: '#113a4a', ink: '#c6ecff' };

export function stageColorsFor(itemId: string): StageColors {
  return STAGE_COLORS[itemId] ?? FALLBACK;
}
