# Changelog

[English](CHANGELOG.md) | 台灣中文

本專案的所有重要變更都記錄在此檔案。

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，
版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

## [1.2.0] - 2026-10-12
### Added
- 新增方向切換（自動／垂直／水平），橫向螢幕自動轉為水平 (PR #5)
- 新增每張圖的縮放與平移 (PR #5)
- 新增寬度切換（寬版／標準） (PR #5)
- 新增下載選單（SVG／PNG／JPEG／WebP）與複製圖片 (PR #5)
- 新增兩張圖以上時的自動目錄 (PR #5)
- 新增 ASCII 決策樹樣板 (PR #5)
- 新增 README 的 ASCII 與 HTML 範例 (PR #5)
### Changed
- 調整 HTML 圖說為一句結論，圖例預設不寫且收合 (PR #5)
- 調整 ASCII 輸出順序為結論、圖、圖例、例外 (PR #5)
### Removed
- 移除「原始大小／符合寬度」與「下載 SVG」按鈕，改由縮放控制與下載選單取代 (PR #5)

## [1.1.0] - 2026-10-11
### Added
- 新增 HTML 樣板的模式切換（自動／淺色／深色） (PR #3)
- 新增 Mermaid Theme 選單，選擇記錄於 localStorage (PR #3)
### Changed
- 調整圖的預設配色為 Mermaid 內建 redux-color／redux-dark-color (PR #3)
- 調整頁面為中性灰配色，畫布背景依 Theme 深淺變化 (PR #3)
- 調整 mermaid-guide：front matter 不可指定 theme，classDef 範例色改為 #E5484D (PR #3)
### Removed
- 移除 HTML 頁面的 render 成功訊息 (PR #3)

## [1.0.0] - 2026-10-11
### Added
- 新增 diagram-first Skill，依複雜度以 ASCII 或 Mermaid（ELK）HTML 附圖，並支援嵌入文件 (PR #1)
- 新增 .claude-plugin/plugin.json，支援以 Claude Code plugin 安裝 (PR #2)
### Fixed
- 修正 claude.ai 同步失敗 (PR #2)

[Unreleased]: https://github.com/puckwang/diagram-first-skill/compare/1.2.0...HEAD
[1.2.0]: https://github.com/puckwang/diagram-first-skill/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/puckwang/diagram-first-skill/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/puckwang/diagram-first-skill/releases/tag/1.0.0
