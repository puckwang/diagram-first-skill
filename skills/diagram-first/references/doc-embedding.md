# 寫入文件

產出 Doc 前讀取本檔。目標是讓圖在文件的目標平台上正確顯示，平台不支援時也有可讀的備案。

## 1. 先觀察文件本身

動筆前先看這份文件與同一個 repo 中的其他文件：

| 觀察到的情況 | 做法 |
|---|---|
| 已有 Mermaid 圖 | 沿用相同寫法（code fence 樣式、方向、命名慣例） |
| 已有 ASCII 圖 | 簡單圖沿用 ASCII；複雜圖改用 Mermaid，並詢問使用者是否接受 |
| 已有圖片（PNG、SVG） | 詢問使用者要改用 Mermaid，還是維持圖片；維持圖片時，提供 HTML 讓使用者自行下載 SVG |
| 沒有任何圖 | 依第 2 節判斷平台 |

**文件語言優先於對話語言**：寫進文件的圖，標籤使用文件既有的語言。文件是英文時，即使使用者用中文對話，圖也用英文。

## 2. 依平台選擇格式

平台由對話內容、檔案位置或 repo 設定判斷（例如 `.github/` 代表 GitHub、`.gitlab-ci.yml` 代表 GitLab、`mkdocs.yml` 代表 MkDocs）。

| 平台 | Mermaid 支援 | 做法 |
|---|---|---|
| GitHub（README、Issue、PR、Wiki） | 支援 ` ```mermaid ` | Mermaid；附 ASCII 備案 |
| GitLab | 支援 ` ```mermaid ` | Mermaid；附 ASCII 備案 |
| Azure DevOps Wiki | 使用 `::: mermaid` … `:::` 語法 | 改用該平台語法，不用 code fence |
| Notion | 支援 Mermaid code block | Mermaid |
| Obsidian | 支援 ` ```mermaid ` | Mermaid |
| MkDocs、Docusaurus 等文件網站 | 視 plugin 設定而定 | 檢查設定檔是否已啟用 Mermaid；未啟用時詢問使用者 |
| Confluence | 不支援原生 Mermaid | 用 ASCII，或提供 HTML 讓使用者匯出 SVG 後上傳 |
| 純文字、commit message、code comment | 不支援 | 只用 ASCII |
| 不確定 | — | Mermaid 加上 ASCII 備案 |

各平台內建的 Mermaid 版本由平台決定，通常落後最新版，也不一定支援 ELK。不支援 ELK 時，`layout: elk` 會被忽略並改用預設排版，不會報錯，但排版效果會不同。寫完後請使用者在平台上預覽確認。

## 3. 圖種限制

寫入文件時只用第 1 節總表（`mermaid-guide.md`）中狀態為「穩定」的圖種：

`flowchart`、`sequenceDiagram`、`classDiagram`、`stateDiagram-v2`、`erDiagram`、`journey`、`gantt`、`pie`、`quadrantChart`、`requirementDiagram`、`gitGraph`、`mindmap`、`timeline`

beta、新、實驗圖種在平台內建的舊版 Mermaid 上很可能無法顯示。真的需要時，先告知使用者這個風險。

## 4. ASCII 備案

以下情況在 Mermaid 圖後附上 ASCII 版：

- 平台不確定
- 文件可能在終端機、純文字環境中閱讀（例如 repo 根目錄的 README）
- 使用者要求

只有在 ASCII 能畫得出來時才附（符合 `ascii-spec.md` 的上限）。畫不出來時，改附一段條列式的文字摘要，說明圖中的主要流程。

用 `<details>` 收合，避免干擾閱讀。`<details>` 在 GitHub、GitLab 可以使用；平台不支援 HTML 時，改成一般段落並標註「純文字版」。

## 5. 位置與結構

- 圖放在第一次需要它的段落之後，不要集中放在文件末尾。
- 每張圖前有一句話說明這張圖在表達什麼，圖後視需要附圖例。
- 同一份文件中，相同主題的圖使用一致的方向與命名。
- 更新既有的圖時，直接修改原本的 code block，不要在旁邊新增一張。

格式依 `templates/doc-section.md`。

## 6. 交付

寫入文件後，在對話中說明：

- 改了哪個檔案、加在哪個段落
- 用了哪種圖、是否附 ASCII 備案
- 提醒使用者在目標平台預覽，特別是使用了 ELK 設定時
