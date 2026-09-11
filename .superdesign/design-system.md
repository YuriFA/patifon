# Patifon - Warm Earth Design System

Source of truth for the Patifon audio player UI. Canvas drafts AND application code
must derive every visual decision from this file. The reference direction is the
"Warm Earth Hi-Fi Audio Player" canvas draft (superdesign project "music player",
draft 6dbe3073) with the owner-approved amendments: brand "Patifon", full-width
waveform progress strip, horizontal volume slider, system mono type.

## Product context

Client-side web audio player (PWA, no backend): local library (drag-drop import,
tag parsing), internet radio, synced lyrics, ListenBrainz scrobbling/recommendations,
10-band equalizer, waveform seek strip, visualizers (2D bars, MilkDrop) and a vinyl
turntable view. One screen: sidebar list + visualization stage + waveform strip +
transport deck. The design language is a warm-analog hi-fi unit: cream chassis,
one teal accent, mechanical push buttons, glass display windows, real vinyl.

Brand: **Patifon** (capitalized wordmark, mono, bold, wide tracking). Voice: honest
hardware labels, uppercase mono eyebrows ("NOW PLAYING", "LOCAL LIBRARY"), no
marketing gradients, no glassmorphism beyond inset "screens".

## Foundations

### Color

Warm beige chassis, near-black ink, ONE teal accent. No other hues except the
destructive red reserved for destructive confirmations.

| Token       | Value   | Role                                             |
| ----------- | ------- | ------------------------------------------------ |
| bg          | #f6f2ec | app background, stage                            |
| card        | #fffdf9 | raised panels: sidebar, plinth, footer deck      |
| secondary   | #f0e9dd | button fills, sunken inputs, recessed tracks     |
| border      | #e8e0d4 | hairlines everywhere                             |
| accent-tint | #d9efec | latched/active button fill, played waveform tint |
| fg          | #221d16 | primary ink                                      |
| muted       | #8a8072 | secondary ink, placeholders, dim bars            |
| primary     | #0f766e | THE teal: play state, fills, playhead, focus     |
| destructive | #b91c1c | destructive confirmations only                   |
| metal-light | #f0eeec | metal thumb gradient start                       |
| metal-base  | #d1d5db | metal thumb mid                                  |
| metal-dark  | #9ca3af | metal thumb gradient end, tick rings             |
| vinyl       | #1a1a1a | record disc (#111 in groove stripes)             |

Contrast rules: fg on bg/card/secondary always; primary only for interactive/live
state or eyebrow labels on light surfaces; muted never below 12px for body text.

### Typography

Single family: the system mono stack
`ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`.
No webfonts (PWA, zero external dependencies). All text is mono - the hi-fi
readout character comes from case and tracking, not from a second family.

Scale (mono sizes): 9px eyebrow (700, +1.5px tracking, uppercase) / 10px badge
& scale labels (700, +1px tracking) / 11-12px buttons, tabs, durations, meta /
13px body rows and inputs / 14-16px row titles / 18-20px brand, station names /
24px+ display numerals (deck readouts).

### Spacing, sizing, radius

4px base grid. Layout metrics: sidebar 380px; footer deck 140px; waveform strip
row 40px inside the deck; transport buttons prev/next 56x56, play 80x64; panel
toggles 56x56; brand row and search field paddings 24px/8px.

Radius: 4px small controls / 6px mech buttons, inputs / 8px rows, panel toggles /
12-16px raised cards (transport buttons xl) / 16px+ plinth (2xl) / 50% knobs,
thumbs, circular buttons.

### Shadows & materials (the mechanical language)

| Token            | Value                                                                | Use                  |
| ---------------- | -------------------------------------------------------------------- | -------------------- |
| mech-btn         | `0 2px 4px rgba(34,29,22,.08), inset 0 1px 1px rgba(255,255,255,.9)` | resting push button  |
| mech-btn-pressed | `inset 0 2px 4px rgba(34,29,22,.12), 0 1px 1px rgba(255,255,255,.7)` | pressed/latched      |
| deck             | `0 -4px 15px rgba(34,29,22,.04), inset 0 2px 0 rgba(255,255,255,.6)` | footer deck top edge |
| panel            | `inset 0 0 20px rgba(34,29,22,.02), 0 4px 12px rgba(34,29,22,.04)`   | inset side panels    |
| screen           | `inset 0 0 15px rgba(34,29,22,.15), 0 0 5px rgba(15,118,110,.15)`    | glass readouts       |
| plinth           | `inset 0 0 30px rgba(34,29,22,.02), 0 12px 25px rgba(34,29,22,.06)`  | turntable card       |

