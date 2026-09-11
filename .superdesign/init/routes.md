# Routes / Modes

Single-page app, no URL router. "Screens" are exclusive modes owned by state machines:

## Sidebar modes (`src/modes.ts` - `setMode`, exactly one active)

| Mode        | Owner module          | Sidebar content                    | Transport                               |
| ----------- | --------------------- | ---------------------------------- | --------------------------------------- |
| `library`   | `src/library/ui.ts`   | track rows + recommendations block | library transport                       |
| `playlists` | `src/playlists/ui.ts` | playlist index or open playlist    | library transport                       |
| `radio`     | `src/radio/ui.ts`     | station rows (search = catalog)    | station card, LIVE badge, seek disabled |

Mode is mirrored to `bridge.mode`; the three row islands portal into the same `.library__list` and coordinate list ownership.

## Visualization-area modes (`src/visualizer/area-mode.ts` - AreaTabs)

| Mode         | Owner                          | Notes                                             |
| ------------ | ------------------------------ | ------------------------------------------------- |
| `lyrics`     | `src/lyrics/ui.ts`             | synced lines overlay; needs lyrics                |
| `vinyl`      | `src/ui/vinyl-deck.tsx`        | turntable deck; hidden while radio owns transport |
| `visualizer` | `src/visualizer/controller.ts` | 2D bars canvas or Butterchurn WebGL2              |

## Popups (over the transport bar)

- Scrobbling popup (`src/ui/scrobbling-popup.tsx`) - ListenBrainz token/settings.
- Equalizer popup (`src/ui/equalizer-popup.tsx`) - 10 band sliders + presets.
- Playlists add-track popover (`src/playlists/picker.ts`, vanilla).

## Boot sequence

`src/main.tsx`: mount islands -> feature inits -> `window.appReady = true` (e2e gate).
