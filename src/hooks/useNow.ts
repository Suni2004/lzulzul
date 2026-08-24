import { useEffect, useState } from 'react';

/**
 * A clock that ticks on an interval, so "MOST" badges and countdowns stay
 * honest while the screen sits open. Defaults to half a minute, which is
 * accurate enough for minute-resolution labels without waking the JS thread
 * more than necessary.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
