import { stationTags } from "./rows";
import type { RadioStation } from "./api";

/**
 * Station card shown in the visualization area while a station plays: the
 * visualizer only draws for library playback (radio bypasses the graph).
 */
export interface NowPlayingElements {
  root: HTMLElement;
  icon: HTMLImageElement;
  iconEmpty: HTMLElement;
  name: HTMLElement;
  tags: HTMLElement;
}

export function queryNowPlaying(root: HTMLElement): NowPlayingElements {
  return {
    root,
    icon: root.querySelector<HTMLImageElement>(".station-now__icon")!,
    iconEmpty: root.querySelector<HTMLElement>(".station-now__icon-empty")!,
    name: root.querySelector<HTMLElement>(".station-now__name")!,
    tags: root.querySelector<HTMLElement>(".station-now__tags")!,
  };
}

export function showNowPlaying(elements: NowPlayingElements, station: RadioStation): void {
  if (station.favicon) {
    elements.icon.src = station.favicon;
    elements.icon.hidden = false;
    elements.iconEmpty.hidden = true;
  } else {
    elements.icon.hidden = true;
    elements.iconEmpty.hidden = false;
  }
  elements.name.textContent = station.name;
  elements.tags.textContent = stationTags(station);
  elements.root.hidden = false;
}

export function hideNowPlaying(elements: NowPlayingElements): void {
  elements.root.hidden = true;
}
