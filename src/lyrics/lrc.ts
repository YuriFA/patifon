export interface LrcLine {
  /** offset in seconds from the track start */
  time: number;
  text: string;
}

const TIMESTAMP = /\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/gu;

/**
 * Parses LRC text ("[mm:ss.xx] line") into time-sorted lines. Several
 * timestamps may prefix one line (repeated entries expand); lines without a
 * timestamp are ignored. Returns [] when no timestamped line exists.
 */
export function parseLrc(source: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of source.split(/\r?\n/u)) {
    TIMESTAMP.lastIndex = 0;
    const times: number[] = [];
    let match = TIMESTAMP.exec(raw);
    let lastEnd = 0;
    while (match) {
      if (match.index !== lastEnd) {
        // text between timestamps: the line is not a multi-tag line
        break;
      }
      times.push(Number(match[1]) * 60 + Number(match[2]));
      lastEnd = TIMESTAMP.lastIndex;
      match = TIMESTAMP.exec(raw);
    }
    const text = raw.slice(lastEnd).trim();
    if (times.length === 0 || text.length === 0) {
      continue;
    }
    for (const time of times) {
      lines.push({ time, text });
    }
  }
  return lines.toSorted((a, b) => a.time - b.time);
}

/**
 * Index of the line sounding at `time` (the last line whose timestamp has
 * passed), or -1 before the first line. `lines` must be time-sorted.
 */
export function activeLineIndex(lines: LrcLine[], time: number): number {
  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lines[mid].time <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}
