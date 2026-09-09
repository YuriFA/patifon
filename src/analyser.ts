export default class Analyser {
  readonly analyser: AnalyserNode;
  readonly fFrequencyData: Float32Array<ArrayBuffer>;

  constructor(context: AudioContext, fftSize = 2048) {
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.fFrequencyData = new Float32Array(this.analyser.frequencyBinCount);
  }

  updateData(): this {
    this.analyser.getFloatFrequencyData(this.fFrequencyData);
    return this;
  }
}