Textures: brushed-metal deck wash `linear-gradient(90deg,#f0e9dd,#fffdf9 50%,#f0e9dd)`
at ~40% multiply over the footer; display scanlines `repeating-linear-gradient(0deg,
rgba(15,118,110,.04) 0 1px, transparent 1px 2px)` at 50-60% inside glass screens;
vinyl grooves `repeating-radial-gradient(circle, #1a1a1a 0 2px, #111 3px 4px)`;
strobe rim `repeating-conic-gradient(from 1deg, #ebe7da 0 3deg, #dedac9 3deg 7.5deg)`.

### States & focus

Resting: raised (mech-btn) with top inset highlight. Press (active): swap to
mech-btn-pressed + translate-y 1px + instant 75ms transition. Latched/on:
mech-btn-pressed + accent-tint fill + primary/40 border + primary icon. Hover
(non-latching): ink brightens muted -> fg, no shadow change. Disabled: 35%
opacity, no hover fill. Focus-visible: 2px primary outline, 1px offset, every
control without exception. Disabled live sources: whole strip 35% + LIVE badge.

### Motion

Turntable platter `spin 4s linear infinite` while playing (paused otherwise);
status LED `pulse 2s` with teal glow; popup open max-height 0.1s -> 0.3s;
tonearm swing 0.25s ease-out; lyric line color 0.15s; deck press scale .96/1px
drop. Nothing else animates - hardware does not bounce.

## Layout

App shell: fills the viewport exactly - full width up to 1440px centered, full
height (`h-screen`), no page scroll at any desktop viewport; every region flexes
(the stage absorbs leftover height), only inner lists scroll. Side hairline
borders, plinth-level page shadow. Row 1 (flex-1): sidebar 380px (card bg, right
hairline, inset panel shadow) + stage (bg, centered content, mode tabs pinned
top-right 24px). Row 2: transport deck - one footer card 140px tall, deck shadow
on top edge, brushed-metal wash, containing the waveform strip row (40px, bottom
hairline) and the controls row (flex-1, evenly grouped).

Sidebar anatomy top to bottom: brand row (Patifon + mode switcher) / search
field / context row ("LOCAL LIBRARY" eyebrow + action link) / rows list.

## Components

### MechButton

The universal push control. secondary fill, border, 6px radius, mech-btn shadow,
icon 18-20px or 10px uppercase mono label; variants: square icon (40x48px),
icon+sublabel (56x56, e.g. EQ/SCROB), text chip (LYRICS/VINYL/VISUAL, 4x10px
padding). Latched variant adds accent-tint fill + primary ink. Never place on
card without border.

### SearchField

secondary recessed fill, border, inner shadow, 6px radius, search glyph left
(24px offset), mono 13-14px placeholder in muted.

### ModeSwitcher

Three latching MechButtons (icons: library, list-music, radio). Exactly one
latched at a time; latched = accent-tint + primary icon.

### TrackRow

Full-width row: 3px primary left bar + accent-tint fill when playing; 48px
artwork tile (secondary fill, 6px radius, border; muted note glyph when empty)
/ title (mono 14, 700 when playing) + artist (12, muted) / right meta: duration
or live bar-chart glyph + time in primary. Hover (inactive): card fill + border
appear. Row height ~64px, 6-8px radius, 12px gap, 12px padding.

### WaveformProgressStrip (AMENDED - full width, continuous)

The seek surface across the entire deck: 40px tall row = time current (mono 12,
primary, 700, w-12) + waveform lane (flex-1) + time total (mono 12, muted,
right-aligned, w-12). The waveform is a CONTINUOUS, GAPLESS area wave spanning
the lane edge to edge - a mirrored silhouette around the lane's center line
(every sample column touches the next; no bars, gaps, or rounding), like a real
rendered waveform. Played portion primary teal, upcoming warm gray #c9c1b0;
2px primary playhead line with subtle teal glow at the exact ratio; the lane is
a fully translucent drag surface (native range semantics in code). Live/radio:
wave hidden, row 35% opacity, "LIVE" badge top-right (10px, primary border chip).

### TransportControls

prev / play-pause / next MechButtons: 56x56 (radius 12-16) / play 80x64 with
latched look while playing (accent-tint + primary glyph + soft glow). Glyphs:
lucide skip-back, pause, skip-forward, stroke 2, 24-28px. Prev/next disabled
(35%) while radio owns transport.

### GlassScreen

The readout window: card fill, border, screen inset shadow + scanline overlay,
primary ink, mono. Standard instance = NOW PLAYING (9px eyebrow, one truncate
line "Title - Artist") + MiniVUMeter right. Empty state: eyebrow + muted
"No source".

### MiniVUMeter

5-7 vertical bars (4-6px wide, 2px gap, 2px radius) in primary, animated only
while audio plays; static baseline heights otherwise.

### Sliders - one fader language (volume, pitch, EQ bands)

