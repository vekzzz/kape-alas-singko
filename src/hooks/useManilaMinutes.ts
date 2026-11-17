import { useEffect, useState } from 'react';
import { manilaMinutes } from '../lib/time';

const REFRESH_MS = 20_000;

export function useManilaMinutes(): number {
  const [minutes, setMinutes] = useState(() => manilaMinutes(new Date()));

  useEffect(() => {
    const timer = setInterval(() => setMinutes(manilaMinutes(new Date())), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return minutes;
}
