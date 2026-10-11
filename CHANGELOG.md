# Changelog

English | [台灣中文](CHANGELOG.zh-tw.md)

Notable changes to diagram-first are recorded in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

How to release: bump `version` in `.claude-plugin/plugin.json` and add a matching section here. Once merged into `master`, users get the new version by running `/plugin update`.

## [Unreleased]

## [1.1.0] - 2026-10-11

### Added

- Mode switch in the HTML template (Auto / Light / Dark), placed below the title and summary. Auto follows the system setting.
- Mermaid theme menu in the HTML template: `redux-color`, `redux-dark-color`, `redux`, `redux-dark`, `default`, `dark`, `neo`, `neo-dark`, `forest`, `neutral`.
- The chosen mode and theme are saved in `localStorage` and reused next time.

### Changed

- Diagrams now use built-in Mermaid themes instead of a custom purple palette: `redux-color` in light mode and `redux-dark-color` in dark mode. Once a theme is picked manually, it no longer follows the mode.
- The page uses a neutral gray palette; the canvas background follows the theme's lightness.
- `mermaid-guide.md`: front matter must not set `theme` or `themeVariables`; the `classDef` example color is now `#E5484D`, readable on both light and dark backgrounds.

### Removed

- The render success message at the top of the HTML page. Error messages and the ELK warning remain.

## [1.0.0] - 2026-10-11

### Added

- First release of the diagram-first skill: attaches ASCII or Mermaid (ELK layout) HTML diagrams depending on complexity, and supports embedding into documents such as READMEs and ADRs.
- `.claude-plugin/plugin.json` for installing as a Claude Code plugin; fixes the claude.ai sync failure.

[Unreleased]: https://github.com/puckwang/diagram-first-skill/compare/1.1.0...HEAD
[1.1.0]: https://github.com/puckwang/diagram-first-skill/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/puckwang/diagram-first-skill/releases/tag/1.0.0
