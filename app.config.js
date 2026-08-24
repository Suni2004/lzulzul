// A statikus beállítások az app.json-ban maradnak; ez a fájl csak a build
// során változó verzióadatokat tölti hozzájuk.
//
// Az EXPO_PUBLIC_BUILD_NUMBER-t a GitHub Actions állítja be a futás
// sorszámára. Ez a fájl Node-ban fut a build elején, így az értéke mindig
// friss — szemben a JS bundle-be inlinelt env-változókkal, amiket a Metro
// transform-cache be tud égetni egy korábbi buildből.
const base = require('./app.json').expo;

const buildNumber = Number(process.env.EXPO_PUBLIC_BUILD_NUMBER ?? 0) || 0;

module.exports = () => ({
  ...base,
  // A verziószám a build sorszámát követi, így minden új APK magasabb
  // versionCode-dal telepszik a régi fölé.
  version: buildNumber > 0 ? `1.0.${buildNumber}` : base.version,
  android: {
    ...base.android,
    versionCode: buildNumber > 0 ? buildNumber : 1,
  },
  extra: {
    ...base.extra,
    // Ezt olvassa a frissítés-ellenőrzés. A 0 azt jelenti: helyi build,
    // ilyenkor nem kérünk frissítést.
    buildNumber,
  },
});
