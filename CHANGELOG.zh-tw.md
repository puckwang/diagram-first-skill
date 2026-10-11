# Changelog

[English](CHANGELOG.md) | 台灣中文

本檔案記錄 diagram-first 各版本的重要變更。格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

發版方式：升 `.claude-plugin/plugin.json` 的 `version` 並在此新增對應段落，merge 到 `master` 後，使用者執行 `/plugin update` 即可取得新版本。

## [Unreleased]

## [1.1.0] - 2026-10-11

### Added

- HTML 樣板新增模式切換（自動／淺色／深色），位於標題與描述下方；「自動」跟隨系統設定。
- HTML 樣板新增 Mermaid Theme 選單，可選 `redux-color`、`redux-dark-color`、`redux`、`redux-dark`、`default`、`dark`、`neo`、`neo-dark`、`forest`、`neutral`。
- 模式與 Theme 的選擇存於 `localStorage`，下次開啟沿用。

### Changed

- 圖的預設配色由自訂紫色改為 Mermaid 內建 Theme：淺色模式 `redux-color`、深色模式 `redux-dark-color`；手動選擇 Theme 後不再跟隨模式。
- 頁面改為中性灰配色；畫布背景依 Theme 深淺調整。
- `mermaid-guide.md`：front matter 不可指定 `theme`／`themeVariables`；`classDef` 範例色改為 `#E5484D`，淺色與深色背景皆清楚。

### Removed

- HTML 頁面上方的 render 成功訊息。錯誤與 ELK 未生效警告保留。

## [1.0.0] - 2026-10-11

### Added

- diagram-first Skill 首次發佈：依內容複雜度以 ASCII 或 Mermaid（ELK 排版）HTML 附圖，並支援嵌入 README、ADR 等文件。
- `.claude-plugin/plugin.json`，支援以 Claude Code plugin 安裝，並修正 claude.ai 同步失敗。

[Unreleased]: https://github.com/puckwang/diagram-first-skill/compare/1.1.0...HEAD
[1.1.0]: https://github.com/puckwang/diagram-first-skill/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/puckwang/diagram-first-skill/releases/tag/1.0.0
