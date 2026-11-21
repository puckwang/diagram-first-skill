# Changelog

[English](CHANGELOG.md) | 台灣中文

本專案的所有重要變更都記錄在此檔案。

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)，
版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]
### Added
- 新增 `src/` 原始碼與 `scripts/build-template.mjs`：樣板由 build 產生並自動計算 CSP hash，CI 檢查一致性；樣板由約 108 KB 降到約 85 KB
- 新增匯出大小選擇（1x／2x／4x／最大），超過瀏覽器上限時自動縮小並提示實際像素
- 新增下載 PDF（高解析點陣）與列印／向量 PDF（只印目前這張圖，頁面大小符合圖）
- 新增節點上下游高亮：滑鼠移入、點擊或 Tab 到節點即高亮所有上下游，鎖定後可複製節點引用貼回對話
- 新增「複製給 Claude」問題回報：錯誤訊息、狀態列與 ⋯ 選單可一次複製錯誤、圖名、原始碼與環境資訊
- 新增卡片式匯出（圖上方加標題與一句話結論）與匯出配色（跟隨畫面／淺色／深色）
- 新增按 ? 開啟操作提示
### Changed
- 調整 HTML 頁面為無限畫布：任何縮放狀態都能以滑鼠、觸控筆或手指拖曳平移，觸控板雙指平移、捏合縮放，背景加上隨平移縮放移動的淡點陣
- 調整說明視窗預設收合成左上小卡，只顯示目前這張圖的標題與一句話結論，展開後才顯示完整說明；小卡以外的區域都可拖曳
- 調整自動符合大小改為避開小卡或展開的說明視窗，不再推擠畫布
- 調整鍵盤操作：方向鍵平移、+／− 縮放、0 符合視窗、1 原始大小；切換圖改用 PageUp／PageDown 或目錄內的 ←／→
- 調整「重設」按鈕改名為「全圖」，操作提示顯示在展開的說明視窗

## [1.3.0] - 2026-11-18
### Added
- 新增整頁全螢幕
- 新增每張圖的個別方向選單（跟隨頁面／垂直／水平）
- 新增說明視窗，顯示頁面摘要與目前這張圖的結論、圖例、原始碼
### Changed
- 調整 HTML 頁面為單圖檢視：一次一張圖撐滿視窗並自動符合大小，以目錄、‹ ›、←／→ 切換，網址同步 #diagram-N
- 調整控制項為浮動：目錄在左上，說明、設定、全螢幕在右上，工具列在下方
- 調整方向「自動」為依視窗方向：橫向轉為水平、直向轉為垂直
- 調整自動符合大小最多放大到 150%，寬螢幕時避開說明視窗，窄螢幕預設收合說明視窗
- 調整目錄與設定面板改用 Popover API，工具列改為單一 Tab 停留點並以方向鍵移動
- 調整下載、複製圖片與複製原始碼收進工具列的 ⋯ 選單，結果以提示訊息顯示
### Removed
- 移除寬度切換（寬版／標準）
### Fixed
- 修正標籤含 `<br>` 時無法匯出 PNG／JPEG／WebP，且下載的 SVG 不是合法 XML

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

[Unreleased]: https://github.com/puckwang/diagram-first-skill/compare/1.3.0...HEAD
[1.3.0]: https://github.com/puckwang/diagram-first-skill/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/puckwang/diagram-first-skill/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/puckwang/diagram-first-skill/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/puckwang/diagram-first-skill/releases/tag/1.0.0
