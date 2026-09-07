export default class Analyser {
  readonly analyser: AnalyserNode;
  readonly fFrequencyData: Float32Array<ArrayBuffer>;
  readonly bFrequencyData: Uint8Array<ArrayBuffer>;
  readonly bTimeData: Uint8Array<ArrayBuffer>;
  readonly fftSize: number;

  constructor(context: AudioContext, fftSize = 2048) {
    this.fftSize = fftSize;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.fFrequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.bFrequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.bTimeData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  updateData(): this {
    this.analyser.getFloatFrequencyData(this.fFrequencyData);
    this.analyser.getByteFrequencyData(this.bFrequencyData);
    this.analyser.getByteTimeDomainData(this.bTimeData);
    return this;
  }
}
