import AsyncStorage from '@react-native-async-storage/async-storage';

import { LOCAL_CALENDAR_ID, type EventDraft } from '../../calendar/types';
import {
  createLocalEvent,
  deleteLocalEvent,
  draftToStored,
  getLocalEvent,
  isLocalId,
  listLocalEvents,
  newId,
  parseStored,
  toCalEvent,
  updateLocalEvent,
  type StoredEvent,
} from '../events';

// In-memory stand-in for the device's key/value store.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (k: string) => store[k] ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: jest.fn(async (k: string) => {
      delete store[k];
    }),
    __reset: () => {
      store = {};
    },
  };
});

const reset = () => (AsyncStorage as unknown as { __reset: () => void }).__reset();

function draft(over: Partial<EventDraft> = {}): EventDraft {
  return {
    title: 'Fogorvos',
    notes: '',
    location: 'Rendelő',
    start: new Date(2026, 7, 25, 9, 0),
    end: new Date(2026, 7, 25, 10, 0),
    allDay: false,
    calendarId: LOCAL_CALENDAR_ID,
    ...over,
  };
}

beforeEach(reset);

describe('azonosítók', () => {
  it('a helyi azonosító felismerhető, a naptáraké nem az', () => {
    expect(isLocalId(newId())).toBe(true);
    expect(isLocalId('12345')).toBe(false);
    expect(isLocalId('')).toBe(false);
  });

  it('ugyanabban a milliszekundumban sem ütközik', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId(1_700_000_000_000)));
    expect(ids.size).toBe(500);
  });
});

describe('parseStored', () => {
  const valid: StoredEvent = {
    id: newId(),
    title: 'Valami',
    notes: '',
    location: '',
    start: new Date(2026, 7, 25, 9).toISOString(),
    end: new Date(2026, 7, 25, 10).toISOString(),
    allDay: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('a hibás rekordokat kidobja, a jókat megtartja', () => {
    // Egyetlen sérült bejegyzés miatt nem veszhet el az összes esemény.
    const input = [valid, null, 'szöveg', { ...valid, start: 'nem dátum' }, { id: 7 }];
    expect(parseStored(input)).toEqual([valid]);
  });

  it('nem tömb bemenetre üres listát ad', () => {
    expect(parseStored(null)).toEqual([]);
    expect(parseStored({})).toEqual([]);
  });
});

describe('draftToStored', () => {
  it('levágja a felesleges szóközöket', () => {
    const stored = draftToStored(draft({ title: '  Fogorvos  ', notes: ' x ' }));
    expect(stored.title).toBe('Fogorvos');
    expect(stored.notes).toBe('x');
  });

  it('szerkesztéskor megőrzi az azonosítót és a létrehozás idejét', () => {
    const first = draftToStored(draft(), undefined, new Date(2026, 0, 1));
    const second = draftToStored(draft({ title: 'Új cím' }), first, new Date(2026, 5, 1));

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).not.toBe(first.updatedAt);
    expect(second.title).toBe('Új cím');
  });
});

describe('toCalEvent', () => {
  it('a helyi naptárhoz rendeli, és helyi forrásként jelöli', () => {
    const event = toCalEvent(draftToStored(draft()));
    expect(event.source).toBe('local');
    expect(event.calendarId).toBe(LOCAL_CALENDAR_ID);
    expect(event.calendarTitle).toBe('Napirend');
    expect(event.start).toEqual(new Date(2026, 7, 25, 9, 0));
  });

  it('a névtelen eseménynek is ad megjeleníthető címet', () => {
    expect(toCalEvent(draftToStored(draft({ title: '' }))).title).toBe('(névtelen esemény)');
  });
});

describe('mentés és visszaolvasás', () => {
  it('a létrehozott esemény visszaolvasható', async () => {
    const id = await createLocalEvent(draft());
    const found = await getLocalEvent(id);

    expect(found?.title).toBe('Fogorvos');
    expect(found?.location).toBe('Rendelő');
    expect(found?.source).toBe('local');
  });

  it('több eseményt is megőriz', async () => {
    await createLocalEvent(draft({ title: 'Egy' }));
    await createLocalEvent(draft({ title: 'Kettő' }));

    const all = await listLocalEvents();
    expect(all.map((e) => e.title).sort()).toEqual(['Egy', 'Kettő']);
  });

  it('a módosítás megmarad, és a többi eseményt nem bántja', async () => {
    const keep = await createLocalEvent(draft({ title: 'Marad' }));
    const id = await createLocalEvent(draft({ title: 'Régi' }));

    await updateLocalEvent(id, draft({ title: 'Frissítve', location: 'Máshol' }));

    expect((await getLocalEvent(id))?.title).toBe('Frissítve');
    expect((await getLocalEvent(id))?.location).toBe('Máshol');
    expect((await getLocalEvent(keep))?.title).toBe('Marad');
  });

  it('ismeretlen azonosító módosítása nem hoz létre új eseményt', async () => {
    await createLocalEvent(draft());
    await updateLocalEvent(newId(), draft({ title: 'Kísértet' }));

    const all = await listLocalEvents();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Fogorvos');
  });

  it('a törlés csak a megadott eseményt viszi el', async () => {
    const keep = await createLocalEvent(draft({ title: 'Marad' }));
    const drop = await createLocalEvent(draft({ title: 'Törlendő' }));

    await deleteLocalEvent(drop);

    expect(await getLocalEvent(drop)).toBeNull();
    expect((await getLocalEvent(keep))?.title).toBe('Marad');
  });

  it('sérült tárolóból nem dől el, üres listát ad', async () => {
    await AsyncStorage.setItem('napirend.events.v1', '{ ez nem JSON');
    expect(await listLocalEvents()).toEqual([]);
  });
});
