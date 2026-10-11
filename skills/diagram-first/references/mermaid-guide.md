# Mermaid 指南

產出 HTML 或 Doc 前讀取本檔。語法以 **Mermaid 12.1.0**（`templates/diagram.html` 固定的版本）為準。

## 1. 圖種總表

| 類別 | 用途 | 宣告關鍵字 | 狀態 | ELK |
|---|---|---|---|---|
| 流程 | 步驟、決策、分支 | `flowchart` | 穩定 | 適用 |
| | 跨角色、跨團隊的流程交接 | `swimlane-beta` | beta | — |
| | 使用者操作歷程與感受 | `journey` | 穩定 | — |
| | 角色與系統功能（use case） | `usecase-beta` | beta | 適用 |
| 架構 | 元件分組、系統架構、資料流 | `flowchart` + `subgraph` | 穩定 | 適用 |
| | 雲端服務、基礎設施 | `architecture-beta` | beta | — |
| | 固定格狀的區塊配置 | `block` | 新 | — |
| | C4 模型 | `C4Context`、`C4Container`、`C4Component` | 實驗 | — |
| | 目錄、檔案結構 | `treeView-beta` | beta | — |
| 互動 | 服務之間的呼叫順序 | `sequenceDiagram` | 穩定 | — |
| 狀態 | 狀態轉換、生命週期 | `stateDiagram-v2` | 穩定 | 適用 |
| 資料 | 資料表與關聯 | `erDiagram` | 穩定 | 適用 |
| | 類別、介面、繼承 | `classDiagram` | 穩定 | 適用 |
| | 封包、protocol 欄位配置 | `packet` | 新 | — |
| | 需求與追溯關係 | `requirementDiagram` | 穩定 | 適用 |
| 時間 | 時程、排程 | `gantt` | 穩定 | — |
| | 里程碑、歷史演進 | `timeline` | 穩定 | — |
| | Git 分支與合併策略 | `gitGraph` | 穩定 | — |
| 概念 | 主題拆解、腦力激盪 | `mindmap` | 穩定 | — |
| | 根因分析（魚骨圖） | `ishikawa-beta` | beta | — |
| | 集合交集 | `venn-beta` | beta | — |
| | 工作看板 | `kanban` | 新 | — |
| 數據 | 比例 | `pie` | 穩定 | — |
| | 趨勢、數值比較 | `xychart` | 新 | — |
| | 流量、能量的分配與流向 | `sankey`（節點名稱限 ASCII） | 新 | — |
| | 兩軸評估（優先順序、象限） | `quadrantChart` | 穩定 | — |
| | 多維度能力比較 | `radar-beta` | beta | — |
| | 階層占比 | `treemap-beta` | beta | — |

- **狀態**：「新」代表官方文件標示為新圖種，語法可能調整；「beta」需要 `-beta` 後綴；「實驗」代表官方文件標示警告。
- **ELK 欄**：Mermaid 12 的 `layout` 設定目前只影響 flowchart、state、class、ER、requirement、use case 等圖種；其他圖種有自己的固定版型，寫了也不會生效。
- **寫入文件時**避開 beta、新、實驗圖種，原因見 `doc-embedding.md`。

## 2. 通用規則

### 2.1 一律加上 ELK 設定

適用 ELK 的圖種（第 1 節 ELK 欄標示「適用」者），原始碼開頭一律寫上 front matter；其他圖種**不可**加，部分圖種（例如 mindmap）指定 ELK 會 render 失敗：

```
---
config:
  layout: elk
---
flowchart TD
  ...
```

Mermaid 12 的完整版已內建 ELK 並預設使用，寫出來仍有兩個好處：圖被貼到使用較舊 renderer 的平台時，仍會嘗試使用 ELK；讀者也能一眼看出這張圖的排版方式。不適用 ELK 的圖種不加。

需要微調時可以加入 ELK 選項：

```
---
config:
  layout: elk
  elk:
    mergeEdges: true
    nodePlacementStrategy: BRANDES_KOEPF
---
```

