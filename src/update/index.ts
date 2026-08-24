/**
 * Kötelező frissítés ellenőrzése.
 *
 * A build minden alkalommal közzétesz egy `version.json`-t a letöltési link
 * mellé. Az app indításkor és előtérbe kerüléskor összeveti a sajátjával, és
 * ha újabb van, blokkoló képernyőt mutat.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** A közzétett verzióleíró. Ugyanabban a release-ben van, mint az APK. */
const VERSION_URL =
  'https://github.com/Suni2004/lzulzul/releases/download/apk/version.json';

/**
 * A futó build sorszáma.
 *
 * Szándékosan az app configból olvassuk, nem a bundle-be inlinelt
 * `process.env`-ből: a Metro transform-cache egy korábbi build env-értékét
 * be tudja égetni, az app config viszont a natív csomagból jön, és mindig
 * ahhoz a buildhez tartozik, amelyik éppen fut.
 *
 * A 0 azt jelenti, hogy helyi buildben futunk — ilyenkor nincs ellenőrzés,
 * különben a `npm start` folyamatosan frissítést követelne magától.
 */
export const CURRENT_BUILD =
  Number(Constants.expoConfig?.extra?.buildNumber ?? 0) || 0;

export type UpdateInfo = {
  build: number;
  version: string;
  apkUrl: string;
  notes: string;
};

/** Csak akkor van értelme ellenőrizni, ha tudjuk, melyik buildben futunk. */
export function updateChecksEnabled(): boolean {
  return CURRENT_BUILD > 0 && Platform.OS === 'android';
}

/**
 * Ellenőrzi és beolvassa a verzióleírót. Exportált, mert ez dönt arról,
 * hogy blokkoljuk-e a felhasználót — ezt tesztelni kell.
 */
export function parseVersionManifest(raw: unknown): UpdateInfo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Record<string, unknown>;

  const build = Number(data.build);
  const apkUrl = typeof data.apkUrl === 'string' ? data.apkUrl : '';

  // Hiányos leíróból nem kényszerítünk frissítést.
  if (!Number.isFinite(build) || build <= 0 || !apkUrl.startsWith('https://')) {
    return null;
  }

  return {
    build,
    version: typeof data.version === 'string' ? data.version : `1.0.${build}`,
    apkUrl,
    notes: typeof data.notes === 'string' ? data.notes : '',
  };
}

/**
 * Lekéri a legfrissebb közzétett verziót.
 *
 * Bármilyen hiba esetén `null` — hálózati hiba, lejárt kérés vagy hibás
 * leíró miatt soha nem zárjuk ki a felhasználót a saját naptárából.
 */
export async function fetchLatest(): Promise<UpdateInfo | null> {
  if (!updateChecksEnabled()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // A release-fájlokat CDN szolgálja ki, ezért kell a gyorsítótár-törő.
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return null;
    return parseVersionManifest(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Akkor kötelező a frissítés, ha a közzétett build magasabb a futónál.
 *
 * A `currentBuild` paraméterezhető, hogy a szabály a modul betöltési idejű
 * konstansától függetlenül tesztelhető legyen.
 */
export function isOutdated(
  latest: UpdateInfo | null,
  currentBuild: number = CURRENT_BUILD,
): boolean {
  // Ismeretlen saját build (helyi fejlesztés) esetén soha nem blokkolunk.
  if (currentBuild <= 0) return false;
  return latest != null && latest.build > currentBuild;
}
