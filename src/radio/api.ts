/**
 * Client for the radio-browser community catalog.
 * https://api.radio-browser.info/
 *
 * Browser constraints shape this client: custom Host/User-Agent headers are
 * forbidden, and SRV lookups are unavailable, so the API's "random server +
 * failover" guidance is implemented as a mirror list with a session-cached
 * winner.
 */

export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  favicon: string;
  tags: string;
  bitrate: number;
}

const MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];

let cachedMirror: string | null = null;

function mirrorOrder(): string[] {
  if (cachedMirror) {
    return [cachedMirror, ...MIRRORS.filter((mirror) => mirror !== cachedMirror)];
  }
  // Random first pick spreads load across mirrors between sessions
  const start = Math.floor(Math.random() * MIRRORS.length);
  return [...MIRRORS.slice(start), ...MIRRORS.slice(0, start)];
}

async function fetchJson<T>(path: string): Promise<T> {
  let lastError: unknown = new Error("radio catalog unreachable");
  for (const mirror of mirrorOrder()) {
    try {
      const response = await fetch(mirror + path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as T;
      cachedMirror = mirror;
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function searchStations(name: string): Promise<RadioStation[]> {
  const params = new URLSearchParams({
    name,
    limit: "50",
    hidebroken: "true",
    order: "votes",
    reverse: "true",
  });
  return fetchJson<RadioStation[]>(`/json/stations/search?${params}`);
}

/** Fire-and-forget listen report for community ranking; failures never surface. */
export function reportListen(stationuuid: string): void {
  const mirror = cachedMirror ?? mirrorOrder()[0];
  void fetch(`${mirror}/json/url/${stationuuid}`).catch(() => {});
}
