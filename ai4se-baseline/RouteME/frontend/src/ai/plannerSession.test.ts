import { describe, expect, it } from 'vitest';
import { defaultPlannerForm } from './plannerForm';
import {
  createPlannerSession,
  describeSession,
  loadSessionStore,
  parseSessionStore,
  plannerStorageKey,
  readSessionStore,
  upsertSession,
  writeSessionStore,
} from './plannerSession';

type MemoryStorage = Storage & { dump: () => Record<string, string> };

function memoryStorage(): MemoryStorage {
  const data: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(data).length;
    },
    clear: () => {
      Object.keys(data).forEach((key) => delete data[key]);
    },
    getItem: (key: string) => data[key] ?? null,
    key: (index: number) => Object.keys(data)[index] ?? null,
    removeItem: (key: string) => {
      delete data[key];
    },
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    dump: () => ({ ...data }),
  };
}

describe('plannerSession store', () => {
  it('keeps sessions per user and isolates them', () => {
    const storage = memoryStorage();
    const first = createPlannerSession({ ...defaultPlannerForm(), date: '2026-11-20' }, 1000);
    const second = createPlannerSession({ ...defaultPlannerForm(), date: '2026-12-01' }, 2000);
    writeSessionStore(7, { activeId: second.id, sessions: [second, first] }, storage);
    writeSessionStore(8, { activeId: first.id, sessions: [first] }, storage);

    expect(readSessionStore(7, storage)?.sessions.map((session) => session.form.date)).toEqual([
      '2026-12-01',
      '2026-11-20',
    ]);
    expect(readSessionStore(8, storage)?.sessions).toHaveLength(1);
    expect(Object.keys(storage.dump())).toEqual([plannerStorageKey(7), plannerStorageKey(8)]);
  });

  it('creates a blank session when storage has no history', () => {
    const store = loadSessionStore(1, 1234, memoryStorage());
    expect(store.sessions).toHaveLength(1);
    expect(store.activeId).toBe(store.sessions[0].id);
  });

  it('ignores malformed history instead of half restoring it', () => {
    expect(parseSessionStore('not json')).toBeNull();
    expect(parseSessionStore(JSON.stringify({ sessions: [{ form: {} }] }))).toBeNull();
  });

  it('upserts a session and keeps the active id', () => {
    const session = createPlannerSession(defaultPlannerForm(), 10);
    const store = { activeId: session.id, sessions: [session] };
    const updated = { ...session, title: '珠海', updatedAt: 20 };
    const next = upsertSession(store, updated);
    expect(next.sessions).toHaveLength(1);
    expect(next.sessions[0].title).toBe('珠海');
    expect(next.activeId).toBe(session.id);
  });

  it('describes a session by destination, then by first user message', () => {
    const base = defaultPlannerForm();
    expect(
      describeSession({ ...base, destination: { name: '珠海市', lng: 113.5, lat: 22.2 } }, []),
    ).toBe('珠海');
    expect(
      describeSession(base, [
        { id: 1, role: 'user', text: '帮我规划一个很长的毕业旅行行程', time: '10:00', tone: 'default' },
      ]),
    ).toBe('帮我规划一个很长的毕业旅行行程');
    expect(describeSession(base, [])).toBe('新的规划');
  });
});