- `mergeEdges: true`：合併同方向的平行邊，fan-in 多的圖較乾淨。
- `nodePlacementStrategy`：`BRANDES_KOEPF`（預設，較緊湊）、`NETWORK_SIMPLEX`（主軸較直）、`LINEAR_SEGMENTS`、`SIMPLE`。

先不加選項，排出來不理想再調整。

### 2.2 節點 ID 與標籤

- **ID 用英文**，小寫加底線或 camelCase：`order_api`、`authCheck`。
- **標籤用使用者的語言**，一律加雙引號：`order_api["訂單 API"]`。引號可以避免括號、冒號、斜線等符號造成語法錯誤。
- **不要用 `end` 當 ID**：`end` 是保留字，會讓 flowchart 解析失敗。同理避免 `graph`、`subgraph`、`style`、`class`。
- 標籤內的雙引號寫成 `#quot;`。
- 標籤換行用 `<br>`。
- 標籤保持簡短：方框 ≤ 12 個中文字或 ≤ 24 個英文字元；細節寫在圖說或圖例。

### 2.3 方向

- `TD`（由上到下）：步驟與決策，預設使用。
- `LR`（由左到右）：資料流、pipeline、分層架構。
- 一張圖只選一個方向。

### 2.4 樣式

- 預設不加樣式，交給 HTML 樣板的主題配色。
- 需要強調語意時（例如標示錯誤路徑），用 `classDef` 定義一次再套用，不要逐一寫 `style`：

```
classDef danger stroke:#A32D2D,stroke-width:2px
fail["失敗"]:::danger
```

- 不使用 `click` 互動語法：HTML 樣板以 `securityLevel: 'strict'` 執行，`click` 會被忽略。

### 2.5 註解

用 `%%` 開頭寫註解，不會顯示在圖上。

## 3. 各圖種範例

範例標籤使用台灣中文示範 CJK 標籤的寫法；實際使用時換成使用者的語言。

### 3.1 flowchart：步驟、決策、分支

```
---
config:
  layout: elk
---
flowchart TD
  req["收到請求"] --> auth{"已登入？"}
  auth -->|是| handle["處理請求"]
  auth -->|否| login["導向登入頁"]
  handle --> ok{"成功？"}
  ok -->|是| resp["回傳結果"]
  ok -->|否| retry["重試"]
  retry --> handle
```

常用節點形狀：

| 語法 | 形狀 | 慣用意義 |
|---|---|---|
| `id["…"]` | 矩形 | 一般步驟 |
| `id("…")` | 圓角矩形 | 起點、終點 |
| `id{"…"}` | 菱形 | 決策 |
| `id[("…")]` | 圓柱 | 資料庫、儲存 |
| `id[["…"]]` | 雙邊矩形 | 子流程 |
| `id[/"…"/]` | 平行四邊形 | 輸入、輸出 |
| `id{{"…"}}` | 六角形 | 準備、設定 |

常用連線：`-->` 實線、`-.->` 虛線（非同步、選用）、`==>` 粗線（主流程）、`-->|標籤|` 帶標籤。

### 3.2 flowchart + subgraph：系統架構

```
---
config:
  layout: elk
---
flowchart LR
  subgraph edge["邊緣層"]
    lb["Load Balancer"]
  end
  subgraph app["應用層"]
    api["API Server"]
    worker["Worker"]
  end
  subgraph data["資料層"]
    db[("PostgreSQL")]
    cache[("Redis")]
  end
  lb --> api
  api --> db
  api --> cache
  api -.->|enqueue| worker
  worker --> db
```

- subgraph 的 ID 也要用英文，標籤寫在 `["…"]` 內。
- subgraph 巢狀最多 2 層。

### 3.3 swimlane-beta：跨角色流程

```
swimlane-beta LR
  subgraph requester["申請人"]
    start(["開始"]) --> submit["送出申請"]
  end
  subgraph approver["主管"]
    review{"核准？"}
  end
  subgraph it["IT"]
    grant["開通權限"]
  end
  submit --> review
  review -->|是| grant
  review -->|否| submit
```

