# Changelog

English | [台灣中文](CHANGELOG.zh-tw.md)

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Add a pen: press ✎ or P for pen, highlighter, laser pointer, eraser, undo and clear; a stylus draws without switching modes; ink follows pan and zoom, can be included in exports and printing, and is not saved
- Add agent notes (`{{NOTES}}`): numbered badges next to nodes, full text in the selection bar, a list in the notes window and footnotes in card exports; the status bar warns when a note's node is missing
- Add the project version and a GitHub link at the bottom of the notes window, and include the diagram-first version in issue reports
- Add `src/` sources and `scripts/build-template.mjs`: the template is generated with the CSP hash computed automatically, and CI checks they stay in sync; the template shrinks from about 108 KB to about 85 KB
- Add an export size choice (1x / 2x / 4x / Max); exports that exceed the browser limit shrink automatically and report the actual pixels
- Add PDF download (high-resolution raster) and Print / vector PDF (current diagram only, page sized to the diagram)
- Add upstream/downstream highlighting: hover, click or Tab to a node to highlight everything it connects to; lock it to copy a node reference back into the chat
- Add "Copy for Claude" issue reports from error messages, the status bar and the ⋯ menu, with the error, diagram name, source and environment
- Add card exports (title and caption above the diagram) and export colors (as shown / light / dark)
- Add ? to open the controls hint
### Changed
- Change the HTML page to an infinite canvas: drag to pan at any zoom level with mouse, pen or touch, pan with two-finger trackpad scroll, pinch to zoom, and show a subtle dot grid that follows pan and zoom
- Change the notes window to start collapsed as a small card at top left with the current diagram's title and caption; expand it for the full notes. Everywhere outside the card can be dragged
- Change fit-to-window to avoid the card or expanded notes window instead of pushing the canvas aside
- Change keyboard controls: arrow keys pan, +/− zoom, 0 fits, 1 shows actual size; switch diagrams with PageUp/PageDown or ←/→ inside the contents menu
- Rename the "Reset" button to "Fit" and show the controls hint in the expanded notes window

## [1.4.0] - 2026-11-23
### Added
- Add a pen: pen, highlighter, laser pointer, eraser, undo and clear; a stylus draws without switching modes, ink can go beyond the diagram, follows pan and zoom, can be included in exports and printing, and is not saved (PR #8)
- Add agent notes (`{{NOTES}}`): numbered badges next to nodes, full text in the selection bar, a list in the notes window and footnotes in card exports (PR #8)
- Add upstream/downstream highlighting: hover, click or navigate nodes with the keyboard, and copy a node reference back into the chat (PR #8)
- Add "Copy for Claude" issue reports from error messages, the status bar and the ⋯ menu, with the error, diagram name, source and environment (PR #8)
- Add export size (1x / 2x / 4x / Max), card layout and export colors; exports over the browser limit shrink automatically and report the actual pixels (PR #8)
- Add PDF download and Print / vector PDF (PR #8)
- Add ? to open the controls hint, and the version with a GitHub link at the bottom of the notes window (PR #8)
- Add a page self-check that warns in the status bar when styles did not load or the title still has a placeholder (PR #8)
### Changed
- Change the HTML page to an infinite canvas: drag to pan at any zoom level, pan with two fingers on a trackpad, pinch to zoom, with a subtle dot grid (PR #8)
- Change the notes window to start collapsed as a small card that does not block dragging (PR #8)
- Change keyboard controls: arrow keys pan, +/− zoom, 0 fits, 1 shows actual size; switch diagrams with PageUp/PageDown or ←/→ inside the contents menu (PR #8)
- Rename the "Reset" button to "Fit" (PR #8)
- Change how the agent produces HTML: copy the template, find placeholders with grep and replace only those parts instead of reading the whole template (PR #8)

## [1.3.0] - 2026-11-18
### Added
- Add page fullscreen
- Add a per-diagram direction menu (Follow page / Vertical / Horizontal)
- Add a notes window with the page summary and the current diagram's caption, legend and source
### Changed
- Change the HTML page to a single-diagram view: one diagram fills the window and fits automatically; switch with the contents menu, ‹ ›, or ←/→, synced to #diagram-N
- Change the controls to float: contents at top left, notes / settings / fullscreen at top right, toolbar at the bottom
- Change the "Auto" direction to follow the window: horizontal in landscape, vertical in portrait
- Cap auto-fit at 150%, keep diagrams clear of the notes window on wide screens, and collapse the notes window by default on narrow screens
- Use the Popover API for the contents and settings panels, and make each toolbar a single Tab stop navigated with arrow keys
- Move Download, Copy image and Copy source into the toolbar's ⋯ menu, with results shown as a toast
### Removed
- Remove the width switch (Wide / Standard)
### Fixed
- Fix PNG/JPEG/WebP export failing, and downloaded SVGs being invalid XML, when labels contain `<br>`

## [1.2.0] - 2026-10-12
### Added
- Add a direction switch (Auto / Vertical / Horizontal); landscape screens turn diagrams horizontal automatically (PR #5)
- Add zoom and pan for each diagram (PR #5)
- Add a width switch (Wide / Standard) (PR #5)
- Add a download menu (SVG / PNG / JPEG / WebP) and Copy image (PR #5)
- Add a table of contents for pages with two or more diagrams (PR #5)
- Add an ASCII decision tree template (PR #5)
- Add ASCII and HTML examples to the README (PR #5)
### Changed
- Change HTML captions to a one-sentence conclusion; legends are omitted by default and collapsed (PR #5)
- Change the ASCII output order to conclusion, diagram, legend, exceptions (PR #5)
### Removed
- Remove the "Natural size / Fit width" and "Download SVG" buttons, replaced by the zoom controls and the download menu (PR #5)

## [1.1.0] - 2026-10-11
### Added
- Add a mode switch (Auto / Light / Dark) to the HTML template (PR #3)
- Add a Mermaid theme menu, remembered in localStorage (PR #3)
### Changed
- Change the default diagram colors to the built-in Mermaid redux-color / redux-dark-color themes (PR #3)
- Change the page to a neutral gray palette; the canvas background follows the theme's lightness (PR #3)
- Change mermaid-guide: front matter must not set a theme; the classDef example color is now #E5484D (PR #3)
### Removed
- Remove the render success message from the HTML page (PR #3)

## [1.0.0] - 2026-10-11
### Added
- Add the diagram-first skill, attaching ASCII or Mermaid (ELK) HTML diagrams by complexity and supporting embedding in documents (PR #1)
- Add .claude-plugin/plugin.json for installing as a Claude Code plugin (PR #2)
### Fixed
- Fix the claude.ai sync failure (PR #2)

[Unreleased]: https://github.com/puckwang/diagram-first-skill/compare/1.4.0...HEAD
[1.4.0]: https://github.com/puckwang/diagram-first-skill/compare/1.3.0...1.4.0
[1.3.0]: https://github.com/puckwang/diagram-first-skill/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/puckwang/diagram-first-skill/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/puckwang/diagram-first-skill/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/puckwang/diagram-first-skill/releases/tag/1.0.0
