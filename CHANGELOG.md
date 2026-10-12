# Changelog

English | [台灣中文](CHANGELOG.zh-tw.md)

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/puckwang/diagram-first-skill/compare/1.2.0...HEAD
[1.2.0]: https://github.com/puckwang/diagram-first-skill/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/puckwang/diagram-first-skill/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/puckwang/diagram-first-skill/releases/tag/1.0.0
