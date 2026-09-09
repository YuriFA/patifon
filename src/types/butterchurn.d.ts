// Both packages ship UMD bundles without TypeScript declarations. Their
// export shape depends on the CJS/ESM interop of the consuming bundler, so
// the declarations describe both possible surfaces and
// src/visualizer/butterchurn.ts resolves whichever one is present at runtime.

declare module "butterchurn" {
  export interface ButterchurnVisualizer {
    connectAudio(audioNode: AudioNode): void;
    loadPreset(preset: unknown, blendTime?: number): void;
    render(options?: unknown): void;
    setRendererSize(width: number, height: number, options?: unknown): void;
    toDataURL(): string;
  }

  export interface ButterchurnFactory {
    createVisualizer(
      audioContext: AudioContext,
      canvas: HTMLCanvasElement,
      options: { width: number; height: number },
    ): ButterchurnVisualizer;
  }

  const interop: ButterchurnFactory | { default: ButterchurnFactory };

  export default interop;
}

declare module "butterchurn-presets" {
  export function getPresets(): Record<string, unknown>;

  const defaultInterop: { getPresets(): Record<string, unknown> };

  export default defaultInterop;
}
