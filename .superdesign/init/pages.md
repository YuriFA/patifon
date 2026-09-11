# Page / View Dependency Trees

Single-screen app. The "page" is the shell; views swap inside it. Entry: `src/main.tsx`.

## Shell (always mounted)

Entry: `index.html` + `src/main.tsx`
Dependencies:

- src/ui/bridge.ts (signals; src/modes.ts, src/radio/playback.ts)
- src/ui/sidebar-header.tsx
- src/ui/seek-bar.tsx
  - src/waveform/strip.ts (vanilla canvas painter over the seek track)
    - src/waveform/peaks.ts, src/waveform/store.ts
- src/ui/transport-controls.tsx
  - src/radio/ui.ts (isStationEngaged, toggleStationPlayback)
- src/ui/now-playing.tsx
  - src/analyser.ts (shared AnalyserNode)
- src/ui/volume-control.tsx
  - src/volume.ts (setOutputVolume, setOutputMuted)
- src/ui/area-tabs.tsx
  - src/visualizer/area-mode.ts
- src/ui/scrobbling-popup.tsx
  - src/ui/popup.ts, src/scrobbling/{api,settings,queue}.ts
- src/ui/equalizer-popup.tsx
  - src/ui/popup.ts, src/equalizer.ts (PRESETS)
- src/ui/vinyl-deck.tsx
- src/ui/library-view.tsx (portal; src/library/ui.ts, src/library/store.ts, src/playlists/picker.ts, src/library/row-actions.ts)
- src/ui/radio-view.tsx (portal; src/radio/{ui,rows,api}.ts)
- src/ui/playlists-view.tsx (portal; src/playlists/{ui,store,rename}.ts)
- src/ui/recommendations-state.tsx (src/recommendations/ui.ts)
- src/styles/main.css (+ scrobbling.css, recommendations.css)

## LIBRARY mode (sidebar)

- src/ui/library-view.tsx -> src/library/ui.ts (rows snapshot, activation) -> src/library/store.ts (IndexedDB records) -> src/library/source.ts (playback queue) -> src/library/import.ts + dropzone.ts (file import)
- Recommendations block: .recommendations markup (index.html) + src/ui/recommendations-state.tsx + src/recommendations/ui.ts -> api.ts, match.ts, rows.ts

## PLAYLISTS mode (sidebar)

- src/ui/playlists-view.tsx -> src/playlists/ui.ts (rows view signal, open playlist) -> src/playlists/{store,catalog,queue,rename}.ts
- Header buttons rendered by src/ui/sidebar-header.tsx (.playlists__new, .playlists__back)

## RADIO mode (sidebar + transport)

- src/ui/radio-view.tsx -> src/radio/ui.ts -> src/radio/{api,search,session,store,rows,playback,now-playing}.ts
- Station card: .station-now markup + src/radio/now-playing.ts
- LIVE badge: .progress__live + src/radio/ui.ts toggles .progress_live

## VINYL area mode

- src/ui/vinyl-deck.tsx (self-contained; area gate via src/visualizer/area-mode.ts + bridge)

## LYRICS area mode

- src/lyrics/ui.ts -> src/lyrics/{api,lrc,store}.ts; renders into .lyrics markup

## VISUALIZER area mode

- src/visualizer/controller.ts -> columns.ts (2D bars), butterchurn.ts + types/butterchurn.d.ts (WebGL2), controls.ts (MilkDrop / Next preset buttons)

## Popups (over transport)

- src/ui/scrobbling-popup.tsx -> src/ui/popup.ts + src/scrobbling/*
- src/ui/equalizer-popup.tsx -> src/ui/popup.ts + src/equalizer.ts
