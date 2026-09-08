const TOKEN_KEY = "listenbrainz-token";
const ENABLED_KEY = "scrobbling-enabled";

let token: string | null = null;
let enabled = true;

export function loadScrobblingSettings(): void {
  token = localStorage.getItem(TOKEN_KEY);
  enabled = localStorage.getItem(ENABLED_KEY) !== "0";
}

export function getToken(): string | null {
  return token;
}

export function isEnabled(): boolean {
  return enabled && token !== null;
}

export function isEnabledPreference(): boolean {
  return enabled;
}

export function setToken(value: string): void {
  token = value;
  localStorage.setItem(TOKEN_KEY, value);
}

export function clearToken(): void {
  token = null;
  localStorage.removeItem(TOKEN_KEY);
}

export function setEnabled(value: boolean): void {
  enabled = value;
  localStorage.setItem(ENABLED_KEY, value ? "1" : "0");
}
