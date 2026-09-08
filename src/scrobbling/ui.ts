import type AudioPlayer from "../audio-player";
import { validateToken } from "./api";
import { initScrobblingTracker, type ScrobblingDeps } from "./listens";
import { queuedListenCount, retryQueuedListens } from "./queue";
import {
  clearToken,
  getToken,
  isEnabledPreference,
  loadScrobblingSettings,
  setEnabled,
  setToken,
} from "./settings";

interface PopupElements {
  button: HTMLDivElement;
  popup: HTMLDivElement;
  tokenInput: HTMLInputElement;
  connectButton: HTMLButtonElement;
  disconnectButton: HTMLButtonElement;
  toggleInput: HTMLInputElement;
  statusLine: HTMLDivElement;
}

function queryPopupElements(): PopupElements {
  return {
    button: document.querySelector<HTMLDivElement>(".player-controls__btn_scrobbling")!,
    popup: document.querySelector<HTMLDivElement>(".scrobbling-popup")!,
    tokenInput: document.querySelector<HTMLInputElement>(".scrobbling-popup__token")!,
    connectButton: document.querySelector<HTMLButtonElement>(".scrobbling-popup__connect")!,
    disconnectButton: document.querySelector<HTMLButtonElement>(".scrobbling-popup__disconnect")!,
    toggleInput: document.querySelector<HTMLInputElement>(".scrobbling-popup__toggle input")!,
    statusLine: document.querySelector<HTMLDivElement>(".scrobbling-popup__status")!,
  };
}

function renderState(el: PopupElements): void {
  const connected = getToken() !== null;
  const enabled = isEnabledPreference();
  el.button.classList.toggle("scrobbling-on", connected && enabled);
  el.toggleInput.checked = enabled;
  el.toggleInput.disabled = !connected;
  if (connected && enabled) {
    el.statusLine.textContent = "Connected to ListenBrainz";
  } else if (connected) {
    el.statusLine.textContent = "Scrobbling paused";
  } else {
    el.statusLine.textContent = "Paste your user token from listenbrainz.org";
  }
}

function refreshQueueHint(): void {
  void queuedListenCount().then((count) => {
    const hint = document.querySelector<HTMLDivElement>(".scrobbling-popup__queue")!;
    hint.textContent = count > 0 ? `${count} listen(s) waiting to submit` : "";
  });
}

function wireConnect(el: PopupElements): void {
  el.connectButton.addEventListener("click", () => {
    const candidate = el.tokenInput.value.trim();
    if (!candidate) {
      return;
    }
    el.connectButton.disabled = true;
    el.statusLine.textContent = "Checking token...";
    void validateToken(candidate).then((valid) => {
      el.connectButton.disabled = false;
      if (!valid) {
        el.statusLine.textContent = "Token rejected by ListenBrainz";
        return;
      }
      setToken(candidate);
      el.tokenInput.value = "";
      renderState(el);
      // a fresh token makes the whole retry queue eligible again
      retryQueuedListens();
    });
  });
}

function wireToggle(el: PopupElements): void {
  el.toggleInput.addEventListener("change", () => {
    setEnabled(el.toggleInput.checked);
    renderState(el);
  });
}

function wireDisconnect(el: PopupElements): void {
  el.disconnectButton.addEventListener("click", () => {
    clearToken();
    renderState(el);
  });
}

/**
 * Scrobbling control: a bar button plus popup (the equalizer-popup pattern)
 * owning token connect/disconnect, the enable toggle, and the status line.
 */
export function initScrobbling(player: AudioPlayer, deps: ScrobblingDeps): void {
  loadScrobblingSettings();
  initScrobblingTracker(player, deps);
  const el = queryPopupElements();
  el.button.addEventListener("click", (event) => {
    event.preventDefault();
    el.popup.classList.toggle("scrobbling-popup__open");
    refreshQueueHint();
  });
  wireConnect(el);
  wireToggle(el);
  wireDisconnect(el);
  renderState(el);
}
