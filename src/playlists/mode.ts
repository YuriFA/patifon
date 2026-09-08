/** Single-active-view flag for the playlists view, shared without import cycles. */
let playlistsMode = false;

export function isPlaylistsMode(): boolean {
  return playlistsMode;
}

export function setPlaylistsMode(active: boolean): void {
  playlistsMode = active;
}
