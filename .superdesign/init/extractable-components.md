# Extractable Components (Superdesign DraftComponents)

Source of truth for extraction: the Warm Earth canvas draft (`6dbe3073-c87b-42bf-ac7b-4fdd2f3342dc`) reconciled with the implemented islands below. Extract as Petite-Vue templates per COMPONENTS.md; skip trivial primitives (plain buttons, text inputs) - they stay inline in drafts.

## WaveformProgressStrip

- Source: draft progress strip + `src/ui/seek-bar.tsx` + `src/waveform/strip.ts`
- Category: layout
- Description: full-width progress track: current time left, total right, CONTINUOUS gapless area wave (SVG silhouette) spanning the entire width, played portion teal, upcoming warm gray, playhead line at position.
- Extractable props: `live` (boolean, default false)
- Hardcoded: 40px strip height, mono digits, teal/gray wave fills, playhead at 45%

## SidebarPanel

- Source: draft left panel + `index.html` `.playlist` + `src/ui/sidebar-header.tsx` + `src/ui/library-view.tsx`
- Category: layout
- Description: 340px sidebar: brand + mode switcher (Library/Playlists/Radio), search field, list of track rows, sunken background.
- Extractable props: `brand` (string), `activeMode` ("library" | "playlists" | "radio"), `searchPlaceholder` (string)
- Hardcoded: mode icons, track row anatomy, header paddings

## TrackRow

- Source: `src/ui/library-view.tsx` LibraryRow
- Category: basic
- Description: 32px artwork (or note placeholder), title/artist, duration, optional playing accent bar.
- Extractable props: `title` (string), `artist` (string), `duration` (string), `playing` (boolean, default false), `artworkUrl` (string, optional)
- Hardcoded: row paddings, 3px radius, playing state accent left border

## TransportBar

- Source: draft bottom deck + `index.html` `.bar` + `src/ui/transport-controls.tsx` + `src/ui/now-playing.tsx`
- Category: layout
- Description: 64px transport strip: prev/play/next + time readout, NOW PLAYING glass panel with title/artist + mini VU bars, volume control, EQ + Scrobble toggle buttons.
- Extractable props: `playing` (boolean, default true), `trackTitle` (string), `trackArtist` (string), `time` (string, default "01:58 / 02:57")
- Hardcoded: SVG transport glyphs, dark strip token rescoping, meter bar heights

## VolumeSlider

- Source: pending redesign of `src/ui/volume-control.tsx` (knob -> slider); draft volume area
- Category: basic
- Description: horizontal volume fader in the shared slider language: mute button + recessed 12px rail with hairline center line, teal fill, raised fader-cap thumb (14x26, teal indicator line) - same style as the pitch fader.
- Extractable props: none (static level 60)
- Hardcoded: rail thickness, cap proportions, glyph SVG

## GlassScreen

- Source: draft `.glass-screen` NOW PLAYING display + `src/ui/now-playing.tsx`
- Category: basic
- Description: inset "screen" panel: eyebrow label, one-line mono text, optional mini meter.
- Extractable props: `label` (string, default "NOW PLAYING"), `text` (string)
- Hardcoded: inset shadow, scanline feel, accent label

## VinylDeckCard

- Source: draft turntable + `src/ui/vinyl-deck.tsx` (structure + all `.vinyl-deck__*` CSS in theme.md)
- Category: layout
- Description: turntable deck card: plinth with corner screws, strobe rim, grooved vinyl, mint label, tonearm, start/stop button, pitch fader with +8/0/-8 scale.
- Extractable props: `playing` (boolean, default true), `pitch` (number -8..8, default 0)
- Hardcoded: all deck CSS values (see theme.md raw source)

## ModeTabs

- Source: draft stage corner buttons + `src/ui/area-tabs.tsx`
- Category: basic
- Description: small uppercase mono tab row (LYRICS / VINYL / VISUAL); active tab accent.
- Extractable props: `tabs` (string[] default ["LYRICS","VINYL","VISUAL"]), `active` (string, default "VINYL")
- Hardcoded: 12px uppercase letter-spaced labels, 4x10 padding

## PopupPanel

- Source: draft + `src/ui/equalizer-popup.tsx` / `src/ui/scrobbling-popup.tsx` + `.equalizer-popup` CSS
- Category: basic
- Description: floating panel anchored above a transport trigger: raised surface, accent border, caret, 0.3s max-height open.
- Extractable props: `title` (string), `open` (boolean, default true)
- Hardcoded: shadow `0 15px 30px rgba(28,27,23,.18)`, caret geometry
