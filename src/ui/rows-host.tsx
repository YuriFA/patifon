import { bridge } from "./bridge";
import { LibraryRows } from "./library-view";
import { PlaylistsRows } from "./playlists-view";
import { RadioRows } from "./radio-view";

/**
 * The shared list region's owner: renders the active view's rows island plus
 * its empty hint, switching on the mode signal. Preact unmounts the previous
 * view's island before mounting the next one, so the handover - exactly one
 * list replacement per mode switch, no lingering rows - is the framework's
 * job, not a hook's.
 */
export function RowsHost() {
  const mode = bridge.mode.value;
  if (mode === "radio") {
    return <RadioRows />;
  }
  if (mode === "playlists") {
    return <PlaylistsRows />;
  }
  return <LibraryRows />;
}
