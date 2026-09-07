import { validateInRange } from "./utils";

const MIN_DB = -12;
const MAX_DB = 12;

export interface EqualizerPreset {
  name: string;
  data: number[];
}

export const PRESETS: EqualizerPreset[] = [
  { name: "Acoustic", data: [5, 5, 4, 1, 2, 2, 3, 4, 3, 2] },
  { name: "Bass Booster", data: [6, 5, 4, 3, 2, 0, 0, 0, 0, 0] },
  { name: "Bass Reducer", data: [-6, -5, -4, -3, -2, 0, 0, 0, 0, 0] },
  { name: "Classical", data: [5, 4, 3, 2, -1, -1, 0, 1, 3, 4] },
  { name: "Dance", data: [4, 6, 5, 0, 2, 3, 5, 4, 3, 0] },
  { name: "Deep", data: [5, 3, 2, 1, 3, 2, 1, -2, -4, -5] },
  { name: "Electronic", data: [4, 4, 1, 0, -2, 2, 1, 2, 4, 5] },
  { name: "Hip-Hop", data: [5, 3, 1, 3, -1, -1, 1, -1, 2, 3] },
  { name: "Jazz", data: [4, 3, 1, 2, -1, -1, 0, 1, 3, 4] },
  { name: "Latin", data: [5, 3, 0, 0, -1, -1, -1, 0, 3, 5] },
  { name: "Loudness", data: [6, 4, 0, 0, -2, 0, -1, -5, 4, 1] },
  { name: "Lounge", data: [-3, -2, -1, 1, 4, 3, 0, -1, 2, 1] },
  { name: "Piano", data: [3, 2, 0, 2, 3, 1, 3, 5, 3, 4] },
  { name: "Pop", data: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
  { name: "R&B", data: [2, 7, 6, 1, -2, -1, 2, 3, 3, 4] },
  { name: "Rock", data: [5, 4, 3, 2, -1, -2, 0, 2, 3, 4] },
  { name: "Small Speakers", data: [5, 4, 3, 2, 1, 0, -2, -3, -4, -5] },
  { name: "Spoken Word", data: [-4, -1, 0, 1, 3, 5, 5, 4, 2, 0] },
  { name: "Treble Booster", data: [0, 0, 0, 0, 0, 1, 2, 3, 4, 5] },
  { name: "Treble Reducer", data: [0, 0, 0, 0, 0, -1, -2, -3, -4, -5] },
  { name: "Vocal Booster", data: [-1, -3, -3, 1, 4, 4, 3, 1, 0, -1] },
];

const FREQUENCIES = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];

export default class Equalizer {
  readonly filters: BiquadFilterNode[] = [];
  readonly presets: EqualizerPreset[] = PRESETS;
  readonly frequencies: readonly number[] = FREQUENCIES;

  constructor(context: AudioContext) {
    this.filters = FREQUENCIES.map((frequency) => {
      const filter = context.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = frequency;
      filter.Q.value = 1;
      filter.gain.value = 0;
      return filter;
    });
    this.filters.reduce((prev, curr) => {
      prev.connect(curr);
      return curr;
    });
  }

  changeFilterGain(id: number, value: number): this {
    const filter = this.filters[id];
    if (filter) {
      filter.gain.value = validateInRange(value, MIN_DB, MAX_DB);
    }
    return this;
  }

  getFilterGain(id: number): number | null {
    const filter = this.filters[id];
    return filter ? filter.gain.value : null;
  }

  applyPreset(preset: EqualizerPreset): this {
    preset.data.forEach((gain, i) => {
      this.changeFilterGain(i, gain);
    });
    return this;
  }
}
