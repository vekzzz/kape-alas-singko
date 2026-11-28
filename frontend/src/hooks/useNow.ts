import { useEffect, useState } from 'react';

const REFRESH_MS = 20_000;

/** The current time in milliseconds, refreshed every 20 seconds so "open now" and pickup times stay honest. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return now;
}
