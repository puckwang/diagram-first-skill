---
name: diagram-first
description: 文不如圖——任何時候，只要 Agent 的說明涉及步驟、分支、元件關係、狀態轉換、呼叫順序、時序或數據比較，就主動附上圖來幫助使用者理解，不需等使用者要求。簡單圖以 ASCII 直接放入對話；複雜圖以 Mermaid（ELK 排版）輸出成本機 HTML，或嵌入使用者的文件。使用者明確要求畫流程圖、架構圖、示意圖、diagram、flowchart、sequence diagram 時當然也使用。
---

# Diagram First

文不如圖。在任何回應中，只要一張圖能讓使用者更快理解 Agent 的描述，就用最少的成本畫出正確、好讀的圖。

## 何時用圖

**主動觸發**：不需使用者要求，回應中出現以下任一情況就用圖：

- 3 個以上有先後順序的步驟
- 有分支、條件或回流的邏輯
- 3 個以上元件之間的關係（架構、依賴、資料流）
- 狀態轉換、生命週期
- 多方之間的呼叫或訊息順序
- 時程、演進、版本歷史
- 需要比較的數據

**不用圖**：

- 回答只有一兩句話，或是單一事實
- 圖的資訊量不比文字多（例如只有兩個節點、一條線）
- 同一段對話中已經畫過、且內容沒有改變的圖
- 使用者表明不要圖

拿不準時，問自己：「把這段文字刪掉、只看圖，使用者能理解嗎？」能，就畫。

## 原則

- **圖是輔助**：圖不取代解釋，但解釋寫在對話中。HTML 頁面以看圖為主，每張圖只附一句話圖說，圖例非必要不寫（見 `references/mermaid-guide.md` 2.6）。
- **不打斷主要任務**：圖服務於回應的內容，畫圖本身不能成為回應的重點，除非使用者要求的就是圖。
- **不使用程式**：不執行任何 script。唯一允許的指令是開啟瀏覽器。
- **不手寫 SVG 座標**：排版交給 ASCII 樣板或 Mermaid 的 ELK 引擎。
- **語言跟隨使用者**：圖中標籤、圖例、說明使用使用者的對話語言；技術名詞（API、cache、Method 等）保留原文。Mermaid 節點 ID 一律用英文。

## 流程

### Step 1：判斷輸出目標

| 情況 | 目標 |
|---|---|
| 使用者要求寫入或更新文件（README、ADR、設計文件、`.md` 檔等），或對話正在編輯某份文件 | **Doc** → Step 3 |
| 其他情況：在對話中向使用者說明 | 進入 Step 2 |

判斷細節見 `references/routing.md`。

### Step 2：判斷複雜度（僅限對話說明）

**全部符合**才算簡單，使用 **ASCII**：

- 節點 ≤ 5
- 每個分支點的出口 ≤ 3
- 沒有交叉線
- 沒有回流（回到前面步驟的邊）
- 單一主軸方向

ASCII 只畫流程、分層架構、樹狀結構、決策樹與簡單 sequence，各自的上限見 `references/routing.md` 第 3 節。決策樹（巢狀條件、每條路徑各自走到結果、無合流）不受上面「節點 ≤ 5」的限制，改用它自己的上限。其他情況一律使用 **HTML**。

**拆圖規則**：節點 > 15，或包含多個獨立子流程時，先拆成「總覽圖＋子圖」，每張圖再各自回到 Step 2 判斷。

### Step 3：選擇圖種

依說明的內容選擇。下表為常用對照，完整的 28 種圖種、宣告關鍵字、範例與 ELK 適用性見 `references/mermaid-guide.md`：

| 內容 | Mermaid 圖種 |
|---|---|
| 步驟、決策、分支 | `flowchart` |
| 系統架構、元件分組、資料流 | `flowchart` + `subgraph` |
| 跨角色、跨團隊的流程交接 | `swimlane-beta` |
| 雲端服務、基礎設施 | `architecture-beta` |
| 服務之間的呼叫順序 | `sequenceDiagram` |
| 狀態轉換、生命週期 | `stateDiagram-v2` |
| 資料表與關聯 | `erDiagram` |
| 類別、介面、繼承 | `classDiagram` |
| 時程、里程碑、分支策略 | `gantt`、`timeline`、`gitGraph` |
| 主題拆解、根因分析 | `mindmap`、`ishikawa-beta` |
| 比例、趨勢、流向、象限、多維比較 | `pie`、`xychart`、`sankey`、`quadrantChart`、`radar-beta` |

數據類圖表的數值必須來自對話或工具結果，不可編造。

### Step 4：產出

**ASCII**
1. 讀取 `references/ascii-spec.md`。
2. 從樣板庫選最接近的樣板，替換文字，不從零排版。
3. 依規範逐行自檢。
4. 放在 ` ```text ` code block 中，下方附圖例。

**HTML**
1. 讀取 `references/mermaid-guide.md`，寫出 Mermaid 原始碼；適用 ELK 的圖種加上 `layout: elk` 的 front matter。
2. 讀取 `templates/diagram.html`，依檔內說明替換佔位符；多張圖放在同一份 HTML。圖說一句話寫結論，圖例依 `mermaid-guide.md` 2.6 判斷是否需要。
3. 寫入檔案：使用者指定的路徑優先；否則寫到目前工作目錄的 `diagrams/<主題>.html`。
4. 開啟瀏覽器：macOS 用 `open`，Linux 用 `xdg-open`，Windows 用 `start ""`。開啟失敗時不重試，直接告知路徑。
5. 沒有本機檔案系統時，依 `references/routing.md` 第 2 節改用 Artifact、傳送檔案，或提供 Mermaid code block。

**Doc**
1. 讀取 `references/doc-embedding.md` 與 `templates/doc-section.md`。
2. 遵循該文件既有的格式、慣例與語言；寫進文件的圖，標籤使用文件的語言。
3. 只用穩定圖種，嵌入 Mermaid code block，適用時含 ELK 設定。
4. 依 `doc-embedding.md` 的規則決定是否附上 ASCII 備案。

### Step 5：交付

- 只說明圖的重點與檔案位置，不在對話中貼出 HTML 原始碼。
- HTML 交付後提醒使用者：若頁面上方出現錯誤或警告訊息，請回報。Agent 看不到 render 結果。
- 寫入文件後，提醒使用者在目標平台預覽。

## 禁止事項

- ASCII 框內不放非 ASCII 字元（中文、日文、全形符號）；這類標籤放在框外右側或圖例。
- ASCII 圖有編號或縮寫時，不省略圖例。
- 不為了塞進一張圖而超過複雜度上限。
- 不修改 HTML 樣板中的 Mermaid 版本與程式；不使用未固定版本的 CDN 網址，也不使用不含 ELK 的 tiny 版。
- 不編造數據。

## 檔案索引

| 檔案 | 何時讀取 |
|---|---|
| `references/routing.md` | 輸出目標或複雜度難以判斷時 |
| `references/ascii-spec.md` | 產出 ASCII 前 |
| `references/mermaid-guide.md` | 產出 HTML 或 Doc 前 |
| `references/doc-embedding.md` | 產出 Doc 前 |
| `templates/diagram.html` | 產出 HTML 時 |
| `templates/doc-section.md` | 產出 Doc 時 |
