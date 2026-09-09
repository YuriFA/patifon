import { getMode, routeSearch, setMode } from "../modes";

/**
 * The sidebar header island. It renders exactly once at boot: radio and
 * playlists keep mutating these elements directly (placeholder, visibility)
 * until their redesign waves, so the island must never re-render over them.
 */
export function SidebarHeader() {
  return (
    <>
      <button class="playlists__back" type="button" hidden>
        All playlists
      </button>
      <button
        class="library__mode-playlists"
        type="button"
        title="Toggle playlists view"
        onClick={() => setMode(getMode() === "playlists" ? "library" : "playlists")}
      >
        Playlists
      </button>
      <button
        class="library__mode"
        type="button"
        title="Toggle radio mode"
        onClick={() => setMode(getMode() === "radio" ? "library" : "radio")}
      >
        Radio
      </button>
      <input
        class="library__search"
        type="search"
        placeholder="Search library"
        autocomplete="off"
        onInput={(event) => routeSearch(event.currentTarget.value)}
      />
      <button class="library__add" type="button">
        Add files
      </button>
      <button class="library__add-dir" type="button" hidden>
        Add folder
      </button>
      <button class="playlists__new" type="button" hidden>
        New playlist
      </button>
      <input class="library__file-input" type="file" multiple accept="audio/*" hidden />
    </>
  );
}
