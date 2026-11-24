const SAMPLE_FRAMES = 60;
const SLOW_FRAME_MS = 22;

function weakHardware(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
}

function enable() {
  document.documentElement.classList.add('lite');
}

export function initLiteMode() {
  if (weakHardware()) enable();

  let last = 0;
  let frames = 0;
  let total = 0;
  const sample = (time: number) => {
    if (last) {
      total += time - last;
      frames++;
    }
    last = time;
    if (frames < SAMPLE_FRAMES) return requestAnimationFrame(sample);
    if (total / frames > SLOW_FRAME_MS) enable();
  };
  requestAnimationFrame(() => requestAnimationFrame(sample));
}