每條泳道是一個 `subgraph`，跨泳道的連線寫在所有 subgraph 之後。

### 3.4 journey：使用者歷程

```
journey
  title 首次使用流程
  section 註冊
    填寫表單: 3: 使用者
    驗證 Email: 2: 使用者, 系統
  section 上手
    完成教學: 4: 使用者
    建立第一個專案: 5: 使用者
```

格式為 `任務: 滿意度(1–5): 參與者`。

### 3.5 usecase-beta：角色與功能

```
---
config:
  layout: elk
---
usecase-beta
  actor User
  actor Admin
  User --> login("登入")
  User --> order("下單")
  Admin --> report("查看報表")
```

### 3.6 architecture-beta：雲端與基礎設施

```
architecture-beta
  group cloud(cloud)[雲端環境]
  service gateway(internet)[API Gateway] in cloud
  service app(server)[應用服務] in cloud
  service db(database)[資料庫] in cloud
  service storage(disk)[物件儲存] in cloud
  gateway:R --> L:app
  app:R --> L:db
  app:B --> T:storage
```

- 內建圖示只有 `cloud`、`database`、`disk`、`internet`、`server`。
- 連線要指定兩端的方向：`L`、`R`、`T`、`B`。

### 3.7 block：固定格狀配置

```
block
  columns 3
  web["Web"] api["API"] db["資料庫"]
  web --> api
  api --> db
```

`columns` 決定每列的格數，適合需要固定位置、不想交給自動排版的配置圖。

### 3.8 C4Context：C4 模型

```
C4Context
  title 訂單系統情境圖
  Person(user, "使用者", "在網站下單")
  System(order, "訂單系統", "處理訂單與付款")
  System_Ext(payment, "金流服務", "第三方")
  Rel(user, order, "下單")
  Rel(order, payment, "請款")
```

官方標示為實驗性質，版面控制有限。一般架構圖優先用 3.2。

### 3.9 treeView-beta：目錄結構

```
treeView-beta
  my-project/
    src/
      api/
      db/
    tests/
    README.md
```

目錄名稱以 `/` 結尾，用縮排表示層級。簡單的目錄結構也可以直接用 ASCII 樹狀圖。

### 3.10 sequenceDiagram：呼叫順序

```
sequenceDiagram
  autonumber
  participant C as Client
  participant A as API
  participant D as DB
  C->>A: 送出訂單
  A->>D: 檢查庫存
  D-->>A: 庫存數量
  alt 庫存不足
    A-->>C: 409 Conflict
  else 庫存足夠
    A->>D: 寫入訂單
    A-->>C: 201 Created
  end
```

- `->>` 同步請求、`-->>` 回應、`-)` 非同步訊息。
- `autonumber` 自動編號，方便在說明中引用。
- 條件用 `alt … else … end`，迴圈用 `loop … end`，平行用 `par … and … end`。
- `Note over A,D: 說明` 加註解。

### 3.11 stateDiagram-v2：狀態轉換

```
---
config:
  layout: elk
---
stateDiagram-v2
  state "待付款" as Pending
  state "已付款" as Paid
  state "已出貨" as Shipped
  state "已取消" as Cancelled
  [*] --> Pending
  Pending --> Paid: 付款成功
  Pending --> Cancelled: 逾時未付
  Paid --> Shipped: 出貨
  Shipped --> [*]
  Cancelled --> [*]
```

狀態名稱用 `state "標籤" as Id` 宣告，ID 保持英文。

### 3.12 erDiagram：資料表與關聯

```
---
config:
  layout: elk
---
erDiagram
  USER ||--o{ ORDER : "下單"
  ORDER ||--|{ ORDER_ITEM : "包含"
  USER {
    uuid id PK
    string email
  }
  ORDER {
    uuid id PK
    uuid user_id FK
    timestamp created_at
  }
  ORDER_ITEM {
    uuid order_id FK
    int quantity
  }
```

基數符號：`||` 恰好一個、`o|` 零或一個、`}|` 一或多個、`}o` 零或多個。

