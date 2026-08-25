/**
 * Letölti és telepíti a frissítést, böngésző megkerülésével.
 *
 * A böngészőre bízott letöltés megbízhatatlan: több Android böngésző a
 * mentés lezárásánál elhasal az APK-kkal, és a felhasználó egy „sikertelen"
 * üzenettel marad magára. Ehelyett az app maga tölti le a fájlt, majd
 * átadja az Android csomagtelepítőjének.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

/** Az Android csomagtelepítő ezt a MIME típust ismeri fel. */
const APK_MIME = 'application/vnd.android.package-archive';

/** Intent.FLAG_GRANT_READ_URI_PERMISSION — enélkül a telepítő nem olvashatja a fájlt. */
const FLAG_GRANT_READ_URI_PERMISSION = 0x00000001;

export type DownloadProgress = {
  /** 0 és 1 közötti arány, vagy null, ha a szerver nem adta meg a méretet. */
  ratio: number | null;
  bytesWritten: number;
  bytesTotal: number;
};

export type InstallOutcome =
  /** A telepítő megnyílt; innen a felhasználó dönt. */
  | { status: 'installer-opened' }
  /** Nem sikerült; a hívó a böngészős tartalékra válthat. */
  | { status: 'failed'; reason: string };

/**
 * A letöltött fájl a gyorsítótárba kerül, buildenként külön néven — így egy
 * megszakadt letöltés maradéka nem keveredik össze a következő verzióval.
 */
function targetPath(build: number): string {
  return `${FileSystem.cacheDirectory}napirend-${build}.apk`;
}

/** A böngészős tartalék, ha a beépített telepítés nem járható. */
export async function openInBrowser(url: string): Promise<void> {
  await Linking.openURL(url);
}

export async function downloadAndInstall(
  url: string,
  build: number,
  onProgress: (progress: DownloadProgress) => void,
): Promise<InstallOutcome> {
  if (Platform.OS !== 'android') {
    return { status: 'failed', reason: 'Csak Androidon támogatott.' };
  }

  const path = targetPath(build);

  try {
    // Egy korábbi, félbeszakadt kísérlet maradéka sérült fájlt hagyhat hátra.
    await FileSystem.deleteAsync(path, { idempotent: true });

    const task = FileSystem.createDownloadResumable(url, path, {}, (p) => {
      const total = p.totalBytesExpectedToWrite;
      onProgress({
        ratio: total > 0 ? p.totalBytesWritten / total : null,
        bytesWritten: p.totalBytesWritten,
        bytesTotal: total,
      });
    });

    const result = await task.downloadAsync();
    if (!result || result.status !== 200) {
      return {
        status: 'failed',
        reason: `A letöltés nem sikerült (${result?.status ?? 'nincs válasz'}).`,
      };
    }

    // A telepítő külön folyamat, ezért a fájlt content:// URI-ként kell
    // átadni; a közvetlen file:// utat az Android 7 óta elutasítja.
    const contentUri = await FileSystem.getContentUriAsync(result.uri);

    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: APK_MIME,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
    });

    return { status: 'installer-opened' };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Ismeretlen hiba.',
    };
  }
}

/** Emberi méret a folyamatjelzőhöz: `12,4 / 42,7 MB`. */
export function formatBytes(bytes: number): string {
  return (bytes / 1_000_000).toFixed(1).replace('.', ',');
}
