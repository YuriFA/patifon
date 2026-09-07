import { searchStations, type RadioStation } from "./api";

const SEARCH_DEBOUNCE_MS = 300;

export interface SearchDeps {
  search: HTMLInputElement;
  onResults: (stations: RadioStation[]) => void;
  onError: () => void;
}

let timer: number | null = null;

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
  const query = deps.search.value.trim();
  if (!query) {
    deps.onResults([]);
    return;
  }
  try {
    deps.onResults(await searchStations(query));
  } catch {
    deps.onError();
  }
}
