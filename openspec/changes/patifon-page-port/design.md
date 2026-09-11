# patifon-page-port - Design

## Context

The app renders on canonical tokens (`design-system-in-code`), but the
page structure predates the canvas contract: `index.html` holds a 26px
`.progress` row (seek bar + LIVE badge) above a 64px dark `.bar`
(`.player-controls` with transport, now-playing, volume, scrobbling,
equalizer roots), the grid is `340px 1fr`, the strip draws separated bars
from hardcoded grays, and volume is the phase-3 rotary knob. The pixel
contract is canvas draft 6dbe3073 v7 (`/tmp/sd-drafts/v4-final.html` is
the imported source; the design system file is the readable canon).

Reference data in the draft: "Stand By Me - Ben E. King", 01:58 / 2:57 at
~45%, playing (latched play, spinning vinyl), 60% volume fader, LOCAL
LIBRARY list. The port is verified side-by-side against the live preview
URL on equivalent data.

## Goals / Non-Goals

Goals:

- Pixel parity with draft v7 at desktop sizes: regions, spacing, colors,
  shadows, textures, glyph set, states (resting/pressed/latched/hover).
- No behavior changes: modes, takeover rules, queue, scrobbling, EQ audio
  graph, peaks pipeline, persistence, keyboard/wheel semantics, e2e
  `window.*` handles all stay.
- Legacy token aliases and dark-strip machinery deleted at the end.

Non-Goals:

- New features, new modes, new persistence keys.
- Mobile/narrow layouts (the shell is desktop-first; the draft is 1440px).
- PWA app icons (backlog), Zag.js adoption.
- Radio waveform rendering (radio keeps the plain strip, 35% opacity).

## Decisions

### 1. Deck structure

`index.html` replaces `.progress` + `.bar` with one `.deck` footer:
`.deck__strip` (the strip row: current time, wave lane, total time, LIVE
badge) and `.deck__controls` (the existing island roots in the canonical
grouping: transport cluster, now-playing glass screen, then EQ/SCROB
toggles + volume group right). The grid becomes `380px 1fr` columns and
`1fr 140px` rows; `.audio_player` gets `max-width: 1440px; margin-inline:
auto;` with side hairlines and the plinth shadow. `--transport-*` tokens,
the `.bar` dark rescope, and the dark-strip styles die here.

### 2. Continuous waveform

`src/waveform/strip.ts` stops drawing separated bars and draws one
mirrored silhouette: for each device column, top and bottom edge heights
from the peaks (same data), every column touching its neighbor, played
columns `--primary`, upcoming `--wave-dim` (both read from computed
styles like today). A 2px `--primary` playhead line with the teal glow
renders at the ratio. `SeekBar` keeps owning pointer/keyboard via the
invisible range; the strip row keeps the LIVE badge and disabled-state
opacity. The time readout moves from `transport-controls.tsx`
(`TimeReadout`) into the strip row ends (current left in primary, total
right in muted), so the transport cluster is buttons-only.

### 3. Transport cluster and glass screen

`transport-controls.tsx` drops the inline `PlayGlyph/PauseGlyph/
PrevGlyph/NextGlyph` in favor of `icons.tsx` (SkipBack/Pause/Play/
SkipForward) on mech buttons: prev/next 56x56 radius 12, play 80x64
radius 16 with the latched look (accent-tint + primary glyph + pressed
shadow) while playing, 35% disabled while radio owns transport (today's
rules unchanged). `now-playing.tsx` renders the glass screen (`.glass-
screen`): eyebrow "NOW PLAYING", one truncate line "Title - Artist", the
existing VU meter at right, empty state eyebrow + muted "No source".

### 4. Volume fader

`volume-control.tsx` is rewritten on the SeekBar pattern: an invisible
native `input[type=range]` (min 0 max 1 step 0.05, `aria-label="Volume"`)
positioned over the `.fader` rail; the fill width and cap position derive
from the same signal the knob used; a 40x40 round mech mute button with
Volume/VolumeHalf/VolumeX glyphs sits left of the rail; the wheel hook
moves to the group container. The knob's angle math (`knobValueFromPoint`)
is deleted. The native input keeps pointer, keyboard (arrows 5% via
step, Home/End), and slider semantics; wheel stays +-5% clamped; mute
stays independent. Radio/live behavior unchanged.

