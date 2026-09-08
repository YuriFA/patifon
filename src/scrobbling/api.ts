import { getToken } from "./settings";

const API_ROOT = "https://api.listenbrainz.org";

function authHeaders(token: string): HeadersInit {
  return { "Content-Type": "application/json", Authorization: `Token ${token}` };
}

export interface SubmittedListen {
  track: string;
  artist: string;
  album: string | null;
  /** ISO 8601 timestamp of when the track was listened to (single listens only). */
  listenedAt: string;
}

export type SubmitResult =
  | { ok: true }
  | { ok: false; retryable: boolean; retryAfterMs: number | null };

/** Checks a user token against the API; false also for network-unreachable servers. */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_ROOT}/1/validate-token`, {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}

function submitBody(listen: SubmittedListen, listenType: "single" | "playing_now"): string {
  const trackMetadata: Record<string, string> = {
    track_name: listen.track,
    artist_name: listen.artist,
  };
  if (listen.album) {
    trackMetadata.album_name = listen.album;
  }
  const payload: Record<string, unknown> = { track_metadata: trackMetadata };
  if (listenType === "single") {
    payload.listened_at = listen.listenedAt;
  }
  return JSON.stringify({ listen_type: listenType, payload: [payload] });
}

/**
 * Submits one listen. `playing_now` failures are transient by nature and
 * come back as retryable: false with the queue dropping them.
 */
export async function submitListen(
  listen: SubmittedListen,
  listenType: "single" | "playing_now",
): Promise<SubmitResult> {
  const token = getToken();
  if (!token) {
    return { ok: false, retryable: false, retryAfterMs: null };
  }
  let response: Response;
  try {
    response = await fetch(`${API_ROOT}/1/submit-listens`, {
      method: "POST",
      headers: authHeaders(token),
      body: submitBody(listen, listenType),
    });
  } catch {
    return { ok: false, retryable: true, retryAfterMs: null };
  }
  if (response.ok) {
    return { ok: true };
  }
  if (response.status === 429) {
    const retryAfterSeconds = Number(response.headers.get("Retry-After"));
    const retryAfterMs =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : null;
    return { ok: false, retryable: true, retryAfterMs };
  }
  // 401/400: a bad token or malformed payload will never succeed on retry
  return { ok: false, retryable: response.status >= 500, retryAfterMs: null };
}
