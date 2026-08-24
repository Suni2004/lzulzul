import { isOutdated, parseVersionManifest, type UpdateInfo } from '../index';

const VALID = {
  build: 7,
  version: '1.0.7',
  apkUrl: 'https://github.com/Suni2004/lzulzul/releases/download/apk/napirend.apk',
  notes: 'Javítások',
};

describe('parseVersionManifest', () => {
  it('elfogadja a teljes leírót', () => {
    expect(parseVersionManifest(VALID)).toEqual(VALID);
  });

  it('kitölti a hiányzó verziónevet a build számából', () => {
    const { version, ...withoutVersion } = VALID;
    expect(parseVersionManifest(withoutVersion)?.version).toBe('1.0.7');
  });

  it('elutasítja a hiányos vagy értelmetlen leírót', () => {
    expect(parseVersionManifest(null)).toBeNull();
    expect(parseVersionManifest('nem objektum')).toBeNull();
    expect(parseVersionManifest({})).toBeNull();
    expect(parseVersionManifest({ ...VALID, build: 0 })).toBeNull();
    expect(parseVersionManifest({ ...VALID, build: -3 })).toBeNull();
    expect(parseVersionManifest({ ...VALID, build: 'hét' })).toBeNull();
  });

  it('csak https letöltési címet fogad el', () => {
    // Különben egy megbízhatatlan cím felé lehetne terelni a felhasználót.
    expect(parseVersionManifest({ ...VALID, apkUrl: 'http://pelda.hu/a.apk' })).toBeNull();
    expect(parseVersionManifest({ ...VALID, apkUrl: '' })).toBeNull();
    expect(parseVersionManifest({ ...VALID, apkUrl: 42 })).toBeNull();
  });
});

describe('isOutdated', () => {
  const latest = (build: number): UpdateInfo => ({ ...VALID, build });

  it('csak magasabb build esetén kér frissítést', () => {
    expect(isOutdated(latest(8), 7)).toBe(true);
    expect(isOutdated(latest(7), 7)).toBe(false);
    expect(isOutdated(latest(6), 7)).toBe(false);
  });

  it('nem blokkol, ha nincs lekért verzió', () => {
    // Hálózati hiba nem zárhatja ki a felhasználót a naptárából.
    expect(isOutdated(null, 7)).toBe(false);
  });

  it('nem blokkol helyi fejlesztésnél, ahol a build ismeretlen', () => {
    expect(isOutdated(latest(99), 0)).toBe(false);
  });
});