### 5. Panel toggles and popups

EQ/SCROB toggle buttons become 56x56 mech buttons (SlidersIcon /
RadioTowerIcon + 10px uppercase sublabel), `.is-on` while open, keeping
`aria-expanded` and the shared popup hook. Popup chrome adopts the canon:
card fill, 1px `--primary` border, radius 8, `0 15px 30px
rgba(28,27,23,.18)` shadow, 10px caret pointing at the trigger. Popup
contents (band sliders, preset select, connect form, status) keep their
behavior and native controls; only the skin changes.

### 6. Sidebar

`sidebar-header.tsx` renders the brand row (RadioReceiverIcon in primary
+ "Patifon" 20px/700/+0.06em), the three-button mode switcher (mech
48x40, Library/ListMusic/Radio icons, `.is-on` for the active mode,
titles for a11y), the recessed `.search-field` (SearchIcon at 24px
offset, muted placeholder), and the context row (eyebrow "LOCAL LIBRARY"
+ Add Files action with FolderPlusIcon; the playlists/radio contexts get
their existing labels). Rows move to the TrackRow anatomy: 48px artwork
tile (radius 6, secondary fill, border, MusicIcon placeholder), title
14px (700 while playing) + artist 12px muted, right meta duration or
BarChartIcon + primary time while playing; playing row gets the 3px
primary left bar + accent-tint fill; hover on inactive rows is card fill
+ border. Station rows and playlist rows reuse the same anatomy (favicon
tile / drag handle as today). The recommendations section restyles onto
the same card/eyebrow language.

### 7. Stage

Mode tabs become text mech chips (LYRICS/VINYL/VISUAL, 11px/700/+1px,
latched via `.is-on`) keeping their exact interaction and e2e hooks. The
station card follows the canon (72px icon tile, 18px name, muted chips);
lyrics lines are 17px/1.4 muted with the active line primary + 700
(today's sync logic untouched); visualizer controls stay functional with
mech-button skin.

### 8. Vinyl deck

`vinyl-deck.tsx` syncs geometry/materials to the canon: 600x480 plinth
(radius 16, plinth shadow, four 12px screws), 380px platter with strobe
rim, 350px vinyl on the grooves texture, mint label (`--accent-tint`
fill, 3px `--fg` ring, STEREO / 33 1/3 RPM), metal-gradient tonearm with
the primary headshell (swing logic unchanged), pulsing power LED in a
32px secondary ring + toggle, round 48px start/stop mech. The pitch
fader re-renders on the shared `.fader fader_vertical` primitives
(14px rail capsule + hairline + 34x16 cap) with the +8/0/-8 mono scale
and the existing readout; the -8..+8 range, steps, and playbackRate
application are untouched.

### 9. Branding and cleanup

`<title>` and the PWA manifest (`vite.config.ts` name/short_name) become
"Patifon"; the e2e title assertion follows. The final task deletes the
`:root` alias block after every file adopts canonical names (grep audit),
then runs the full gate and a side-by-side pixel pass against the draft
preview (same track data, ~45% position) with a per-region checklist.

## Risks

- The strip rewrite risks regressing seek semantics; the invisible range
  stays the single owner of pointer/keyboard, and the waveform spec's
  seek scenarios run unchanged.
- e2e selectors span `.progress`, `.bar`, `.player-controls__*`, the knob,
  and text buttons; each region task updates its selectors in the same
  commit so the suite stays green task-by-task.
- Renaming the volume requirement (rotary -> fader) must carry the
  existing scenarios; the delta keeps the scenario set, reworded for the
  fader surface, and `openspec validate` gates the archive.
- The continuous-wave e2e asserts "no gap column" via canvas pixels on
  the seeded-wave scenario only (radio has no wave), keeping it
  deterministic.
