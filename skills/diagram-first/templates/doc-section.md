<!--
  diagram-first 文件嵌入樣板

  使用方式（Agent 直接編輯文字）：
  - 依文件既有的標題層級調整 ###。
  - {{…}} 全部替換為文件語言的內容，不需要的區塊整段刪除。
  - Mermaid 原始碼依 references/mermaid-guide.md 撰寫；不適用 ELK 的圖種刪除 front matter。
  - ASCII 備案的使用時機見 references/doc-embedding.md 第 4 節；不需要時刪除整個 <details>。
  - 平台使用 `::: mermaid` 語法（例如 Azure DevOps Wiki）時，把 ```mermaid … ``` 換成 ::: mermaid … :::。
  - 刪除本段註解。
-->

### {{DIAGRAM_TITLE}}

{{一句話說明這張圖在表達什麼}}

```mermaid
---
config:
  layout: elk
---
{{MERMAID_SOURCE}}
```

{{圖例（選用）：用清單說明圖中的編號、縮寫或顏色}}

<details>
<summary>{{純文字版，例如：純文字版（無法顯示 Mermaid 時）}}</summary>

```text
{{ASCII_DIAGRAM}}
```

</details>
