import { useEffect, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { bridge } from "./bridge";
import { getMode, routeSearch, setMode } from "../modes";
import { closePlaylist, createPlaylist, playlistsRowsView } from "../playlists/ui";
import { importAudioFiles, importDirectory } from "../library/ui";
import {
  FolderPlusIcon,
  LibraryIcon,
  ListMusicIcon,
  RadioIcon,
  RadioReceiverIcon,
  SearchIcon,
} from "./icons";

const MODE_LABELS: Record<string, string> = {
  library: "Local Library",
  playlists: "Playlists",
  radio: "Radio",
};

const MODE_PLACEHOLDERS: Record<string, string> = {
  library: "Search library",
  playlists: "Search playlists",
  radio: "Search radio stations",
};

/** Add-folder needs the File System Access API; without it the action hides. */
const hasDirectoryPicker = "showDirectoryPicker" in window;

/** One latching mech button of the three-way mode switcher. */
function ModeButton({
  mode,
  active,
  title,
  onClick,
  children,
}: {
  mode: string;
  active: boolean;
  title: string;
  onClick: () => void;
  children: ComponentChildren;
}) {
  const suffix = mode === "playlists" ? "-playlists" : mode === "radio" ? "" : "-library";
  return (
    <button
      class={`mech-button sidebar__mode library__mode${suffix}${active ? " is-on" : ""}`}
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** The Patifon brand row: wordmark + the three-way mode switcher. */
function BrandRow({ mode }: { mode: string }) {
  return (
    <div class="sidebar__brand-row">
      <div class="sidebar__brand">
        <RadioReceiverIcon size={24} />
        Patifon
      </div>
      <div class="sidebar__modes" role="group" aria-label="View mode">
        <ModeButton
          mode="library"
          active={mode === "library"}
          title="Library"
          onClick={() => setMode("library")}
        >
          <LibraryIcon size={18} />
        </ModeButton>
        <ModeButton
          mode="playlists"
          active={mode === "playlists"}
          title="Playlists"
          onClick={() => setMode(getMode() === "playlists" ? "library" : "playlists")}
        >
          <ListMusicIcon size={18} />
        </ModeButton>
        <ModeButton
          mode="radio"
          active={mode === "radio"}
          title="Radio"
          onClick={() => setMode(getMode() === "radio" ? "library" : "radio")}
        >
          <RadioIcon size={18} />
        </ModeButton>
      </div>
    </div>
  );
}

/** The context eyebrow row: the active mode's label and import actions. */
function ContextRow({ mode, onAddFiles }: { mode: string; onAddFiles: () => void }) {
  return (
    <div class="sidebar__context">
      <span class="sidebar__context-label">{MODE_LABELS[mode] ?? "Local Library"}</span>
      <span class="sidebar__context-actions">
        <button class="library__add" type="button" hidden={mode !== "library"} onClick={onAddFiles}>
          <FolderPlusIcon size={16} />
          Add Files
        </button>
        <button
          class="library__add-dir"
          type="button"
          hidden={mode !== "library" || !hasDirectoryPicker}
          onClick={() => void importDirectory()}
        >
          <FolderPlusIcon size={16} />
          Add folder
        </button>
      </span>
    </div>
  );
}

/** The playlists view's sidebar actions: back to the index, create new. */
function PlaylistsActions({ mode }: { mode: string }) {
  return (
    <>
      <button
        class="playlists__back"
        type="button"
        hidden={!(mode === "playlists" && playlistsRowsView.value.kind === "tracks")}
        onClick={() => closePlaylist()}
      >
        All playlists
      </button>
      <button
        class="playlists__new"
        type="button"
        hidden={mode !== "playlists"}
        onClick={() => createPlaylist()}
      >
        New playlist
      </button>
    </>
  );
}

/**
 * The recessed search field: the placeholder follows the mode, entering
 * radio puts the caret in the field, and opening a playlist's track view
 * starts with a fresh query.
 */
function SearchField({ mode }: { mode: string }) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(
    () =>
      bridge.mode.subscribe((next) => {
        if (next === "radio") {
          searchRef.current?.focus();
        }
      }),
    [],
  );
  useEffect(() => {
    let previous = playlistsRowsView.value.kind;
    return playlistsRowsView.subscribe((view) => {
      if (previous === "index" && view.kind === "tracks" && searchRef.current) {
        searchRef.current.value = "";
        routeSearch("");
      }
      previous = view.kind;
    });
  }, []);
  return (
    <div class="sidebar__search">
      <SearchIcon size={16} />
      <input
        ref={searchRef}
        class="library__search"
        type="search"
        placeholder={MODE_PLACEHOLDERS[mode] ?? "Search library"}
        autocomplete="off"
        onInput={(event) => routeSearch(event.currentTarget.value)}
      />
    </div>
  );
}

/**
 * The sidebar header island: the Patifon brand row with the three-button
 * mode switcher, the recessed search field, and the context row. The island
 * owns its chrome end to end - the context actions, the file input, the
 * search placeholder and focus all derive from the mode and view signals,
 * and the buttons call the feature modules' exported actions.
 */
export function SidebarHeader() {
  const mode = bridge.mode.value;
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <BrandRow mode={mode} />
      <SearchField mode={mode} />
      <ContextRow mode={mode} onAddFiles={() => fileInputRef.current?.click()} />
      <PlaylistsActions mode={mode} />
      <input
        ref={fileInputRef}
        class="library__file-input"
        type="file"
        multiple
        accept="audio/*"
        hidden
        onChange={(event) => {
          const input = event.currentTarget;
          if (input.files) {
            void importAudioFiles([...input.files]);
          }
          input.value = "";
        }}
      />
    </>
  );
}
