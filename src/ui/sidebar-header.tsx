import type { ComponentChildren } from "preact";
import { bridge } from "./bridge";
import { getMode, routeSearch, setMode } from "../modes";
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

/**
 * The sidebar header island: the Patifon brand row with the three-button
 * mode switcher, the recessed search field, and the context eyebrow row.
 * The mode switcher derives its latched state from the mode signal; the
 * placeholder and the hidden buttons are still mutated directly by the
 * radio/playlists modules (their vdom props here stay static, so renders
 * never clobber those mutations).
 */
export function SidebarHeader() {
  const mode = bridge.mode.value;

  return (
    <>
      <BrandRow mode={mode} />
      <div class="sidebar__search">
        <SearchIcon size={16} />
        <input
          class="library__search"
          type="search"
          placeholder="Search library"
          autocomplete="off"
          onInput={(event) => routeSearch(event.currentTarget.value)}
        />
      </div>
      <div class="sidebar__context">
        <span class="sidebar__context-label">{MODE_LABELS[mode] ?? "Local Library"}</span>
        <span class="sidebar__context-actions">
          <button class="library__add" type="button">
            <FolderPlusIcon size={16} />
            Add Files
          </button>
          <button class="library__add-dir" type="button" hidden>
            <FolderPlusIcon size={16} />
            Add folder
          </button>
        </span>
      </div>
      <button class="playlists__back" type="button" hidden>
        All playlists
      </button>
      <button class="playlists__new" type="button" hidden>
        New playlist
      </button>
      <input class="library__file-input" type="file" multiple accept="audio/*" hidden />
    </>
  );
}
