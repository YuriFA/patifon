import EventEmitter from "./utils/event-emitter";

/** The three exclusive view modes; library is the boot default. */
export type Mode = "library" | "radio" | "playlists";

/** The audible sources competing for the shared transport. */
export type SourceKind = "library" | "radio";

export interface ModeChange {
  mode: Mode;
  previous: Mode;
}

export interface SourceChange {
  source: SourceKind | null;
  previous: SourceKind | null;
}

type ModeEvents = {
  "mode-change": ModeChange;
  "source-change": SourceChange;
};

// eslint-disable-next-line unicorn/prefer-event-target
const emitter = new EventEmitter<ModeEvents>();

let mode: Mode = "library";
let source: SourceKind | null = null;
/** How each source stops itself; registered once by the wiring at boot. */
const sourceStops = new Map<SourceKind, () => void>();
/** Per-mode handlers for the shared search field. */
const searchHandlers = new Map<Mode, (query: string) => void>();

export function getMode(): Mode {
  return mode;
}

/** Entering the active mode is a no-op without an event. */
export function setMode(next: Mode): void {
  if (next === mode) {
    return;
  }
  const previous = mode;
  mode = next;
  emitter.emit("mode-change", { mode, previous });
}

export function onModeChange(listener: (change: ModeChange) => void): () => void {
  emitter.on("mode-change", listener);
  return () => emitter.off("mode-change", listener);
}

/** The wiring provides both stop functions at boot, before any engagement. */
export function registerSourceStop(kind: SourceKind, stop: () => void): void {
  sourceStops.set(kind, stop);
}

export function getActiveSource(): SourceKind | null {
  return source;
}

/**
 * Reports an engagement with one source. The other source's stop runs
 * unconditionally - exactly one audible source at a time, regardless of what
 * the tracking believed. Re-engaging the active source keeps it without an
 * event.
 */
export function engageSource(kind: SourceKind): void {
  const previous = source;
  for (const [other, stop] of sourceStops) {
    if (other !== kind) {
      stop();
    }
  }
  if (previous === kind) {
    return;
  }
  source = kind;
  emitter.emit("source-change", { source: kind, previous });
}

/** Reports that the source released the transport (station stopped, none engaged). */
export function releaseSource(kind: SourceKind): void {
  if (source !== kind) {
    return;
  }
  source = null;
  emitter.emit("source-change", { source: null, previous: kind });
}

export function onSourceChange(listener: (change: SourceChange) => void): () => void {
  emitter.on("source-change", listener);
  return () => emitter.off("source-change", listener);
}

/** Modules register their search behavior for when their mode is active. */
export function registerModeSearch(forMode: Mode, handler: (query: string) => void): void {
  searchHandlers.set(forMode, handler);
}

/** Routes the shared search field's value to the active mode's handler. */
export function routeSearch(query: string): void {
  searchHandlers.get(mode)?.(query);
}
