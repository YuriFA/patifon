import { savePlaylist, type PlaylistRecord } from "./store";

/**
 * Inline rename: swaps the playlist row's name for an input, commits on
 * Enter/blur, cancels on Escape. `done` re-renders the list afterwards.
 */
export function startInlineRename(
  playlist: PlaylistRecord,
  list: HTMLUListElement,
  done: () => void,
): void {
  const row = list.querySelector<HTMLElement>(`li[data-pid="${playlist.id}"]`);
  const meta = row?.querySelector<HTMLElement>(".library__meta");
  if (!row || !meta) {
    return;
  }
  const input = document.createElement("input");
  input.className = "playlists__rename-input";
  input.type = "text";
  input.value = playlist.name;

  const commit = () => {
    const name = input.value.trim();
    if (name && name !== playlist.name) {
      playlist.name = name;
      void savePlaylist(playlist);
    }
    done();
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      commit();
    } else if (event.key === "Escape") {
      done();
    }
  });
  input.addEventListener("blur", commit);
  input.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  meta.replaceWith(input);
  input.focus();
  input.select();
}
