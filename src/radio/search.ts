import { searchStations, type RadioStation } from "./api";

const SEARCH_DEBOUNCE_MS = 300;

export interface SearchDeps {
  /** The current search text (the sidebar island owns the field). */
  search(): string;
  onResults: (stations: RadioStation[]) => void;
  onError: () => void;
}

let timer: number | null = null;

/** Stale-response guard: only the latest issued search may touch the UI. */
let searchSeq = 0;

export function scheduleSearch(deps: SearchDeps): void {
  if (timer !== null) {
    window.clearTimeout(timer);
  }
  timer = window.setTimeout(() => {
    timer = null;
    void runSearch(deps);
  }, SEARCH_DEBOUNCE_MS);
}

export function cancelScheduledSearch(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
}

async function runSearch(deps: SearchDeps): Promise<void> {
  const seq = ++searchSeq;
  const query = deps.search().trim();
  if (!query) {
    deps.onResults([]);
    return;
  }
  try {
    const stations = await searchStations(query);
    if (seq === searchSeq) {
      deps.onResults(stations);
    }
  } catch {
    if (seq === searchSeq) {
      deps.onError();
    }
  }
}
