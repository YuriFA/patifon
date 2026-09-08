const TOKEN_KEY = "listenbrainz-token";
const ENABLED_KEY = "scrobbling-enabled";
const USERNAME_KEY = "listenbrainz-username";

let token: string | null = null;
let enabled = true;
let username: string | null = null;

export function loadScrobblingSettings(): void {
  token = localStorage.getItem(TOKEN_KEY);
  enabled = localStorage.getItem(ENABLED_KEY) !== "0";
  username = localStorage.getItem(USERNAME_KEY);
}

export function getToken(): string | null {
  return token;
}

export function getUsername(): string | null {
  return username;
}

export function setUsername(value: string): void {
  username = value;
  localStorage.setItem(USERNAME_KEY, value);
}

export function clearUsername(): void {
  username = null;
  localStorage.removeItem(USERNAME_KEY);
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
