import type AudioPlayer from "../audio-player";
import { onSourceChange } from "../modes";
import type { LibraryRecord } from "../library/store";
import { fetchLyrics, type LyricsResult } from "./api";
import { activeLineIndex, parseLrc, type LrcLine } from "./lrc";
import { lyricsKey, loadCachedLyrics, saveLyrics } from "./store";

const KARAOKE_ENABLED_KEY = "karaoke-enabled";

/** Karaoke display preference; absent value means on (the classic behavior). */
function karaokeEnabled(): boolean {
  return localStorage.getItem(KARAOKE_ENABLED_KEY) !== "0";
}

function setKaraokeEnabled(enabled: boolean): void {
  localStorage.setItem(KARAOKE_ENABLED_KEY, enabled ? "1" : "0");
}

export interface LyricsUiDeps {
  /** Record behind the player's current index; null when none. */
  currentRecord: () => LibraryRecord | null;
  /** Karaoke badge in the visualization area's controls row. */
  lyricsToggle: HTMLButtonElement;
}

let player: AudioPlayer;
let panel: HTMLDivElement;
let textBox: HTMLDivElement;
let lines: LrcLine[] = [];
/** Key of the track the panel currently resolves (fetch in-flight counts). */
let currentKey: string | null = null;
let activeIndex = -1;
let lastTime = 0;
let controller: AbortController | null = null;

export function isLyricsVisible(): boolean {
  return !panel.hidden;
}

/** Radio takeover / stop: the area returns to the waveform. */
export function clearLyrics(): void {
  controller?.abort();
  controller = null;
  currentKey = null;
  lines = [];
  activeIndex = -1;
  textBox.replaceChildren();
  panel.hidden = true;
}

function setActive(index: number): void {
  if (index === activeIndex) {
    return;
  }
  textBox.children[activeIndex]?.classList.remove("lyrics__line_active");
  activeIndex = index;
  const line = textBox.children[index];
  if (!line) {
    return;
  }
  line.classList.add("lyrics__line_active");
  // Center the singing line. Runs only when the line changes, so user
  // scrolling is not fought.
  line.scrollIntoView({ block: "center" });
}

function buildSyncedLine(time: number, text: string): HTMLDivElement {
  const line = document.createElement("div");
  line.className = "lyrics__line";
  line.textContent = text;
  line.addEventListener("click", () => {
    player.rewind(time / player.duration);
  });
  return line;
}

function render(lyrics: LyricsResult): void {
  textBox.replaceChildren();
  activeIndex = -1;
  if (lyrics.synced) {
    lines = parseLrc(lyrics.synced);
    for (const { time, text } of lines) {
      textBox.append(buildSyncedLine(time, text));
    }
    panel.hidden = false;
    setActive(activeLineIndex(lines, lastTime));
    return;
  }
  lines = [];
  const text = document.createElement("div");
  text.className = "lyrics__line lyrics__line_plain";
  text.textContent = lyrics.plain ?? "";
  textBox.append(text);
  panel.hidden = false;
}

async function show(record: LibraryRecord): Promise<void> {
  if (!record.artist || !record.title) {
    // filename-only imports carry nothing searchable
    return;
  }
  const key = lyricsKey(record.artist, record.title);
  if (currentKey === key) {
    // resume of the same track: panel state already correct
    return;
  }
  currentKey = key;
  const cached = await loadCachedLyrics(key);
  if (currentKey !== key) {
    // another track started while reading the cache
    return;
  }
  if (cached) {
    render(cached);
    return;
  }

  controller = new AbortController();
  const fetched = await fetchLyrics(record, controller.signal);
  if (currentKey !== key) {
    return;
  }
  if (!fetched) {
    // no lyrics is a silent normal outcome
    clearLyrics();
    return;
  }
  void saveLyrics(key, fetched);
  render(fetched);
}

/**
 * Wires the lyrics panel: fetch/cache on library playback, highlight the
 * singing line, seek on line click. Radio never reaches here - it plays on
 * its own audio element - and its takeover calls clearLyrics explicitly.
 */
export function initLyrics(audioPlayer: AudioPlayer, deps: LyricsUiDeps): void {
  player = audioPlayer;
  // a station taking the transport stops the library element: clear the panel
  onSourceChange(({ source }) => {
    if (source === "radio") {
      clearLyrics();
    }
  });
  panel = document.querySelector<HTMLDivElement>(".lyrics")!;
  textBox = panel.querySelector<HTMLDivElement>(".lyrics__text")!;

  const syncToggle = () => {
    deps.lyricsToggle.classList.toggle("visualizer-controls__lyrics_active", karaokeEnabled());
  };
  deps.lyricsToggle.addEventListener("click", () => {
    setKaraokeEnabled(!karaokeEnabled());
    syncToggle();
    if (karaokeEnabled()) {
      // enabling mid-track: resolve lyrics for what is playing right now
      const record = deps.currentRecord();
      if (record) {
        void show(record);
      }
    } else {
      clearLyrics();
    }
  });
  syncToggle();

  player.on("track:play", () => {
    if (!karaokeEnabled()) {
      // karaoke off: the panel never takes the area, the visualizer keeps it
      clearLyrics();
      return;
    }
    const record = deps.currentRecord();
    if (record) {
      void show(record);
    } else {
      clearLyrics();
    }
  });
  player.on("track:timeupdate", () => {
    lastTime = player.position;
    if (!panel.hidden && lines.length > 0) {
      setActive(activeLineIndex(lines, lastTime));
    }
  });
}
