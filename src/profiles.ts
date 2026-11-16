/** Claves de localStorage que forman un perfil. */
export const PROFILE_KEYS = ['salida', 'triggers', 'ajustes'] as const;
export type ProfileKey = (typeof PROFILE_KEYS)[number];

export const PROFILE_VERSION = 1;
export const MAX_PROFILE_NAME = 40;

export interface Profile {
  version: number;
  name: string;
  data: Partial<Record<ProfileKey, unknown>>;
}

interface TextStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function cleanName(name: string): string {
  return name.trim().slice(0, MAX_PROFILE_NAME);
}

/** Foto de los ajustes actuales como perfil. */
export function captureProfile(name: string, storage: TextStorage): Profile {
  const data: Profile['data'] = {};
  for (const key of PROFILE_KEYS) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      /* dato corrupto: se omite */
    }
  }
  return { version: PROFILE_VERSION, name: cleanName(name) || 'Perfil', data };
}

/** Escribe un perfil en el almacenamiento; la app lo lee al recargar (y sanea cada parte). */
export function applyProfile(profile: Profile, storage: TextStorage): void {
  for (const key of PROFILE_KEYS) {
    const v = profile.data[key];
    if (v !== undefined) storage.setItem(key, JSON.stringify(v));
  }
}

/** Valida un JSON importado. Devuelve null si no es un perfil de esta version. */
export function parseProfile(text: string): Profile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r['version'] !== PROFILE_VERSION || typeof r['name'] !== 'string' || typeof r['data'] !== 'object' || r['data'] === null) return null;
  const name = cleanName(r['name']);
  if (!name) return null;
  const data: Profile['data'] = {};
  for (const key of PROFILE_KEYS) {
    const v = (r['data'] as Record<string, unknown>)[key];
    if (typeof v === 'object' && v !== null) data[key] = v;
  }
  return { version: PROFILE_VERSION, name, data };
}

export function serializeProfile(p: Profile): string {
  return JSON.stringify(p, null, 2);
}

/** Almacen de perfiles por nombre. */
export interface ProfileStore {
  list(): Promise<string[]>;
  get(name: string): Promise<Profile | undefined>;
  put(profile: Profile): Promise<void>;
  remove(name: string): Promise<void>;
}

export class MemoryProfileStore implements ProfileStore {
  private readonly map = new Map<string, Profile>();
  async list(): Promise<string[]> {
    return [...this.map.keys()].sort((a, b) => a.localeCompare(b));
  }
  async get(name: string): Promise<Profile | undefined> {
    return this.map.get(name);
  }
  async put(p: Profile): Promise<void> {
    this.map.set(p.name, p);
  }
  async remove(name: string): Promise<void> {
    this.map.delete(name);
  }
}

const DB_NAME = 'perfiles';
const STORE = 'perfiles';

/** Almacen en IndexedDB. */
export class IdbProfileStore implements ProfileStore {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'name' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async list(): Promise<string[]> {
    return ((await this.run('readonly', (s) => s.getAllKeys())) as string[]).sort((a, b) => a.localeCompare(b));
  }
  async get(name: string): Promise<Profile | undefined> {
    return (await this.run('readonly', (s) => s.get(name))) as Profile | undefined;
  }
  async put(p: Profile): Promise<void> {
    await this.run('readwrite', (s) => s.put(p));
  }
  async remove(name: string): Promise<void> {
    await this.run('readwrite', (s) => s.delete(name));
  }
}
