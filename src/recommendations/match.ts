import type { RecommendationTrack } from "./api";
import type { LibraryRecord } from "../library/store";

/**
 * Normalizes text for comparison: case-folded, diacritics stripped,
 * punctuation flattened to single spaces. "Cafe - Del-Mar!" == "café del mar".
 */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9\s]/gu, " ")
    .replaceAll(/\s+/gu, " ")
    .trim();
}

/** True when both durations are known and disagree by more than 5 seconds. */
function durationConflicts(record: LibraryRecord, durationMs: number): boolean {
  if (durationMs <= 0 || record.duration <= 0) {
    return false;
  }
  return Math.abs(record.duration - durationMs / 1000) > 5;
}

/**
 * Resolves a recommended track (metadata only - LB carries no audio) to a
 * library record. Pass 1: exact normalized artist + title. Pass 2: equal
 * artists with one title containing the other. A known-duration mismatch of
 * more than 5 seconds rejects a candidate. First match wins; null = not in
 * library.
 */
export function matchRecommendedTrack(
  track: RecommendationTrack,
  records: readonly LibraryRecord[],
): LibraryRecord | null {
  const title = normalizeText(track.title);
  if (!title) {
    return null;
  }
  const artist = normalizeText(track.artist);

  for (const record of records) {
    if (
      normalizeText(record.title) === title &&
      normalizeText(record.artist) === artist &&
      !durationConflicts(record, track.durationMs)
    ) {
      return record;
    }
  }
  for (const record of records) {
    const recordTitle = normalizeText(record.title);
    if (
      recordTitle.length > 0 &&
      (recordTitle.includes(title) || title.includes(recordTitle)) &&
      normalizeText(record.artist) === artist &&
      !durationConflicts(record, track.durationMs)
    ) {
      return record;
    }
  }
  return null;
}
