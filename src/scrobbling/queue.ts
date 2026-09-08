import type { LibraryRecord } from "../library/store";
import { idbAdd, idbDelete, idbGetAll, idbGetAllKeys } from "../utils/idb";
import { submitListen, type SubmittedListen, type SubmitResult } from "./api";
import { isEnabled } from "./settings";

const STORE_LISTENS = "listens";
/** The documented API rate limit is 1 request/second; keep a margin. */
const MIN_SPACING_MS = 1100;

export function toSubmittedListen(record: LibraryRecord): SubmittedListen {
  return {
    track: record.title,
    artist: record.artist,
    album: record.album,
    listenedAt: new Date().toISOString(),
  };
}

let lastRequestAt = 0;

async function waitSpacing(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_SPACING_MS) {
    await new Promise((resolve) => {
      setTimeout(resolve, MIN_SPACING_MS - elapsed);
    });
  }
  lastRequestAt = Date.now();
}

/** Submits through the shared spacing gate so playing-now and the queue never trip the rate limit. */
export async function spacedSubmit(
  listen: SubmittedListen,
  listenType: "single" | "playing_now",
): Promise<SubmitResult> {
  await waitSpacing();
  return submitListen(listen, listenType);
}

let draining = false;

async function drain(): Promise<void> {
  if (draining || !isEnabled()) {
    return;
  }
  draining = true;
  try {
    for (;;) {
      if (!isEnabled()) {
        return;
      }
      const [keys, items] = await Promise.all([
        idbGetAllKeys(STORE_LISTENS),
        idbGetAll<SubmittedListen>(STORE_LISTENS),
      ]);
      if (keys.length === 0 || keys.length !== items.length) {
        return;
      }
      const result = await spacedSubmit(items[0], "single");
      if (result.ok || !result.retryable) {
        // success, or a bad token/payload that would never succeed on retry
        await idbDelete(STORE_LISTENS, keys[0]);
        continue;
      }
      if (result.retryAfterMs !== null) {
        const delay = result.retryAfterMs;
        await new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
        continue;
      }
      return;
    }
  } finally {
    draining = false;
  }
}

/** Queues a completed listen and kicks a drain attempt. Never throws. */
export async function enqueueListen(record: LibraryRecord): Promise<void> {
  if (!isEnabled()) {
    return;
  }
  await idbAdd(STORE_LISTENS, toSubmittedListen(record));
  void drain();
}

/** Drains the retry queue: called on the online event and at boot. */
export function retryQueuedListens(): void {
  void drain();
}

/** Test and UI hook: how many listens currently wait in the retry queue. */
export async function queuedListenCount(): Promise<number> {
  return (await idbGetAllKeys(STORE_LISTENS)).length;
}
