const DB_NAME = "audio-player";
const DB_VERSION = 1;
const STORE_TRACKS = "tracks";

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

export async function idbPut(store: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readwrite");
  await asPromise(tx.objectStore(store).put(value));
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readonly");
  return asPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>);
}
