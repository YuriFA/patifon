import type { RadioStation } from "./api";

function thumbPlaceholder(): HTMLSpanElement {
  const placeholder = document.createElement("span");
  placeholder.className = "library__thumb library__thumb_empty";
  placeholder.textContent = "\u266A";
  return placeholder;
}

export function stationTags(station: RadioStation): string {
  return station.tags
    .split(",")
    .slice(0, 3)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

/** Builds a station row matching the library row look (thumb, name, bitrate). */
export function renderStationRow(
  station: RadioStation,
  onActivate: (station: RadioStation) => void,
): HTMLLIElement {
  const row = document.createElement("li");
  row.className = "library__row radio__row";
  row.dataset.uuid = station.stationuuid;

  if (station.favicon) {
    const thumb = document.createElement("img");
    thumb.className = "library__thumb";
    thumb.src = station.favicon;
    thumb.alt = "";
    thumb.addEventListener("error", () => {
      thumb.replaceWith(thumbPlaceholder());
    });
    row.append(thumb);
  } else {
    row.append(thumbPlaceholder());
  }

  const meta = document.createElement("div");
  meta.className = "library__meta";
  meta.textContent = station.name;
  row.append(meta);

  const bitrate = document.createElement("span");
  bitrate.className = "library__duration";
  bitrate.textContent = station.bitrate > 0 ? `${station.bitrate} kbps` : "";
  bitrate.title = stationTags(station);
  row.append(bitrate);

  row.addEventListener("click", () => {
    onActivate(station);
  });

  return row;
}
