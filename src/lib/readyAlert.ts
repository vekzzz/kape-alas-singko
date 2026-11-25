const ALERTED_KEY = 'alas-singko-ready-alerted-v2';
const REMEMBER_ALERTS = 10;
const BASE_TITLE = document.title;

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function alerted(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(ALERTED_KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter((number) => typeof number === 'string') : [];
  } catch {
    return [];
  }
}

export function wasAlerted(orderNumber: string): boolean {
  return alerted().includes(orderNumber);
}

export function markAlerted(orderNumber: string) {
  try {
    localStorage.setItem(ALERTED_KEY, JSON.stringify([orderNumber, ...alerted()].slice(0, REMEMBER_ALERTS)));
  } catch {}
}

export function alertOrderReady(orderNumber: string) {
  showSystemNotification(orderNumber);
  navigator.vibrate?.([220, 120, 220]);
  playChime();
  flagTitle(orderNumber);
}

function showSystemNotification(orderNumber: string) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification('Your order is ready!', {
      body: `${orderNumber} is waiting for you at the counter. Just tell us your name.`,
      tag: `order-${orderNumber}`,
    });
  } catch {}
}

function playChime() {
  try {
    const audio = new AudioContext();
    [880, 1320].forEach((frequency, i) => {
      const start = audio.currentTime + i * 0.22;
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      tone.frequency.value = frequency;
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      tone.connect(volume).connect(audio.destination);
      tone.start(start);
      tone.stop(start + 0.42);
    });
    setTimeout(() => audio.close(), 1000);
  } catch {}
}

function flagTitle(orderNumber: string) {
  if (!document.hidden) return;
  document.title = `● Ready: ${orderNumber}`;
  const restore = () => {
    if (document.hidden) return;
    document.title = BASE_TITLE;
    document.removeEventListener('visibilitychange', restore);
  };
  document.addEventListener('visibilitychange', restore);
}
