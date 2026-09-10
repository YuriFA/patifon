# Tasks: redesign-phase-3

## 1. Popup pattern

- [ ] 1.1 Popup hook/shared component: toggle on button activation,
  `aria-expanded`, Escape close, outside pointer-down close, opening one
  popup closes the other; token-styled popup panel styles. Verify:
  `npm run typecheck` green; e2e covers toggle/Escape/outside.

## 2. Equalizer popup

- [ ] 2.1 `EqualizerPopup` island: ten native vertical band sliders
  (-12..+12, step 1, per-band `aria-label`), preset select applying
  `player.applyPreset` and moving sliders, live `changeBandGain` on input;
  delete the static markup and the `main.tsx` wiring block (seek bar's
  `RangeSlider` untouched). Verify: `npm run test:e2e` band/preset scenarios.

## 3. Scrobbling popup

- [ ] 3.1 `ScrobblingPopup` island over `scrobbling/settings` + `api` +
  `queue`: token connect/disconnect, enable toggle, status line, queue
  hint; delete static markup and element-query wiring; keep
  `openScrobblingPopup` export working for the recommendations prompt.
  Verify: `npm run test:e2e` scrobbling popup suite.

## 4. Volume knob

- [ ] 4.1 Knob widget in the volume island: `role="slider"`, 0..100
  `aria-valuenow`, pointer drag mapped by angle (pure `angleFromEvent`
  helper), wheel and keyboard steps unchanged, mute button untouched;
  restyle to the draft's knob. Verify: `npm run test:e2e` volume suite
  (wheel, keyboard, mute) without semantic rewrites.

## 5. Radio view

- [ ] 5.1 `RadioView` island for station rows (results, saved, pinned
  playing station with save star) fed by signals from the existing
  catalog/saved-stations modules; delete `renderStations`-family DOM
  builders; restyle the `.station-now` card to tokens. Verify:
  `npm run test:e2e` radio suites (search, play, takeover, save star).

## 6. Playlists view

- [ ] 6.1 `PlaylistsView` island using the shared row primitives: index,
  open playlist tracks, reorder/remove/rename/queue via the existing
  `playlists/*` modules; `refreshPlaylistsView` becomes a signal write.
  Verify: `npm run test:e2e` playlists suites.

## 7. Recommendations section

- [ ] 7.1 `Recommendations` island (state + rows from signals): loading,
  error with retry, connect prompt (opens the scrobbling popup), save and
  play actions via existing modules; delete the static container markup.
  Verify: `npm run test:e2e` recommendations suites (degraded states).

## 8. Verification

- [ ] 8.1 Full matrix `npm run lint && npm run typecheck &&
  npm run format:check && npm run build && npm run test:e2e`. Verify:
  exit 0.
- [ ] 8.2 Debt sweep + visual pass: no phase-0 hex values outside `:root`
  in component styles; visual check of radio, playlists, recommendations,
  both popups, and the knob against the Warm Earth theme. Verify:
  screenshots noted in the session summary.