All sliders share the mixer-fader anatomy: a RECESSED rail (light #f1eee2 fill,
#ddd8c9 border, inner shadow, full radius, 12px thick; a 2px hairline runs
along the rail's center) plus a RAISED fader-cap thumb (light gradient
#fbfaf5 -> #e8e3d3, #cfc9b8 border, `0 1px 3px rgba(72,66,50,.3)` shadow) whose
teal 2px indicator line crosses the cap. Orientation decides the cap's
proportions: horizontal cap 14x26px (volume), vertical cap 34x16px (pitch),
round 16px thumb on the EQ band sliders (bipolar -12..+12). Volume is unipolar:
teal fill runs from the rail start to the thumb. Pitch is bipolar: no fill, the
hairline continues behind the cap, +8/0/-8 mono labels sit beside the rail.

### VolumeSlider

Deck right group: mute MechButton (40x40, round, lucide volume icon: full/half/mute
variants) + horizontal volume fader per the slider language above, 150px rail,
cap rides at the level. Wheel over the whole group adjusts +-5%; keyboard arrows
5%, Home/End 0/100. Muted: fill hidden, glyph crossed. No knobs, no rotation.

### PanelToggles

EQ and SCROB MechButtons (56x56, icon + 10px uppercase sublabel), latched while
their popup is open. Scrobble connected state: latched look + primary ink.

### PopupPanel

Floating card above its trigger: card fill, primary 1px border, radius 8px,
`0 15px 30px rgba(28,27,23,.18)` shadow, 10px caret pointing to the trigger,
opens 0.3s from the anchor. Contents: EqualizerPopup (10 vertical band sliders
-12..+12 dB, 60Hz..16kHz labels, dB legend, preset select) or ScrobblingPopup
(token password field + Connect, Enabled checkbox, Disconnect, status line,
queue hint "N listen(s) waiting to submit").

### EqualizerBandSlider

Vertical slider 32px wide x ~136px: recessed track 6px (muted fill), primary
fill from center-0dB up/down, 16px round white thumb, band label under (10px).

### ModeTabs

Three text MechButton chips pinned top-right of the stage: LYRICS / VINYL /
VISUAL. Latched = accent-tint + primary ink. Switches the stage owner.

### VinylDeckCard

Stage centerpiece, 600x480 card (radius 2xl, plinth shadow, card fill): four
12px inset screw dots in corners; platter 380px (strobe rim + 350px grooved
vinyl spinning 4s while playing; mint label #d9efec (accent-tint) ringed dark, "STEREO" 9px +
"33 1/3 RPM" 14px + 14px center hole); tonearm assembly top-right (metal pivot,
counterweight, wand, primary headshell) swinging 18deg->30deg with progress;
bottom-left: strobe power dot (pulse LED in 32px secondary ring + toggle) and
round start/stop button (48px); right edge: vertical pitch fader per the slider
language above (recessed 14px rail capsule + center hairline, wide 34x16 fader
cap with teal line, +8/0/-8 mono scale, mono readout).

### StationRow / StationCard

Radio rows share TrackRow anatomy: favicon tile or note glyph, station name,
save star (muted -> primary when saved), "128 kbps" duration slot; broken row:
55% opacity + "unavailable" tag. Radio engaged: stage shows StationCard centered
(72px icon tile, 18px name, muted tag chips).

### LyricsView

Centered column overlay, 40px top padding, 20% side padding: lines 17px/1.4
muted; active line primary + 700 (karaoke sync); empty state muted 13px.

## Iconography

lucide via iconify-icon, stroke 2, 18-28px, currentColor: radio-receiver (brand
mark), library, list-music, radio, search, folder-plus, music, bar-chart-2,
skip-back, pause, skip-forward, volume-2/volume-1/volume-x, sliders-horizontal,
radio-tower. No other icon sets, no emoji glyphs in chrome.

## Tailwind token map (canvas drafts embed this config)

```js
colors: {
  'earth-bg': '#f6f2ec', 'earth-fg': '#221d16', 'earth-card': '#fffdf9',
  'earth-primary': '#0f766e', 'earth-secondary': '#f0e9dd', 'earth-muted': '#8a8072',
  'earth-border': '#e8e0d4', 'earth-accent': '#d9efec', 'earth-destructive': '#b91c1c',
  'metal-light': '#f0eeec', 'metal-dark': '#9ca3af', 'metal-base': '#d1d5db',
  'vinyl-base': '#1a1a1a',
}
```

## Do / Don't

- DO keep exactly one teal accent; everything else is beige/ink/metal.
- DO use mono everywhere; hierarchy via size, case, tracking, weight.
- DO give every interactive control a pressed state that moves 1px down.
- DO draw sliders in the one fader language: recessed rail + hairline + raised
  cap with teal indicator line.
- DON'T introduce new hues, gradients (except the three listed textures), or
  webfonts; DON'T use dark surfaces for the transport deck - the deck is light
  card with the metal wash; DON'T draw the waveform as separated sticks - it is
  one continuous gapless wave.
