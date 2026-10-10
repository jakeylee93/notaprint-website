import type { ProcessedArtwork } from "../artwork/process";

/**
 * Persistence adapter for customer artwork. The preview build keeps artwork on the customer's
 * device (IndexedDB), keyed by content hash, so proofs in the basket stay valid even after the
 * logo is replaced. A server-backed repository (private object storage) can implement the same
 * interface later without touching the UI.
 */
export interface ArtworkRepository {
  get(id: string): Promise<ProcessedArtwork | null>;
  put(artwork: ProcessedArtwork): Promise<void>;
  remove(id: string): Promise<void>;
  /** Delete every stored artwork whose id is not in `keep`. */
  prune(keep: Set<string>): Promise<void>;
}

const DB_NAME = "nota-print";
const STORE = "artworks";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        t.oncomplete = () => {
          db.close();
          resolve(req ? (req.result as T) : undefined);
        };
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      }),
  );
}

export class IndexedDbArtworkRepository implements ArtworkRepository {
  async get(id: string) {
    try {
      return ((await tx<ProcessedArtwork>("readonly", (s) => s.get(id))) as ProcessedArtwork | undefined) ?? null;
    } catch {
      return null;
    }
  }
  async put(artwork: ProcessedArtwork) {
    await tx("readwrite", (s) => s.put(artwork));
  }
  async remove(id: string) {
    await tx("readwrite", (s) => s.delete(id));
  }
  async prune(keep: Set<string>) {
    const keys = ((await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? []) as string[];
    const doomed = keys.filter((k) => !keep.has(k));
    if (doomed.length) await tx("readwrite", (s) => void doomed.forEach((k) => s.delete(k)));
  }
}

/** In-memory fallback when IndexedDB is unavailable (private mode, blocked storage). */
export class MemoryArtworkRepository implements ArtworkRepository {
  private map = new Map<string, ProcessedArtwork>();
  async get(id: string) {
    return this.map.get(id) ?? null;
  }
  async put(a: ProcessedArtwork) {
    this.map.set(a.id, a);
  }
  async remove(id: string) {
    this.map.delete(id);
  }
  async prune(keep: Set<string>) {
    for (const k of this.map.keys()) if (!keep.has(k)) this.map.delete(k);
  }
}

export function createArtworkRepository(): ArtworkRepository {
  try {
    if (typeof indexedDB !== "undefined") return new IndexedDbArtworkRepository();
  } catch {
    /* fall through */
  }
  return new MemoryArtworkRepository();
}
