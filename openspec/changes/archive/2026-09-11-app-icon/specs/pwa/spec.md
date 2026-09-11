# Delta: pwa

## MODIFIED Requirements

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
