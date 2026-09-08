/**
 * Client for the public ListenBrainz playlists API: the "created for you"
 * playlists (Weekly Jams, Weekly Exploration, ...) and their track lists.
 * No Authorization header: both endpoints are public; CORS is open.
 * https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html
 */

const API_ROOT = "https://api.listenbrainz.org";

const PLAYLIST_MBID_RE =
  /listenbrainz\.org\/playlist\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/iu;

export interface RecommendationPlaylist {
  mbid: string;
  title: string;
  /** ISO date from the playlist metadata, null when absent. */
  date: string | null;
}

export interface RecommendationTrack {
  title: string;
  /** JSPF "creator": the track's artist credit. */
  artist: string;
  album: string | null;
  /** Milliseconds; 0 when unknown. */
  durationMs: number;
}

export interface RecommendationPlaylistDetails extends RecommendationPlaylist {
  tracks: RecommendationTrack[];
}

async function getJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`ListenBrainz unreachable: ${String(error)}`, { cause: error });
  }
  if (!response.ok) {
    throw new Error(`ListenBrainz responded HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

export async function fetchCreatedFor(username: string): Promise<RecommendationPlaylist[]> {
  const data = (await getJson(
    `${API_ROOT}/1/user/${encodeURIComponent(username)}/playlists/createdfor`,
  )) as {
    playlists?: Array<{
      playlist?: { identifier?: unknown; title?: unknown; date?: unknown };
    }>;
  };
  const entries = Array.isArray(data.playlists) ? data.playlists : [];
  return entries.flatMap((entry) => {
    const playlist = entry?.playlist;
    const identifier = typeof playlist?.identifier === "string" ? playlist.identifier : "";
    const mbid = PLAYLIST_MBID_RE.exec(identifier)?.[1];
    const title = typeof playlist?.title === "string" ? playlist.title : "";
    if (!playlist || !mbid || !title) {
      return [];
    }
    return [
      {
        mbid,
        title,
        date: typeof playlist.date === "string" ? playlist.date : null,
      },
    ];
  });
}

export async function fetchPlaylistDetails(mbid: string): Promise<RecommendationPlaylistDetails> {
  const data = (await getJson(`${API_ROOT}/1/playlist/${mbid}`)) as {
    playlist?: {
      title?: unknown;
      date?: unknown;
      track?: Array<Record<string, unknown>>;
    };
  };
  const playlist = data?.playlist;
  if (!playlist) {
    throw new Error(`ListenBrainz playlist ${mbid} has unexpected shape`);
  }
  const rawTracks = Array.isArray(playlist.track) ? playlist.track : [];
  const tracks = rawTracks.map((track) => ({
    title: typeof track.title === "string" ? track.title : "",
    artist: typeof track.creator === "string" ? track.creator : "",
    album: typeof track.album === "string" ? track.album : null,
    durationMs: typeof track.duration === "number" ? track.duration : 0,
  }));
  return {
    mbid,
    title: typeof playlist.title === "string" ? playlist.title : "",
    date: typeof playlist.date === "string" ? playlist.date : null,
    tracks,
  };
}
