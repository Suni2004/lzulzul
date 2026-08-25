# Napirend

Naptár alkalmazás Androidra és iOS-re. Megmutatja a telefonod **meglévő
naptárait** (Google, Samsung, Exchange, iCloud), az **általad felvett
események viszont csak az appban léteznek** – a Samsung és a Google naptár
nem látja őket. Semmilyen adat nem hagyja el a készüléket.

A hangsúly két dolgon van: **átlátható felület** és **értesítések, amik tényleg
segítenek** – nem csak egyet szólnak öt perccel az esemény előtt.

---

## Mit tud

### Felület

- **Havi nézet** – pontok jelzik, melyik napon mi van, naptáranként külön színnel.
  Lapozás oldalra húzással vagy a nyilakkal, egy koppintás a mai napra a *Ma*
  gombbal.
- **Napirend nézet** – a következő 60 nap egy folyamatos listában, napokra
  bontva, ékezet-független kereséssel (`arvizturo` megtalálja az `Árvíztűrő`-t).
- **Esemény nézet** – hátralévő idő, hossz, helyszín (koppintásra megnyílik a
  térképen), jegyzet.
- **Szerkesztés** – cím, időpont, egész napos kapcsoló, helyszín, jegyzet,
  célnaptár. A kezdés eltolásakor a vége magától követi, a hossz nem változik.
- Világos és sötét téma, a rendszerbeállítást követve vagy kézzel átállítva.
- Végig magyar: hónap- és napnevek, „Ma / Holnap / Tegnap", `2026. augusztus 24.`.

### Hol tárolódnak az események

| | Honnan jön | Módosítható | Látja más app |
|---|---|---|---|
| **Napirend** | az app saját tárolója | igen | **nem** |
| Google / Samsung / stb. | a telefon naptárai | igen | igen |

Amit az appban veszel fel, a **Napirend** saját naptárába kerül. Ez nem a
telefon naptár-adatbázisa, hanem az app privát tárolója – ezért nem jelenik
meg sehol máshol, és nem is szinkronizálódik semmilyen fiókba. Cserébe ezek az
események az app eltávolításával elvesznek.

A telefon meglévő naptárait az app továbbra is megjeleníti, és ha egy ottani
eseményt szerkesztesz, az a saját naptárában módosul – ilyenkor a szerkesztő
külön jelzi is, hogy a változás máshol is látszani fog.

### Értesítések

Ez az a rész, ahol a gyári naptárak általában gyengék.

| Funkció | Mit csinál |
|---|---|
| **Több emlékeztető eseményenként** | Nem egy időpont, hanem amennyi kell – például 1 nappal, 1 órával és 10 perccel előtte, mind külön értesítés. |
| **Indulási figyelmeztetés** | Ha az eseménynek van helyszíne, külön szól, hogy *indulj el* – annyi perccel előbb, amennyit beállítasz. |
| **Reggeli áttekintés** | Egyetlen értesítés reggel: hány programod van ma, és mi az első. |
| **Esti előzetes** | Este megmutatja, mi jön holnap. |
| **Egész napos események** | Nincs értelmetlen „30 perc múlva" – előző este és aznap reggel szól, fix órában. |
| **Külön Android-csatornák** | Az emlékeztető, az indulási figyelmeztetés és a napi összefoglaló külön csatornán megy, így a rendszerbeállításokban külön-külön némíthatod őket. |

Az értesítések szövege konkrét, nem általános:

```
Csapatmegbeszélés
14:00 – 15:00 · Iroda · 10 perc múlva
```

```
Jó reggelt!
Ma 3 program vár rád. Az első: Csapatmegbeszélés 09:00-kor
```

Az ütemezett értesítések listája **magától frissül**: minden alkalommal
újraszámoljuk, amikor az app előtérbe kerül, vagy amikor változik a naptár. Ha
a kiszámolt terv megegyezik azzal, ami már be van állítva, nem nyúlunk hozzá –
így nem lesz belőle fölösleges munka.

---

## Telepítés a telefonra

Az app **natív modulokat használ** (naptár-hozzáférés, ütemezett értesítések),
ezért Expo Go-ban nem fut – kell egy lefordított APK.

**Weboldal:** <https://suni2004.github.io/lzulzul/> — letöltés, funkciók,
telepítési útmutató. Minden buildnél magától frissül a `web/` mappából.

### A legegyszerűbb út: kész APK letöltése

Minden pusholásnál automatikusan lefordul egy telepíthető APK, és felkerül a
Releases közé. A telefonodról nyisd meg ezt a linket, és koppints a
`napirend.apk` fájlra:

**<https://github.com/Suni2004/lzulzul/releases/download/apk/napirend.apk>**

Az Android rá fog kérdezni, hogy engedélyezed-e az ismeretlen forrásból való
telepítést – sideloadingnál ez normális. Ehhez a módszerhez semmit nem kell
telepítened a gépedre.

A buildet kézzel is elindíthatod: **Actions → APK építése → Run workflow**.
A fordítás kb. 15–25 perc, utána a fenti link már az új változatot adja.

