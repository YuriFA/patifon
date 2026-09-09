# Audio Player

A client-side music player PWA: local library, internet radio, synced
lyrics, scrobbling. Single context - playback, views and persistence share
one ubiquitous language.

## Language

**View mode**:
Which one of the three exclusive views (library, radio, playlists) is
active. Entering one exits the others; library is the boot default.
_Avoid_: page, tab, screen

**Engaged source**:
The audible playback source at a moment: a library/playlist track, a radio
station, or none. At most one source is audible at a time.
_Avoid_: active player, current mode (mode is the view, not the sound)

**Source takeover**:
Stopping the previously engaged source when a new one is explicitly engaged.
Happens only on engagement, never on view mode entry.
_Avoid_: mode switch playback

**Mode entry**:
Activating a view mode. Never starts or stops audio on its own.
_Avoid_: switching source

**Transport**:
The shared play/pause/next/previous controls and their glyph. Reflects the
engaged source's state, whichever source that is.
_Avoid_: player buttons

**Station card**:
The now-playing indicator for an engaged station shown in the library view.
_Avoid_: radio badge, now playing (unqualified)
