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

/**
 * Builds a station row matching the library row look (thumb, name, bitrate)
 * with a save star reflecting the station's saved state.
 */
export function renderStationRow(
  station: RadioStation,
  saved: boolean,
  onActivate: (station: RadioStation) => void,
  onToggleSave: (station: RadioStation) => void,
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

  row.append(buildStarButton(station, saved, onToggleSave));

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

function buildStarButton(
  station: RadioStation,
  saved: boolean,
  onToggleSave: (station: RadioStation) => void,
): HTMLButtonElement {
  const star = document.createElement("button");
  star.className = `radio__star${saved ? " radio__star_saved" : ""}`;
  star.type = "button";
  star.title = saved ? "Remove from saved" : "Save station";
  star.textContent = saved ? "\u2605" : "\u2606";
  star.addEventListener("click", (event) => {
    event.stopPropagation();
    onToggleSave(station);
  });
  return star;
}