### 3.13 classDiagram：類別與介面

```
---
config:
  layout: elk
---
classDiagram
  class IRepository {
    <<interface>>
    +Find(id) Order
    +Save(order) void
  }
  class OrderRepository {
    -db DbContext
    +Find(id) Order
    +Save(order) void
  }
  IRepository <|.. OrderRepository
  OrderRepository --> DbContext
```

關係符號：`<|--` 繼承、`<|..` 實作、`-->` 關聯、`*--` 組合、`o--` 聚合、`..>` 依賴。

### 3.14 packet：封包欄位

```
packet
  +16: "Source Port"
  +16: "Destination Port"
  +32: "Sequence Number"
  +32: "Acknowledgment Number"
```

`+n` 表示該欄位佔 n 個 bit，依序排列。

### 3.15 requirementDiagram：需求追溯

```
---
config:
  layout: elk
---
requirementDiagram
  requirement login_req {
    id: 1
    text: "使用者可用 Email 登入"
    risk: medium
    verifymethod: test
  }
  element login_api {
    type: service
  }
  login_api - satisfies -> login_req
```

### 3.16 gantt：時程

```
gantt
  title 上線時程
  dateFormat YYYY-MM-DD
  section 開發
    API 實作 :a1, 2026-10-12, 10d
    前端整合 :a2, after a1, 7d
  section 上線
    壓力測試 :b1, after a2, 3d
    正式上線 :milestone, m1, after b1, 0d
```

日期與工期必須來自對話內容，不可自行假設。

### 3.17 timeline：演進

```
timeline
  title 專案演進
  2024 : v1 上線
  2025 : 導入 RAG : 多模型路由
  2026 : Agent 平台
```

同一時間點的多個事件用 `:` 串接。

### 3.18 gitGraph：分支策略

```
gitGraph
  commit
  branch feature
  checkout feature
  commit
  commit
  checkout main
  merge feature
  commit
```

### 3.19 mindmap：主題拆解

```
mindmap
  root(("快取策略"))
    讀取
      Cache-aside
      Read-through
    寫入
      Write-through
      Write-back
```

用縮排表示層級。mindmap 使用自己的排版引擎（cose-bilkent），**不可加 `layout: elk`**，指定 ELK 會導致 render 失敗。

### 3.20 ishikawa-beta：根因分析

```
ishikawa-beta
  API 回應變慢
    程式
      N+1 query
      缺少 index
    基礎設施
      DB CPU 滿載
      網路延遲
    流量
      尖峰時段
```

第一行是要分析的問題，縮排的各行是原因分類與子原因。這是新圖種，若解析失敗請改用 3.19 mindmap 呈現相同內容。

### 3.21 venn-beta：集合交集

```
venn-beta
  title 好功能的條件
  set Desirable["使用者想要"]
  set Feasible["技術可行"]
  set Viable["商業可行"]
  union Desirable,Feasible["做得出來"]
  union Desirable,Feasible,Viable["值得做"]
```

### 3.22 kanban：工作看板

```
kanban
  todo["待辦"]
    t1["撰寫規格"]
  doing["進行中"]
    t2["實作 API"]
  done["完成"]
    t3["設計 schema"]
```

欄位與卡片都要有英文 ID，卡片縮排在欄位之下。

### 3.23 pie：比例

```
pie title 錯誤來源
  "Timeout" : 42
  "5xx" : 31
  "驗證失敗" : 27
```

### 3.24 xychart：趨勢與數值

```
xychart
  title "每月請求量"
  x-axis ["一月", "二月", "三月", "四月"]
  y-axis "請求數（萬）" 0 --> 100
  bar [30, 45, 60, 80]
  line [30, 45, 60, 80]
```

### 3.25 sankey：流向分配

```
sankey

Gateway,Cache,60
Gateway,LLM,40
LLM,Small model,25
LLM,Large model,15
```

每行為 `來源,目標,數值` 的 CSV；含逗號的名稱加雙引號。

