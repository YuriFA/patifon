import type { LibraryRecord } from "../library/store";

/**
 * "Play next" queue: an insertion window into the active playback order.
 * Queued records are spliced right after the current track (queue order
 * preserved across multiple insertions) and stay queued until played through.
 * Switching the playback source (another playlist, a library rebuild) resets
 * the window: the new source owns the order.
 */

export interface QueueContext {
  /** The player's current effective order; spliced in place on queueNext. */
  order(): LibraryRecord[];
  currentIndex(): number;
  /** Applies the spliced order to the player without interrupting playback. */
  apply(order: LibraryRecord[]): void;
}

let pending: LibraryRecord[] = [];

export function queueNext(record: LibraryRecord, ctx: QueueContext): void {
  const order = ctx.order();
  const current = ctx.currentIndex();
  let at = current + 1 + pending.length;
  // an upcoming track MOVES to the front of the queue instead of duplicating
  const existing = order.findIndex((entry, i) => i > current && entry.id === record.id);
  if (existing !== -1) {
    order.splice(existing, 1);
    if (existing < at) {
      at -= 1;
    }
  }
  order.splice(at, 0, record);
  pending.push(record);
  ctx.apply(order);
}
/** Ids still queued ahead of (or at) the current position, for row badges. */
export function pendingQueueIds(): string[] {
  return pending.map((record) => record.id);
}

/**
 * Drops queued entries that the current position reached (the queued track is
 * now playing or was passed). Returns true when the pending set changed.
 */
export function prunePlayed(order: readonly LibraryRecord[], currentIndex: number): boolean {
  const playedIds = new Set(order.slice(0, currentIndex + 1).map((record) => record.id));
  const next = pending.filter((record) => !playedIds.has(record.id));
  if (next.length === pending.length) {
    return false;
  }
  pending = next;
  return true;
}

/** Clears the queue window on a playback source switch. */
export function resetQueue(): void {
  pending = [];
}
