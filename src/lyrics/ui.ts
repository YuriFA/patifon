import { effect } from "@preact/signals";
import type AudioPlayer from "../audio-player";
import { onSourceChange } from "../modes";
import type { LibraryRecord } from "../library/store";
import { currentRecord } from "../library/source";
import { fetchLyrics, type LyricsResult } from "./api";
import { activeLineIndex, parseLrc, type LrcLine } from "./lrc";
import { lyricsKey, loadCachedLyrics, saveLyrics } from "./store";
import { areaMode } from "../visualizer/area-mode";

let player: AudioPlayer;
let panel: HTMLDivElement;
let textBox: HTMLDivElement;
let lines: LrcLine[] = [];
/** Key of the track the panel currently resolves (fetch in-flight counts). */
let currentKey: string | null = null;
let activeIndex = -1;
let lastTime = 0;
let emptyState: HTMLDivElement;
let controller: AbortController | null = null;

export function isLyricsVisible(): boolean {
  return !panel.hidden;
}

/** Radio takeover / leaving the LYRICS tab: the panel is removed. */
export function clearLyrics(): void {
  controller?.abort();
  controller = null;
  lines = [];
  activeIndex = -1;
  textBox.replaceChildren();
  emptyState.hidden = true;
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
    // filename-only imports carry nothing searchable: muted empty state
    showEmpty();
    return;
  }
  const key = lyricsKey(record.artist, record.title);
  if (currentKey === key) {
    // resume of the same track: panel state already correct
    return;
  }
  currentKey = key;
  panel.hidden = false;
  emptyState.hidden = true;
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
    // no lyrics is a normal outcome: the LYRICS tab shows a muted empty state
    showEmpty();
    return;
  }
  void saveLyrics(key, fetched);
  render(fetched);
}

function showEmpty(): void {
  textBox.replaceChildren();
  lines = [];
  activeIndex = -1;
  panel.hidden = false;
  emptyState.hidden = false;
}

/**
 * Wires the lyrics panel: fetch/cache on library playback, highlight the
 * singing line, seek on line click. The LYRICS tab gates the panel - the
 * area shows it exactly while that tab is selected. Radio never reaches
 * here - it plays on its own audio element - and its takeover calls
 * clearLyrics explicitly.
 */
export function initLyrics(audioPlayer: AudioPlayer): void {
  player = audioPlayer;
  // a station taking the transport stops the library element: clear the panel
  onSourceChange(({ source }) => {
    if (source === "radio") {
      clearLyrics();
    }
  });
  panel = document.querySelector<HTMLDivElement>(".lyrics")!;
  textBox = panel.querySelector<HTMLDivElement>(".lyrics__text")!;
  emptyState = panel.querySelector<HTMLDivElement>(".lyrics__empty")!;

  const syncTab = () => {
    if (areaMode.value !== "lyrics") {
      // another tab owns the area: the panel never shows
      clearLyrics();
      return;
    }
    // entering the LYRICS tab (including mid-track): resolve what is playing
    const record = currentRecord();
    if (record) {
      void show(record);
    } else {
      clearLyrics();
    }
  };
  effect(syncTab);

  player.on("track:play", () => {
    if (areaMode.value !== "lyrics") {
      return;
    }
    const record = currentRecord();
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
