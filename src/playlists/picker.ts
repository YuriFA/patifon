import { makePlaylist, savePlaylist, addTrackToPlaylist } from "./store";
import { findInCatalog, getCatalog, setCatalog } from "./catalog";

/**
 * "Add to playlist" row action: a small popover listing existing playlists
 * plus a create-new action. The popover lives inside the row and closes on
 * an outside click or on a completed action.
 */
export function createAddToPlaylistButton(trackId: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "library__row-action playlists__add";
  button.type = "button";
  button.title = "Add to playlist";
  button.textContent = "+";
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const popover = button.nextElementSibling;
    if (popover instanceof HTMLElement && popover.classList.contains("playlists__popover")) {
      popover.remove();
      return;
    }
    openPicker(button, trackId);
  });
  return button;
}

function openPicker(button: HTMLButtonElement, trackId: string): void {
  const popover = document.createElement("div");
  popover.className = "playlists__popover";

  for (const playlist of getCatalog()) {
    popover.append(
      pickerItem(playlist.name, () => {
        addTrackToPlaylist(playlist, trackId);
        close();
      }),
    );
  }
  popover.append(
    pickerItem("New playlist", () => {
      const playlist = makePlaylist();
      playlist.trackIds.push(trackId);
      const catalog = getCatalog();
      setCatalog([...catalog, playlist]);
      void savePlaylist(playlist);
      close();
    }),
  );

  button.insertAdjacentElement("afterend", popover);
  // Deferred listener: the opening click must not close the popover itself.
  window.setTimeout(() => {
    window.addEventListener("click", close, { once: true });
  }, 0);
}

function pickerItem(label: string, onPick: () => void): HTMLButtonElement {
  const item = document.createElement("button");
  item.className = "playlists__popover-item";
  item.type = "button";
  item.textContent = label;
  item.addEventListener("click", (event) => {
    event.stopPropagation();
    onPick();
  });
  return item;
}

function close(): void {
  document.querySelectorAll(".playlists__popover").forEach((popover) => {
    popover.remove();
  });
}

export { findInCatalog };
