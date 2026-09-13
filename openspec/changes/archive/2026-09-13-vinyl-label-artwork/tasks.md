# Tasks: vinyl-label-artwork

## 1. Data path

- [x] 1.1 Add `trackArtworkUrl: signal<string | null>` to the bridge and write it in `syncNowPlaying` from `libraryArtworkUrl(currentRecord())` (null when no record or no artwork). Verify: `npm run typecheck` green.

## 2. Deck rendering

- [x] 2.1 In `src/ui/vinyl-deck.tsx`, render `bridge.trackArtworkUrl` in the label: with artwork, an `img.vinyl-deck__label-art` (decorative `alt=""`) plus the spindle hole; without, the existing STEREO/33⅓ RPM spans plus the hole, unchanged. Add the `.vinyl-deck__label-art` rule in `src/styles/main.css` (absolute inset 0, circular, `object-fit: cover`). Verify: manual pass in dev - play a tagged MP3 in VINYL mode, cover fills the label and spins; an artless track shows the placeholder.

## 3. Late enrichment

- [x] 3.1 In `src/library/ui.ts`, after enrichment persists the Blob, write `bridge.trackArtworkUrl` with the record's URL so the label swaps without a track change. Verify: manual pass - play an artless tagged track in dev with network, cover appears on the label after the fetch lands.

## 4. E2e coverage

- [x] 4.1 Scenarios in `e2e/vinyl.spec.ts`: a track with embedded artwork shows `img.vinyl-deck__label-art` on the label (spindle hole still present); an artless track keeps the STEREO/RPM placeholder with no label image; mocked catalog enrichment replaces the placeholder after playback starts; switching to another artless track restores the placeholder. Verify: `npx playwright test e2e/vinyl.spec.ts` green.

## 5. Verification

- [x] 5.1 Full matrix: `npm run lint && npm run typecheck && npm run format:check && npm run build && npm run test:e2e`. Verify: exit 0.