**節點名稱只能用 ASCII 字元**：Mermaid 12.1.0 的 sankey 解析器不接受中文、日文等非 ASCII 文字，加引號也無效。使用者語言不是英文時：

- 節點用簡短英文命名，在圖說或圖例中用使用者的語言說明每個節點；或
- 節點不多時，改用 `flowchart LR` 加上帶數值的連線標籤（例如 `llm -->|25| small["小模型"]`）呈現相同的流向。

### 3.26 quadrantChart：兩軸評估

```
quadrantChart
  title 功能優先順序
  x-axis 低成本 --> 高成本
  y-axis 低效益 --> 高效益
  quadrant-1 值得投資
  quadrant-2 優先執行
  quadrant-3 有空再做
  quadrant-4 重新評估
  Feature A: [0.3, 0.8]
  Feature B: [0.7, 0.6]
  Feature C: [0.2, 0.3]
```

象限編號：`quadrant-1` 右上、`quadrant-2` 左上、`quadrant-3` 左下、`quadrant-4` 右下。座標範圍 0 到 1。

### 3.27 radar-beta：多維度比較

```
radar-beta
  title 方案比較
  axis perf["效能"], cost["成本"], ops["維運"], dx["開發體驗"]
  curve a["方案 A"]{4, 3, 2, 5}
  curve b["方案 B"]{3, 5, 4, 3}
  max 5
```

### 3.28 treemap-beta：階層占比

```
treemap-beta
"後端"
    "API": 40
    "Worker": 20
"前端"
    "Web": 30
    "Mobile": 10
```

## 4. 數據類圖表的資料來源

`pie`、`xychart`、`sankey`、`quadrantChart`、`radar-beta`、`treemap-beta`、`gantt` 的數值必須來自對話、檔案或工具結果。沒有數據時，不畫數據圖，改用文字說明或請使用者提供數據；不可編造數字讓圖看起來完整。

## 5. 解析失敗時的排查

HTML 樣板會在頁面上顯示錯誤訊息，使用者回報後依序檢查：

| 症狀 | 常見原因 | 修正 |
|---|---|---|
| 第一行就報錯 | 圖種關鍵字錯誤，或 beta 後綴不符 | 對照第 1 節總表；仍失敗時嘗試加上或去掉 `-beta` |
| 某個節點附近報錯 | 標籤含特殊符號卻沒加引號 | 標籤一律用 `["…"]` |
| `end` 附近報錯 | 用了保留字當 ID | 改成 `done`、`finish` 等 |
| front matter 報錯 | `---` 前有空行或縮排 | `---` 必須在第一行且不縮排 |
| 中文標籤被截斷或重疊 | 字型尚未載入就 render | 樣板已等待字型載入；仍發生時縮短標籤 |
| 頁面只有標題與圖說，沒有狀態列、按鈕和圖，也沒有錯誤訊息 | 樣板的 `<script type="module">` 或 CSP 被改動，程式被 CSP 擋下 | 重新複製 `templates/diagram.html`，只替換佔位符 |
| 頁面顯示 ELK 未生效 | 樣板的 Mermaid 版本被改動 | 確認版本為 12.1.0 的完整版，不可使用 tiny 版 |
| `Cannot read properties of null` 之類的 render 錯誤 | 對不適用 ELK 的圖種（例如 mindmap）指定了 `layout: elk` | 只在第 1 節 ELK 欄標示「適用」的圖種加 ELK 設定 |
| sankey 在中文名稱處報錯 | sankey 只接受 ASCII 節點名稱，加引號也無效 | 節點改用英文並以圖例說明，或改用 `flowchart LR`（見 3.25） |

修正兩次仍失敗，改用穩定圖種重畫相同內容（例如 beta 圖種改用 `flowchart` 或 `mindmap`）。

## 6. 一份 HTML 多張圖

總覽圖加子圖時，全部放在同一份 HTML：每張圖一個 `<section class="diagram">`，依「總覽 → 子圖」的順序排列，子圖標題註明對應總覽圖中的哪個區塊。
