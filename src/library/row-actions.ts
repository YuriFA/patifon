import { queueNext } from "../playlists/queue";
import { queueContext } from "./source";
import type { LibraryRecord } from "./store";

export function createPlayNextButton(record: LibraryRecord): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "library__row-action library__row-next";
  button.type = "button";
  button.title = "Play next";
  button.textContent = "\u21B3";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    queueNext(record, queueContext);
  });
  return button;
}