> A build a szokásos Android debug-kulccsal írja alá az APK-t. Sideloadingra
> tökéletes, és az újabb verziók telepíthetők a régi fölé; a Play Áruházba
> feltölteni viszont saját kulcs kellene hozzá.

### Kötelező frissítés

Minden build közzétesz egy `version.json`-t az APK mellé, benne a futás
sorszámával. A telepített app indításkor és előtérbe kerüléskor összeveti ezt
a sajátjával, és ha újabb van, **blokkoló képernyőt** mutat egy letöltés
gombbal – addig nem lehet használni.

A mechanizmus szándékosan hibatűrő: hálózati hiba, lejárt kérés vagy hiányos
verzióleíró esetén **nem** blokkol. Nem lehet valakit kizárni a saját
naptárából azért, mert épp nincs térerő.

A futó build számát az app a natív app configból olvassa
(`Constants.expoConfig.extra.buildNumber`), nem a JS bundle-be inlinelt
környezeti változóból – utóbbit a Metro transform-cache be tudja égetni egy
korábbi buildből, és akkor az ellenőrzés némán rossz számmal dolgozna.
Helyi fejlesztésnél a szám 0, ilyenkor az ellenőrzés ki van kapcsolva.

### A másik út: saját build az EAS-szel

Ha inkább te fordítanád (például mert módosítottad a kódot):

#### 1. Függőségek

```bash
npm install
```

#### 2. Belépés az Expo-fiókodba

```bash
npx eas login
```

(Ha még nincs fiókod: <https://expo.dev/signup> – ingyenes.)

#### 3. APK készítése

```bash
npx eas build --platform android --profile preview
```

A build a felhőben fut, kb. 10–15 perc. A végén kapsz egy linket és egy
QR-kódot – a telefonodról megnyitva letöltődik az APK, amit telepíthetsz.
(Android rá fog kérdezni, hogy engedélyezed-e az ismeretlen forrásból való
telepítést.)

#### 4. Első indítás

Az app két engedélyt kér:

- **Naptár** – enélkül nincs mit megjeleníteni.
- **Értesítések** – enélkül semmi nem fog szólni.

Utána a *Beállítások* fülön beállíthatod, mikor és hogyan szóljon. A
*Teszt értesítés küldése* gombbal rögtön meg is hallgathatod, hogy fog kinézni.

#### Fejlesztés közben

```bash
npx eas build --platform android --profile development   # egyszer
npm start                                                # utána már csak ez
```

A development build után a `npm start` elég: a telefon a QR-kódon keresztül
csatlakozik, és a kódváltozások azonnal frissülnek.

### iPhone-ra

```bash
npx eas build --platform ios --profile preview
```

Ehhez Apple Developer fiók kell (éves díjas). Android oldalon nincs ilyen
megkötés.

---

## Fejlesztés

```bash
npm start        # Metro dev szerver
npm test         # unit tesztek (Jest)
npm run typecheck # TypeScript ellenőrzés
npm run icons    # ikonkészlet újragenerálása (Python + Pillow kell hozzá)
```

### Felépítés

```
app/                      képernyők (expo-router, fájl alapú útvonalak)
  _layout.tsx             providerek, téma, értesítés-koppintás kezelése
  (tabs)/
    index.tsx             havi nézet + a kiválasztott nap programjai
    agenda.tsx            görgethető napirend kereséssel
    settings.tsx          téma, emlékeztetők, naptárak, diagnosztika
  event/
    [id].tsx              esemény részletei
    edit.tsx              létrehozás és szerkesztés

src/
  calendar/
    api.ts                expo-calendar burkolás, natív adat -> sima objektum
    store.tsx             központi adattár, napok szerint indexelve
    types.ts              CalEvent, CalendarInfo, EventDraft
  notifications/
    plan.ts               MI és MIKOR szóljon – tiszta függvény, tesztelve
    index.ts              a terv átadása az operációs rendszernek
    channels.ts           Android értesítési csatornák
    constants.ts          csatorna-azonosítók (natív import nélkül)
  settings/               beállítások + AsyncStorage perzisztencia
  theme/                  színek, térközök, tipográfia, világos/sötét
  components/             UI-elemek (Txt, Touch, Card, EventCard, MonthGrid…)
  utils/                  magyar dátumformázás, színkezelés, ékezetmentes keresés

tools/make-icons.py       az app ikonkészletét generálja
```

### Miért van külön `plan.ts`

Az értesítés-ütemezés az app lelke, és a legkönnyebben elrontható része.
Ezért teljesen tiszta függvényként van megírva: bemenet az eseménylista, a
beállítások és a pontos idő, kimenet az értesítések listája. Nem nyúl az
operációs rendszerhez, így minden szabálya tesztelhető – lásd
`src/notifications/__tests__/plan.test.ts`.

Az iOS legfeljebb 64 függőben lévő értesítést tárol apponként, ezért a terv
tudatosan a limit alatt marad: legfeljebb 40 esemény-emlékeztető és összesen 58
elem, mindig a legközelebbieket tartva meg. A gördülő ablak minden frissítéskor
újratöltődik.
