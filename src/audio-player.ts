import Playlist from "./playlist";
import type { TrackSource } from "./playlist";
import Equalizer from "./equalizer";
import type { EqualizerPreset } from "./equalizer";
import Analyser from "./analyser";
import EventEmitter from "./utils/event-emitter";

export interface AudioPlayerSettings {
  equalizer?: boolean;
  analyser?: boolean;
}

const MEDIA_EVENTS_FORWARDED = [
  "progress",
  "loadeddata",
  "canplaythrough",
  "loadedmetadata",
  "timeupdate",
] as const;

/**
 * Owns a single HTMLAudioElement for the whole playlist: switching tracks only
 * swaps the element source, and the media element feeds the Web Audio graph
 * through exactly one MediaElementAudioSourceNode created on first play.
 */
// The custom emitter keeps the historical on/off/emit API with plain argument
// payloads; EventTarget would force CustomEvent wrapping for no behavioral gain.
// eslint-disable-next-line unicorn/prefer-event-target
export default class AudioPlayer extends EventEmitter {
  readonly playlist: Playlist;
  readonly settings: AudioPlayerSettings;
  currentTrackIndex = 0;
  muted = false;

  private readonly audio = new Audio();

  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private eqFilters: Equalizer | null = null;
  private analyserRef: Analyser | null = null;

  private volumeValue = 1;
  private playing = false;
  private bandGains: number[] = [];

  constructor(tracks: TrackSource[] = [], settings: AudioPlayerSettings = {}) {
    super();
    this.playlist = new Playlist(tracks);
    this.settings = settings;

    this.audio.crossOrigin = "anonymous";
    this.audio.addEventListener("ended", () => {
      this.playNext();
    });
    for (const event of MEDIA_EVENTS_FORWARDED) {
      this.audio.addEventListener(event, (e) => {
        this.emit(`track:${event}`, e);
      });
    }
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get isPaused(): boolean {
    return !this.playing || this.audio.paused;
  }

  get volume(): number {
    return this.volumeValue;
  }

  set volume(value: number) {
    const clamped = Math.min(1, Math.max(0, value));
    if (clamped === 0) {
      this.mute();
    } else if (this.muted) {
      this.unmute();
    }
    this.volumeValue = clamped;
    if (this.gain) {
      this.gain.gain.value = clamped;
    }
  }

  get equalizer(): Equalizer | null {
    return this.eqFilters;
  }

  get analyser(): Analyser | null {
    return this.analyserRef;
  }

  async play(id: number | null = null): Promise<void> {
    if (this.isPlaying) {
      return;
    }
    if (id !== null) {
      this.currentTrackIndex = id;
    }

    this.playing = true;
    await this.ensureAudioContext();
    this.loadCurrentTrack();
    await this.audio.play();
  }

  stop(): this {
    this.playing = false;
    this.audio.pause();
    this.audio.currentTime = 0;
    return this;
  }

  pause(): this {
    this.playing = false;
    this.audio.pause();
    return this;
  }

  mute(): this {
    this.audio.muted = true;
    this.muted = true;
    return this;
  }

  unmute(): this {
    this.audio.muted = false;
    this.muted = false;
    return this;
  }

  async playNext(): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }
    this.currentTrackIndex += 1;
    await this.play();
  }

  async playPrev(): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }
    this.currentTrackIndex -= 1;
    await this.play();
  }

  rewind(ratio: number): this {
    if (!Number.isNaN(this.audio.duration)) {
      this.audio.currentTime = this.audio.duration * ratio;
    }
    return this;
  }

  /**
   * Equalizer band gains work before the audio graph exists: the desired
   * state is remembered and applied when the graph is created.
   */
  changeBandGain(id: number, value: number): void {
    const clamped = Math.min(12, Math.max(-12, value));
    this.bandGains[id] = clamped;
    this.eqFilters?.changeFilterGain(id, clamped);
  }

  getBandGain(id: number): number {
    return this.bandGains[id] ?? 0;
  }

  applyPreset(preset: EqualizerPreset): void {
    preset.data.forEach((gain, i) => {
      this.changeBandGain(i, gain);
    });
  }

  /**
   * Creates the AudioContext inside the user-gesture task and resumes it if
   * the autoplay policy left it suspended. The graph is built once.
   */
  private async ensureAudioContext(): Promise<AudioContext | null> {
    if (!this.ctx) {
      if (typeof AudioContext === "undefined") {
        // No Web Audio support: the media element still plays on its own.
        return null;
      }
      this.ctx = new AudioContext();
      this.gain = this.ctx.createGain();
      this.gain.gain.value = this.volumeValue;
      this.eqFilters = this.settings.equalizer ? new Equalizer(this.ctx) : null;
      this.analyserRef = this.settings.analyser ? new Analyser(this.ctx) : null;
      this.source = this.ctx.createMediaElementSource(this.audio);
      this.connectGraph();
      // re-apply equalizer gains chosen before the graph existed
      this.bandGains.forEach((g, i) => {
        this.eqFilters?.changeFilterGain(i, g);
      });
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  private connectGraph(): void {
    if (!this.ctx || !this.source || !this.gain) {
      return;
    }
    const nodes: AudioNode[] = [this.source];
    if (this.eqFilters) {
      nodes.push(...this.eqFilters.filters);
    }
    nodes.push(this.gain);
    if (this.analyserRef) {
      nodes.push(this.analyserRef.analyser);
    }
    nodes.push(this.ctx.destination);
    nodes.reduce((prev, curr) => {
      prev.connect(curr);
      return curr;
    });
  }

  /**
   * Points the shared media element at the current playlist track. Keeps the
   * historical wrap-around: an out-of-range index resets to 0.
   */
  private loadCurrentTrack(): void {
    let track;
    try {
      track = this.playlist.getTrack(this.currentTrackIndex);
    } catch {
      this.currentTrackIndex = 0;
      track = this.playlist.getTrack(this.currentTrackIndex);
    }
    if (track && this.audio.src !== track.src) {
      this.audio.src = track.src;
      this.audio.load();
    }
  }
}
