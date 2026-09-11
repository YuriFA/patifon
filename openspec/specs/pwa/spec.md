# pwa Specification

## Purpose

Installable, offline-capable app: the player boots without a network once
visited, plays the imported library offline, and its library storage is
protected from eviction.

## Requirements

### Requirement: Installable standalone app

The system SHALL be installable as a standalone application: the page SHALL
reference a valid web manifest with application name, standalone display mode,
theme color and an app icon, and the manifest and icon SHALL be served
by the app itself.

The manifest SHALL declare the Warm Earth surface color `#f6f2ec` as both
`theme_color` and `background_color`, and SHALL provide exactly two icons:
an `any`-purpose icon rendering the full app tile artwork and a `maskable`
icon whose artwork stays inside the maskable safe zone (the central 80%).

#### Scenario: Manifest and icon are served

- **WHEN** the app is opened
- **THEN** the document references a web manifest and the manifest and its icon resolve to same-origin resources

#### Scenario: Manifest matches the Warm Earth surface

- **WHEN** the web manifest is fetched
- **THEN** `theme_color` and `background_color` are `#f6f2ec`

#### Scenario: Both icon purposes resolve

- **WHEN** the web manifest is fetched
- **THEN** it declares exactly two icons with purposes `any` and `maskable`, and both resolve to same-origin resources

### Requirement: Offline app shell

After the first visit, the system SHALL boot and render the full interface
with the network unavailable: no request to the network is needed to reach a
working interface. The app shell SHALL be self-contained (no third-party
runtime assets).

#### Scenario: Reload while offline

- **WHEN** the user reloads the page after the first visit with the network unavailable
- **THEN** the interface renders and the player is usable

### Requirement: Offline library playback

The imported library SHALL remain playable with the network unavailable:
tracks previously imported and persisted reload and play while offline.

#### Scenario: Play an imported track while offline

- **WHEN** the network is unavailable and the user activates a previously imported track
- **THEN** the track plays and the playing row is highlighted

### Requirement: Persistent storage request

The system SHALL request persistent storage at startup so the browser does
not evict the persisted library (audio blobs, metadata, artwork) under
storage pressure.

#### Scenario: Persistent storage is requested

- **WHEN** the application starts
- **THEN** the application calls the persistent-storage request API
