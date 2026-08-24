import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { fetchLatest, isOutdated, updateChecksEnabled, type UpdateInfo } from './index';

/** Két ellenőrzés között eltelt minimális idő, hogy ne kérdezgessük feleslegesen. */
const MIN_INTERVAL_MS = 5 * 60_000;

type UpdateContextValue = {
  latest: UpdateInfo | null;
  /** Igaz, ha van a futónál újabb közzétett build. */
  outdated: boolean;
  check: () => Promise<void>;
};

const UpdateContext = createContext<UpdateContextValue>({
  latest: null,
  outdated: false,
  check: async () => {},
});

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [latest, setLatest] = useState<UpdateInfo | null>(null);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    if (!updateChecksEnabled()) return;

    const now = Date.now();
    if (now - lastCheck.current < MIN_INTERVAL_MS) return;
    lastCheck.current = now;

    const found = await fetchLatest();
    // Sikertelen lekérdezés nem törli a korábbi eredményt: ha egyszer már
    // tudjuk, hogy elavult, egy megszakadt hálózat ne engedje vissza.
    if (found) setLatest(found);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void check();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [check]);

  const value = useMemo(
    () => ({ latest, outdated: isOutdated(latest), check }),
    [latest, check],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useUpdate(): UpdateContextValue {
  return useContext(UpdateContext);
}
