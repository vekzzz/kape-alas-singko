const BASE_TITLE = typeof document === 'undefined' ? '' : document.title;

let audio: AudioContext | null = null;
/** New orders that arrived while the tab was in the background and have not been looked at yet. */
let unseen = 0;

/**
 * Browsers only let a page make sound after the user has tapped it. The "Start shift" button calls this,
 * so the chime can play later, when an order arrives and nobody is touching the screen.
 */
export async function unlockAudio(): Promise<boolean> {
  try {
    audio ??= new AudioContext();
    await audio.resume();
    return audio.state === 'running';
  } catch {
    return false;
  }
}

export function soundReady(): boolean {
  return audio !== null && audio.state === 'running';
}

/** Two rising notes, twice. Returns false if the browser has not been allowed to play sound yet. */
export function playNewOrderChime(): boolean {
  if (!audio || audio.state !== 'running') return false;
  const context = audio;
  try {
    [660, 880, 660, 880].forEach((frequency, index) => {
      const start = context.currentTime + index * 0.18 + (index >= 2 ? 0.25 : 0);
      const tone = context.createOscillator();
      const volume = context.createGain();
      tone.type = 'triangle';
      tone.frequency.value = frequency;
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      tone.connect(volume).connect(context.destination);
      tone.start(start);
      tone.stop(start + 0.32);
    });
    return true;
  } catch {
    return false;
  }
}

/** While the tab is in the background, puts the number of new orders in its title, until it is looked at again. */
export function flagTitle(newCount: number): void {
  if (!document.hidden || newCount <= 0) return;
  const alreadyFlagged = unseen > 0;
  unseen += newCount;
  document.title = `● ${unseen} new — ${BASE_TITLE}`;
  if (alreadyFlagged) return;

  const restore = () => {
    if (document.hidden) return;
    unseen = 0;
    document.title = BASE_TITLE;
    document.removeEventListener('visibilitychange', restore);
  };
  document.addEventListener('visibilitychange', restore);
}
