import { signal } from "@preact/signals";
import type { SpectrumStyle } from "./spectrum";

const STYLE_STORAGE_KEY = "spectrum-style";

/** The selected spectrum style, persisted in localStorage; LCD is default. */
export const spectrumStyle = signal<SpectrumStyle>(
  localStorage.getItem(STYLE_STORAGE_KEY) === "led" ? "led" : "lcd",
);

export function setSpectrumStyle(style: SpectrumStyle): void {
  spectrumStyle.value = style;
  localStorage.setItem(STYLE_STORAGE_KEY, style);
}
