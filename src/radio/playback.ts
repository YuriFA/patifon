import type Hls from "hls.js";
import type { RadioStation } from "./api";

export type RadioPlaybackState = "playing" | "paused" | "stopped" | "error";

export interface RadioPlaybackCallbacks {
  onStateChange: (state: RadioPlaybackState, station: RadioStation | null) => void;
}

let element: HTMLAudioElement | null = null;
let hls: Hls | null = null;
let current: RadioStation | null = null;
let errorListener: (() => void) | null = null;

function audioElement(): HTMLAudioElement {
  if (!element) {
    // Radio deliberately bypasses the Web Audio graph: cross-origin streams
    // without CORS headers would be silent through a MediaElementAudioSourceNode.
    element = new Audio();
    element.preload = "none";
  }
  return element;
}

function detachHls(): void {
  if (hls) {
    hls.destroy();
    hls = null;
  }
}

const listeners = new Set<(state: RadioPlaybackState, station: RadioStation | null) => void>();

export function onRadioStateChange(
  cb: (state: RadioPlaybackState, station: RadioStation | null) => void,
): void {
  listeners.add(cb);
}

function setState(state: RadioPlaybackState): void {
  for (const listener of listeners) {
    listener(state, current);
  }
}

function isHlsStream(station: RadioStation): boolean {
  const cleanUrl = station.url_resolved.split("?")[0];
  return cleanUrl.endsWith(".m3u8") || station.url_resolved.split("?")[0].endsWith(".m3u8");
}

async function attach(station: RadioStation): Promise<void> {
  const el = audioElement();
  detachHls();
  if (errorListener) {
    el.removeEventListener("error", errorListener);
  }
  errorListener = () => setState("error");
  el.addEventListener("error", errorListener);

  if (isHlsStream(station) && !el.canPlayType("application/vnd.apple.mpegurl")) {
    const { default: Hls } = await import("hls.js");
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setState("error");
        }
      });
      hls.loadSource(station.url_resolved);
      hls.attachMedia(el);
      return;
    }
  }
  el.src = station.url_resolved;
}

async function playCurrent(): Promise<void> {
  try {
    await audioElement().play();
    setState("playing");
  } catch {
    // play() rejects on interrupted switches; error events handle real failures
  }
}

export async function playStation(station: RadioStation): Promise<void> {
  current = station;
  setState("stopped");
  await attach(station);
  await playCurrent();
}

export function pauseStation(): void {
  audioElement().pause();
  setState("paused");
}

export async function resumeStation(): Promise<void> {
  await playCurrent();
}

export function stopStation(): void {
  const el = audioElement();
  el.pause();
  el.removeAttribute("src");
  el.load();
  detachHls();
  current = null;
  setState("stopped");
}

export function isRadioActive(): boolean {
  return current !== null;
}

export function setRadioVolume(value: number): void {
  audioElement().volume = value;
}

export function setRadioMuted(muted: boolean): void {
  audioElement().muted = muted;
}
export function radioState(): RadioPlaybackState {
  if (!element || !current) {
    return "stopped";
  }
  if (element.error) {
    return "error";
  }
  return element.paused ? "paused" : "playing";
}
