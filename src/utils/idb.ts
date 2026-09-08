const DB_NAME = "audio-player";
const DB_VERSION = 5;
const STORE_TRACKS = "tracks";
const STORE_STATIONS = "stations";
const STORE_LYRICS = "lyrics";
const STORE_PLAYLISTS = "playlists";
const STORE_WAVEFORMS = "waveforms";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }
  const { promise, resolve, reject } = Promise.withResolvers<IDBDatabase>();
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.addEventListener("upgradeneeded", () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_TRACKS)) {
      db.createObjectStore(STORE_TRACKS, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(STORE_STATIONS)) {
      db.createObjectStore(STORE_STATIONS, { keyPath: "stationuuid" });
    }
    if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
      db.createObjectStore(STORE_PLAYLISTS, { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains(STORE_WAVEFORMS)) {
      // keyed by the track id, so no keyPath here (same pattern as lyrics)
      db.createObjectStore(STORE_WAVEFORMS);
    }
    if (!db.objectStoreNames.contains(STORE_LYRICS)) {
      db.createObjectStore(STORE_LYRICS);
    }
  });
  request.addEventListener("success", () => {
    resolve(request.result);
  });
  request.addEventListener("error", () => {
    reject(request.error ?? new Error("IndexedDB open failed"));
  });
  dbPromise = promise;
  return promise;
}

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  request.addEventListener("success", () => {
    resolve(request.result);
  });
  request.addEventListener("error", () => {
    reject(request.error ?? new Error("IndexedDB request failed"));
  });
  return promise;
}

export async function idbPut(store: string, value: unknown, key?: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readwrite");
  await asPromise(tx.objectStore(store).put(value, key));
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readonly");
  return asPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}

export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readonly");
  return asPromise(tx.objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readwrite");
  await asPromise(tx.objectStore(store).delete(key));
}
