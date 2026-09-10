import { signal } from "@preact/signals";
import { useCallback, useEffect, useState } from "preact/hooks";
import { validateToken } from "../scrobbling/api";
import { queuedListenCount, retryQueuedListens } from "../scrobbling/queue";
import {
  clearToken,
  clearUsername,
  getToken,
  isEnabledPreference,
  loadScrobblingSettings,
  setEnabled,
  setToken,
  setUsername,
} from "../scrobbling/settings";
import { usePopup } from "./popup";

/** External open requests (the recommendations connect prompt). */
export const scrobblingOpenRequest = signal(0);

function statusText(connected: boolean, enabled: boolean): string {
  if (connected && enabled) {
    return "Connected to ListenBrainz";
  }
  if (connected) {
    return "Scrobbling paused";
  }
  return "Paste your user token from listenbrainz.org";
}

function TokenRow({ onConnect }: { onConnect: (candidate: string) => void }) {
  const [token, setTokenInput] = useState("");
  return (
    <div class="scrobbling-popup__row">
      <input
        class="scrobbling-popup__token"
        type="password"
        placeholder="User token"
        autocomplete="off"
        value={token}
        onInput={(event) => setTokenInput(event.currentTarget.value)}
      />
      <button
        class="scrobbling-popup__connect"
        onClick={() => {
          const candidate = token.trim();
          if (candidate) {
            onConnect(candidate);
            setTokenInput("");
          }
        }}
      >
        Connect
      </button>
    </div>
  );
}

function ScrobblingPanel({
  connected,
  enabled,
  status,
  queueHint,
  onConnect,
  onToggle,
  onDisconnect,
}: {
  connected: boolean;
  enabled: boolean;
  status: string;
  queueHint: string;
  onConnect: (candidate: string) => void;
  onToggle: (enabled: boolean) => void;
  onDisconnect: () => void;
}) {
  return (
    <>
      <div class="scrobbling-popup__header">ListenBrainz</div>
      <TokenRow onConnect={onConnect} />
      <div class="scrobbling-popup__row">
        <label class="scrobbling-popup__toggle">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!connected}
            onChange={(event) => onToggle(event.currentTarget.checked)}
          />
          <span>Enabled</span>
        </label>
        <button class="scrobbling-popup__disconnect" onClick={onDisconnect}>
          Disconnect
        </button>
      </div>
      <div class="scrobbling-popup__status">{status}</div>
      <div class="scrobbling-popup__queue">{queueHint}</div>
    </>
  );
}

type ScrobblingActions = {
  onConnect: (candidate: string) => void;
  onToggle: (enabled: boolean) => void;
  onDisconnect: () => void;
};

function makeScrobblingActions(
  setStatus: (text: string) => void,
  refreshQueueHint: () => void,
  sync: () => void,
): ScrobblingActions {
  return {
    onConnect: (candidate) => {
      void validateToken(candidate).then((check) => {
        if (!check.valid) {
          setStatus("Token rejected by ListenBrainz");
          return;
        }
        setToken(candidate);
        if (check.username) {
          setUsername(check.username);
        }
        setStatus(statusText(true, isEnabledPreference()));
        sync();
        // a fresh token makes the whole retry queue eligible again
        retryQueuedListens();
        refreshQueueHint();
      });
    },
    onToggle: (next) => {
      setEnabled(next);
      setStatus(statusText(getToken() !== null, next));
      sync();
    },
    onDisconnect: () => {
      clearToken();
      clearUsername();
      setStatus(statusText(false, isEnabledPreference()));
      sync();
    },
  };
}

/** Connection state + actions over the scrobbling settings/api/queue modules. */
function useScrobblingState(openPopup: () => void) {
  const [state, setState] = useState(() => {
    loadScrobblingSettings();
    return { connected: getToken() !== null, enabled: isEnabledPreference() };
  });
  const [status, setStatus] = useState(() =>
    statusText(getToken() !== null, isEnabledPreference()),
  );
  const [queueHint, setQueueHint] = useState("");

  const refreshQueueHint = useCallback(() => {
    void queuedListenCount().then((count) => {
      setQueueHint(count > 0 ? `${count} listen(s) waiting to submit` : "");
    });
  }, []);

  const actions = useState(() =>
    makeScrobblingActions(setStatus, refreshQueueHint, () => {
      setState({ connected: getToken() !== null, enabled: isEnabledPreference() });
    }),
  )[0];

  useEffect(() => {
    return scrobblingOpenRequest.subscribe(() => {
      if (scrobblingOpenRequest.value > 0) {
        openPopup();
        refreshQueueHint();
      }
    });
  }, [openPopup, refreshQueueHint]);

  return {
    state,
    status,
    queueHint,
    refreshQueueHint,
    onConnect: actions.onConnect,
    onToggle: actions.onToggle,
    onDisconnect: actions.onDisconnect,
  };
}

/**
 * The scrobbling popup (Warm Earth): token connect/disconnect, the enable
 * toggle, the status line and the retry-queue hint, over the existing
 * settings/api/queue modules. Behavior is the scrobbling spec's; only the
 * surface is new.
 */
export function ScrobblingPopup() {
  const { containerRef, open, openPopup, toggle } = usePopup();
  const scrobbling = useScrobblingState(openPopup);

  useEffect(() => {
    if (open) {
      scrobbling.refreshQueueHint();
    }
  }, [open, scrobbling.state.connected, scrobbling.refreshQueueHint]);

  const on = scrobbling.state.connected && scrobbling.state.enabled;

  return (
    <div class="player-controls__scrobbling-container" ref={containerRef}>
      <button
        type="button"
        class={`player-controls__btn player-controls__btn_scrobbling${on ? " scrobbling-on" : ""}`}
        title="Scrobbling"
        aria-label="Scrobbling"
        aria-expanded={open}
        onClick={toggle}
      >
        <div class="icon" />
      </button>
      <div class={`scrobbling-popup${open ? " scrobbling-popup__open" : ""}`} hidden={!open}>
        <ScrobblingPanel
          connected={scrobbling.state.connected}
          enabled={scrobbling.state.enabled}
          status={scrobbling.status}
          queueHint={scrobbling.queueHint}
          onConnect={scrobbling.onConnect}
          onToggle={scrobbling.onToggle}
          onDisconnect={scrobbling.onDisconnect}
        />
      </div>
    </div>
  );
}
