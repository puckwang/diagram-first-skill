// diagram-first 檢視頁程式。由 scripts/build-template.mjs 去除註解後內嵌到 skills/diagram-first/templates/diagram.html，並自動計算 CSP 的 sha256。
//
// 頁面為單圖檢視：一次顯示一張圖並撐滿視窗、自動符合大小，其餘介面都由程式產生並浮在圖上：
// - 左上：目錄（依各圖 <h2> 產生）。兩張圖以上時可用下拉清單、‹ ›、PageUp／PageDown 或目錄內的 ←／→ 切換，
//   網址同步為 #diagram-N。
// - 右上：說明視窗開關、⚙ 設定（模式、方向、Theme，存在 localStorage）、全螢幕（瀏覽器不支援時不顯示）。
// - 說明視窗：預設收合成左上小卡（目前這張圖的標題與一句話結論）；展開後顯示頁面標題、摘要、圖例與原始碼；
//   展開狀態存在 localStorage。
// - 下方工具列：縮放、全圖（符合視窗）、個別方向；⋯ 選單內有匯出選項（大小 1x／2x／4x／最大、版面 只有圖／卡片、
//   配色 同畫面／淺色／深色，存在 localStorage）、下載 PNG／JPEG／WebP／PDF（點陣，解析度依大小）／SVG、
//   列印／向量 PDF（只印目前這張圖）、複製圖片與原始碼、複製問題回報給 Claude。
//   點陣輸出超過瀏覽器 canvas 上限時自動縮小並提示實際像素。卡片版面在圖上方加上標題與一句話結論。
// - 節點：flowchart、state、class、ER、requirement、mindmap 可滑鼠移入、點擊或 Tab 到節點，高亮所有上下游並淡化其他元素；
//   點擊或 Enter 鎖定、Esc 或點空白處取消；鎖定時下方浮動列可「複製引用」（圖名、節點、上下游）貼回對話。
//   其他圖種（例如 sequence）沒有節點資料，不啟用。
// - 畫筆：✎ 或 P 進入；筆、螢光筆、雷射筆、橡皮擦、復原、清除；觸控筆不必切換即可畫；筆跡在記憶體、依排版分組，可帶進匯出。
// - Agent 註解（ol.annotations）：節點旁編號徽章、浮動列顯示全文、說明視窗清單、卡片匯出腳註。
// - 錯誤訊息與狀態列旁有「複製給 Claude」，帶出錯誤、圖名、原始碼與環境資訊；按 ? 開啟說明視窗的操作提示。
// 方向只影響 flowchart、state、class、ER、requirement；「自動」依視窗方向，橫向時轉為水平、直向時轉為垂直。
// 自動符合大小最多放大到 150%，並避開小卡或寬螢幕上展開的說明視窗（取其右側或下方較大的區域）。
// 個別方向選單（跟隨頁面／垂直／水平）只在本次瀏覽有效，不存 localStorage。
// 整個視窗是無限畫布（淡點陣背景）：任何縮放狀態都可用滑鼠、觸控筆或手指拖曳平移，圖至少保留 48px 在畫面內。
// 觸控板雙指平移、捏合縮放；滑鼠滾輪縮放、Shift＋滾輪水平平移；觸控螢幕兩指捏合縮放。
// 畫布或頁面取得焦點時：方向鍵平移、+／− 縮放、0 符合視窗、1 原始大小；PageUp／PageDown 切換圖。列印時改為逐張排列。
// 畫布上的文字不可選取（拖曳優先），小卡不攔截滑鼠；需要文字時用「⋯ → 複製原始碼」或展開說明視窗。

const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@12.1.0/dist/mermaid.esm.min.mjs';
const THEMES = ['redux-color', 'redux-dark-color', 'redux', 'redux-dark', 'default', 'dark', 'neo', 'neo-dark', 'forest', 'neutral'];
const AUTO_THEME = { light: 'redux-color', dark: 'redux-dark-color' };
const STORE = { mode: 'diagram-first:mode', theme: 'diagram-first:theme', direction: 'diagram-first:direction', info: 'diagram-first:info', size: 'diagram-first:export-size',
                layout: 'diagram-first:export-layout', palette: 'diagram-first:export-palette' };
// 匯出點陣圖的大小：倍率或最大。side、area 為保守的 canvas 上限（Chrome 單邊 16384px）；實際配置失敗時再自動縮小。
const EXPORT = { sizes: ['1', '2', '4', 'max'], side: 16384, area: 64e6 };
const MERMAID_VERSION = '12.1.0';
// 本專案的版本與網址；版本由 build 從 .claude-plugin/plugin.json 帶入。
const APP = { version: '__APP_VERSION__', repo: 'https://github.com/puckwang/diagram-first-skill' };
const ZOOM = { min: 0.1, max: 8, step: 1.25, fitMax: 1.5 };
// 平移時圖至少留在可見區內的像素；拖曳超過門檻才算拖曳，點擊圖內連結不受影響。
const PAN = { keep: 48, threshold: 4, key: 40 };

const I18N = {
  zh: { copy: '複製原始碼', copied: '已複製', source: 'Mermaid 原始碼',
        mode: '模式', theme: 'Theme', auto: '自動', light: '淺色', dark: '深色',
        direction: '方向', vertical: '垂直', horizontal: '水平',
        zoomIn: '放大', zoomOut: '縮小', zoomActual: '原始大小', reset: '全圖', fitTitle: '符合視窗',
        followPage: '跟隨頁面', fullscreen: '全螢幕', exitFullscreen: '離開全螢幕', toc: '目錄', legend: '圖例',
        info: '說明', close: '收合', expand: '展開說明',
        nodeAria: (label, up, down) => `${label}，上游 ${up} 個、下游 ${down} 個`, upstream: '上游', downstream: '下游', none: '無',
        selInfo: (label, up, down) => `「${label}」上游 ${up}・下游 ${down}`, copyRef: '複製引用', clearSel: '取消選取', selected: '已選取節點',
        nodeRef: (k, n, title, id, label, ups, downs, up, down) => `第 ${k}/${n} 張圖〈${title}〉的節點${id ? ` ${id}` : ''}「${label}」（直接上游：${ups}；直接下游：${downs}；全部上游 ${up} 個、下游 ${down} 個）`,
        andMore: (n) => `等 ${n} 個`,
        report: '複製給 Claude', reportAll: '複製全部問題給 Claude', reportMenu: '複製問題回報給 Claude',
        reportTitle: '內容含原始碼與瀏覽器版本', reportCopied: '已複製，貼回對話給 Claude 即可',
        reportHead: '[diagram-first 問題回報]', reportPage: '頁面', reportDiagram: (k, n, title) => `第 ${k}/${n} 張〈${title}〉`, reportFig: '圖',
        reportState: '狀態', reportOk: 'render 成功', reportEnv: '環境', reportView: '檢視', reportSource: '原始碼', reportNote: '問題描述：',
        pen: '畫筆', penTools: '畫筆工具', penRed: '紅筆', penBlue: '藍筆', penInk: '黑筆', highlighter: '螢光筆', laser: '雷射筆',
        eraser: '橡皮擦', undo: '復原', clearInk: '清除這張圖的筆跡', exitPen: '離開畫筆',
        penOn: '畫筆模式：拖曳畫線，Space＋拖曳或滑鼠中鍵平移，Esc 離開。筆跡不會保存，可用匯出帶走。',
        penOnTouch: '畫筆模式：單指畫線、兩指平移縮放，再按 ✎ 離開。筆跡不會保存，可用匯出帶走。', penOff: '已離開畫筆模式',
        inkCleared: '已清除筆跡，可按復原', inkLabel: '筆跡', inkOn: '含', inkOff: '不含', inkLeave: '筆跡不會保存，確定離開？',
        annTitle: '註解', annMissing: (list) => `${list} 找不到對應的節點，只列在說明視窗。可複製問題回報，貼回對話給 Claude。`,
        annItem: (n, node) => `註解 ${n}（節點 ${node}）`, annAria: (texts) => `，註解：${texts}`, annRef: (texts) => `；註解：${texts}`,
        madeWith: '由', madeWithAfter: '產生', repoLink: '在 GitHub 查看 diagram-first（另開視窗）',
        layout: '版面', layoutPlain: '只有圖', layoutCard: '卡片', palette: '配色', paletteFollow: '同畫面',
        hintTouch: '拖曳平移、兩指捏合縮放，按「全圖」還原；點節點看上下游；按 ✎ 用手指畫，觸控筆可直接畫。',
        hint: '拖曳或方向鍵平移，觸控板雙指平移、Shift＋滾輪水平平移；滾輪、捏合或 +／− 縮放；0 符合視窗、1 原始大小；PageUp／PageDown 切換圖。點節點或從畫布按 Tab 進入節點看上下游，節點間用 [ ] 或 Alt＋方向鍵移動，Enter 鎖定、Esc 取消；按 P 或 ✎ 使用畫筆（觸控筆可直接畫）；按 ? 開啟這段說明。', prev: '上一張', next: '下一張', settings: '設定', more: '更多動作', downloadAs: (f) => `下載 ${f}`,
        transparent: 'PNG（透明背景）', printPdf: '列印／向量 PDF', printTitle: '只印圖本身，不套用版面與配色', size: '大小', sizeMax: '最大',
        pixels: (w, h) => `${w}×${h} px`, capped: (w, h) => `已達瀏覽器上限，輸出 ${w}×${h} px`, copyImage: '複製圖片', copyFail: '無法複製', exportFail: '匯出失敗',
        loadFail: '無法載入 Mermaid，請確認網路連線後重新整理頁面。', parseFail: '語法錯誤，這張圖無法 render：',
        renderFail: 'Render 失敗：', some: (ok, bad) => `${ok} 張成功、${bad} 張失敗。可複製問題回報，貼回對話給 Claude。`,
        noElk: 'ELK 排版未生效，圖形以預設的 dagre 排版顯示。可複製問題回報，貼回對話給 Claude。' },
  en: { copy: 'Copy source', copied: 'Copied', source: 'Mermaid source',
        mode: 'Mode', theme: 'Theme', auto: 'Auto', light: 'Light', dark: 'Dark',
        direction: 'Direction', vertical: 'Vertical', horizontal: 'Horizontal',
        zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoomActual: 'Actual size', reset: 'Fit', fitTitle: 'Fit to window',
        followPage: 'Follow page', fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', toc: 'Contents', legend: 'Legend',
        info: 'Notes', close: 'Collapse', expand: 'Show notes',
        nodeAria: (label, up, down) => `${label}, ${up} upstream, ${down} downstream`, upstream: 'Upstream', downstream: 'Downstream', none: 'none',
        selInfo: (label, up, down) => `"${label}" ${up} upstream · ${down} downstream`, copyRef: 'Copy reference', clearSel: 'Clear selection', selected: 'Selected node',
        nodeRef: (k, n, title, id, label, ups, downs, up, down) => `Node ${id ? `${id} ` : ''}"${label}" in diagram ${k}/${n} "${title}" (direct upstream: ${ups}; direct downstream: ${downs}; ${up} upstream and ${down} downstream in total)`,
        andMore: (n) => `and ${n} more`,
        report: 'Copy for Claude', reportAll: 'Copy all issues for Claude', reportMenu: 'Copy issue report for Claude',
        reportTitle: 'Includes the source and browser version', reportCopied: 'Copied. Paste it into the chat with Claude',
        reportHead: '[diagram-first issue report]', reportPage: 'Page', reportDiagram: (k, n, title) => `${k}/${n} "${title}"`, reportFig: 'Diagram',
        reportState: 'Status', reportOk: 'rendered', reportEnv: 'Environment', reportView: 'View', reportSource: 'Source', reportNote: 'What looks wrong:',
        pen: 'Pen', penTools: 'Pen tools', penRed: 'Red pen', penBlue: 'Blue pen', penInk: 'Black pen', highlighter: 'Highlighter', laser: 'Laser pointer',
        eraser: 'Eraser', undo: 'Undo', clearInk: 'Clear the ink on this diagram', exitPen: 'Exit pen',
        penOn: 'Pen mode: drag to draw, Space + drag or middle-click to pan, Esc to exit. Ink is not saved; export to keep it.',
        penOnTouch: 'Pen mode: draw with one finger, pan and zoom with two, tap ✎ again to exit. Ink is not saved; export to keep it.', penOff: 'Left pen mode',
        inkCleared: 'Ink cleared. Undo to restore it', inkLabel: 'Ink', inkOn: 'Include', inkOff: 'Exclude', inkLeave: 'Ink is not saved. Leave anyway?',
        annTitle: 'Notes', annMissing: (list) => `${list}: no matching node, listed in the notes window only. Copy the issue report and paste it into the chat with Claude.`,
        annItem: (n, node) => `Note ${n} (node ${node})`, annAria: (texts) => `, notes: ${texts}`, annRef: (texts) => `; notes: ${texts}`,
        madeWith: 'Made with', madeWithAfter: '', repoLink: 'View diagram-first on GitHub (opens in a new window)',
        layout: 'Layout', layoutPlain: 'Diagram only', layoutCard: 'Card', palette: 'Colors', paletteFollow: 'As shown',
        hintTouch: 'Drag to pan, pinch to zoom, tap Fit to reset; tap a node to trace its upstream and downstream; tap ✎ to draw with a finger, or draw directly with a stylus.',
        hint: 'Drag or use arrow keys to pan; scroll with two fingers on a trackpad, or Shift + wheel to pan sideways; wheel, pinch or +/− to zoom; 0 fits the window, 1 shows actual size; PageUp/PageDown switch diagrams. Hover or click a node, or Tab from the canvas into the nodes, to trace its upstream and downstream; move between nodes with [ ] or Alt + arrow keys; Enter locks, Esc clears; press P or ✎ to draw (a stylus draws directly); press ? to open this help.', prev: 'Previous', next: 'Next', settings: 'Settings', more: 'More actions', downloadAs: (f) => `Download ${f}`,
        transparent: 'PNG (transparent)', printPdf: 'Print / vector PDF', printTitle: 'Prints the diagram only; layout and colors are not applied', size: 'Size', sizeMax: 'Max',
        pixels: (w, h) => `${w}×${h} px`, capped: (w, h) => `Browser limit reached, exported ${w}×${h} px`, copyImage: 'Copy image', copyFail: 'Copy failed', exportFail: 'Export failed',
        loadFail: 'Could not load Mermaid. Check your network connection and reload the page.', parseFail: 'Syntax error, this diagram could not be rendered:',
        renderFail: 'Render failed:', some: (ok, bad) => `${ok} succeeded, ${bad} failed. Copy the issue report and paste it into the chat with Claude.`,
        noElk: 'ELK layout is not active; diagrams fell back to dagre. Copy the issue report and paste it into the chat with Claude.' },
  ja: { copy: 'ソースをコピー', copied: 'コピーしました', source: 'Mermaid ソース',
        mode: 'モード', theme: 'テーマ', auto: '自動', light: 'ライト', dark: 'ダーク',
        direction: '方向', vertical: '縦', horizontal: '横',
        zoomIn: '拡大', zoomOut: '縮小', zoomActual: '原寸', reset: '全体', fitTitle: '画面に合わせる',
        followPage: 'ページに従う', fullscreen: '全画面', exitFullscreen: '全画面を終了', toc: '目次', legend: '凡例',
        info: '説明', close: '折りたたむ', expand: '説明を開く',
        nodeAria: (label, up, down) => `${label}、上流 ${up} 件、下流 ${down} 件`, upstream: '上流', downstream: '下流', none: 'なし',
        selInfo: (label, up, down) => `「${label}」上流 ${up}・下流 ${down}`, copyRef: '参照をコピー', clearSel: '選択を解除', selected: '選択中のノード',
        nodeRef: (k, n, title, id, label, ups, downs, up, down) => `図 ${k}/${n}〈${title}〉のノード${id ? ` ${id}` : ''}「${label}」（直接の上流：${ups}；直接の下流：${downs}；上流 ${up} 件・下流 ${down} 件）`,
        andMore: (n) => `ほか ${n} 件`,
        report: 'Claude 用にコピー', reportAll: 'すべての問題を Claude 用にコピー', reportMenu: '問題レポートを Claude 用にコピー',
        reportTitle: 'ソースとブラウザのバージョンを含みます', reportCopied: 'コピーしました。Claude との会話に貼り付けてください',
        reportHead: '[diagram-first 問題レポート]', reportPage: 'ページ', reportDiagram: (k, n, title) => `${k}/${n}〈${title}〉`, reportFig: '図',
        reportState: '状態', reportOk: '描画成功', reportEnv: '環境', reportView: '表示', reportSource: 'ソース', reportNote: '問題の説明：',
        pen: 'ペン', penTools: 'ペンツール', penRed: '赤ペン', penBlue: '青ペン', penInk: '黒ペン', highlighter: '蛍光ペン', laser: 'レーザーポインター',
        eraser: '消しゴム', undo: '元に戻す', clearInk: 'この図の描き込みを消去', exitPen: 'ペンを終了',
        penOn: 'ペンモード：ドラッグで描画、Space＋ドラッグか中ボタンで移動、Esc で終了。描き込みは保存されないため、残すには書き出してください。',
        penOnTouch: 'ペンモード：1 本指で描画、2 本指で移動と拡大縮小、もう一度 ✎ で終了。描き込みは保存されないため、残すには書き出してください。', penOff: 'ペンモードを終了しました',
        inkCleared: '描き込みを消去しました。元に戻せます', inkLabel: '描き込み', inkOn: '含める', inkOff: '含めない', inkLeave: '描き込みは保存されません。移動しますか？',
        annTitle: '注釈', annMissing: (list) => `${list} に対応するノードがないため、説明ウィンドウにのみ表示しています。問題レポートをコピーして Claude との会話に貼り付けてください。`,
        annItem: (n, node) => `注釈 ${n}（ノード ${node}）`, annAria: (texts) => `、注釈：${texts}`, annRef: (texts) => `；注釈：${texts}`,
        madeWith: '', madeWithAfter: 'で作成', repoLink: 'GitHub で diagram-first を見る（新しいウィンドウ）',
        layout: 'レイアウト', layoutPlain: '図のみ', layoutCard: 'カード', palette: '配色', paletteFollow: '表示どおり',
        hintTouch: 'ドラッグで移動、ピンチで拡大縮小、「全体」で元に戻す。ノードをタップすると上流と下流を表示。✎ で指で描画、スタイラスはそのまま描画。',
        hint: 'ドラッグ・矢印キー・トラックパッドの 2 本指・Shift＋ホイールで移動、ホイール・ピンチ・+／− で拡大縮小、0 で画面に合わせ、1 で原寸、PageUp／PageDown で図を切り替え。ノードにポインターを置く・クリック・キャンバスから Tab で上流と下流を表示、ノード間は [ ] か Alt＋矢印キーで移動、Enter で固定、Esc で解除。P か ✎ でペン（スタイラスはそのまま描画）。? でこの説明を開く。', prev: '前へ', next: '次へ', settings: '設定', more: 'その他の操作', downloadAs: (f) => `${f} をダウンロード`,
        transparent: 'PNG（透過）', printPdf: '印刷／ベクター PDF', printTitle: '図のみを印刷し、レイアウトと配色は適用しません', size: 'サイズ', sizeMax: '最大',
        pixels: (w, h) => `${w}×${h} px`, capped: (w, h) => `ブラウザの上限に達したため ${w}×${h} px で書き出しました`, copyImage: '画像をコピー', copyFail: 'コピーできません', exportFail: '書き出しに失敗しました',
        loadFail: 'Mermaid を読み込めません。ネットワーク接続を確認して再読み込みしてください。', parseFail: '構文エラーのため描画できません：',
        renderFail: '描画に失敗しました：', some: (ok, bad) => `${ok} 枚成功、${bad} 枚失敗。問題レポートをコピーして Claude との会話に貼り付けてください。`,
        noElk: 'ELK レイアウトが有効になっていません（dagre で表示）。問題レポートをコピーして Claude との会話に貼り付けてください。' },
};
const lang = (document.documentElement.lang || 'zh').toLowerCase();
const T = I18N[lang.slice(0, 2)] || I18N.en;

const statusEl = document.getElementById('status');
// 各圖的錯誤訊息（依圖的索引）與 ELK 檢查結果，供「回報給 Claude」使用。
const errors = new Map();
let elkOk = null;
function setStatus(kind, text, extra) {
  statusEl.className = 'show ' + kind;
  statusEl.textContent = text;
  if (extra) statusEl.append(extra);
}

function load(key, allowed, fallback) {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

const systemDark = matchMedia('(prefers-color-scheme: dark)');
let mode = load(STORE.mode, ['auto', 'light', 'dark'], 'auto');
let theme = load(STORE.theme, ['auto', ...THEMES], 'auto');
const landscape = matchMedia('(orientation: landscape)');
let direction = load(STORE.direction, ['auto', 'vertical', 'horizontal'], 'auto');

function isDark() {
  return mode === 'dark' || (mode === 'auto' && systemDark.matches);
}
function applyMode() {
  if (mode === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
}
function currentTheme() {
  return theme === 'auto' ? AUTO_THEME[isDark() ? 'dark' : 'light'] : theme;
}
applyMode();

function dedent(text) {
  const lines = text.replace(/\t/g, '    ').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  const indents = lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}

const DIRECTED = /^(flowchart(-elk)?|graph|stateDiagram(-v2)?|classDiagram(-v2)?|erDiagram|requirementDiagram)(?=[\s;]|$)/;
const DIR = '(TB|TD|BT|LR|RL)';

// 找出圖種宣告所在的行；略過 front matter、空行與 %% 註解。找不到時回傳 -1。
function headerIndex(lines) {
  let k = 0;
  if (lines[0].trim() === '---') {
    const end = lines.findIndex((l, n) => n > 0 && l.trim() === '---');
    if (end < 0) return -1;
    k = end + 1;
  }
  while (k < lines.length && (!lines[k].trim() || lines[k].trim().startsWith('%%'))) k++;
  return k < lines.length ? k : -1;
}
function isDirected(source) {
  const lines = source.split('\n');
  const k = headerIndex(lines);
  return k >= 0 && DIRECTED.test(lines[k].trim());
}

// 依方向設定 dir（auto／vertical／horizontal）改寫整張圖的方向；只處理有方向設定的圖種，subgraph 等區塊內的 direction 不動。
function withDirection(source, dir) {
  // 「自動」依視窗方向：橫向轉為水平，直向轉為垂直。
  if (dir === 'auto') dir = landscape.matches ? 'horizontal' : 'vertical';
  const lines = source.split('\n');
  const k = headerIndex(lines);
  if (k < 0) return source;
  const header = lines[k].trim();
  const type = header.match(DIRECTED);
  if (!type) return source;

  const flow = /^(flowchart|graph)/.test(type[1]);
  let author = 'TB';
  let at = -1;
  if (flow) {
    const m = header.match(new RegExp('^\\S+\\s+' + DIR + '(?=[\\s;]|$)'));
    if (m) author = m[1];
  } else {
    let depth = 0;
    for (let n = k + 1; n < lines.length; n++) {
      const m = depth === 0 && lines[n].match(new RegExp('^\\s*direction\\s+' + DIR + '\\s*$'));
      if (m) { author = m[1]; at = n; break; }
      depth += (lines[n].match(/\{/g) || []).length - (lines[n].match(/\}/g) || []).length;
    }
  }

  const horizontal = author === 'LR' || author === 'RL';
  if (dir === 'vertical' && !horizontal) return source;
  if (dir === 'horizontal' && horizontal) return source;
  const target = dir === 'vertical' ? 'TB' : 'LR';

  if (flow) {
    lines[k] = lines[k].replace(new RegExp('^(\\s*\\S+)(\\s+' + DIR + ')?(?=[\\s;]|$)'), `$1 ${target}`);
  } else if (at >= 0) {
    lines[at] = lines[at].replace(new RegExp(DIR), target);
  } else {
    lines.splice(k + 1, 0, `  direction ${target}`);
  }
  return lines.join('\n');
}

function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (text !== undefined) node.textContent = text;
  return node;
}

async function elkIsActive(mermaid) {
  const body = 'flowchart LR\n  A --> B\n  A --> C\n  B --> D\n  C --> D\n  A --> D';
  try {
    const a = await mermaid.render('probe-elk', '---\nconfig:\n  layout: elk\n---\n' + body);
    const b = await mermaid.render('probe-dagre', '---\nconfig:\n  layout: dagre\n---\n' + body);
    const strip = (s, id) => s.split(id).join('X');
    return strip(a.svg, 'probe-elk') !== strip(b.svg, 'probe-dagre');
  } catch {
    return false;
  }
}

let mermaid;
try {
  ({ default: mermaid } = await import(MERMAID_URL));
} catch (e) {
  setStatus('error', T.loadFail);
  throw e;
}

const font = getComputedStyle(document.documentElement).getPropertyValue('--font').trim();
await document.fonts.ready;
function initMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: currentTheme(),
    fontFamily: font,
    themeVariables: { fontFamily: font },
  });
}

function viewBox(d) {
  const svg = d.canvas.querySelector('svg');
  const vb = svg && svg.viewBox && svg.viewBox.baseVal;
  return vb && vb.width && vb.height ? { svg, w: vb.width, h: vb.height } : null;
}
function currentScale(d) {
  return d.scale || 1;
}
function showLevel(d) {
  if (!d.ok) return;
  const pct = `${Math.round(currentScale(d) * 100)}%`;
  d.level.textContent = pct;
  d.level.setAttribute('aria-label', `${pct}, ${T.zoomActual}`);
}

// 點陣格線跟著平移與縮放移動；螢幕上的點距超出 12–48px 時以 ×2／÷2 換級，避免太密或太疏。
function syncGrid(d) {
  let g = 24 * d.scale;
  while (g < 12) g *= 2;
  while (g > 48) g /= 2;
  const c = d.canvas.style;
  c.setProperty('--grid', `${g}px`);
  c.setProperty('--gx', `${d.tx % g}px`);
  c.setProperty('--gy', `${d.ty % g}px`);
}

// 上方浮動列以下、下方工具列以上的範圍（畫布座標）。
function barLimits(d) {
  const ch = d.canvas.clientHeight;
  const top = (parseFloat(root.style.getPropertyValue('--top-h')) || 48) + 20;
  const bottom = ch - (parseFloat(root.style.getPropertyValue('--bottom-h')) || 52) - 20 - (parseFloat(root.style.getPropertyValue('--sel-h')) || 0);
  return { top, bottom: Math.max(top + 1, bottom) };
}

// 讓圖至少保留 PAN.keep 像素在上下浮動列之間，避免拖到看不見或整個藏在工具列後面。
function clampPan(d, w, h) {
  const cw = d.canvas.clientWidth;
  const { top, bottom } = barLimits(d);
  const keepX = Math.min(PAN.keep, w * d.scale);
  const keepY = Math.min(PAN.keep, h * d.scale);
  d.tx = Math.min(cw - keepX, Math.max(keepX - w * d.scale, d.tx));
  d.ty = Math.min(bottom - keepY, Math.max(top + keepY - h * d.scale, d.ty));
}

// 依 d.scale、d.tx、d.ty 擺放 SVG：寬高決定縮放（向量重繪、不模糊），translate 決定位置。
// 畫布不可見（未切換到的圖）時不動作，避免以 0 寬度夾住位置；切換到這張圖時再套用。
function applyView(d) {
  const v = viewBox(d);
  if (!v || !d.canvas.clientWidth) return;
  clampPan(d, v.w, v.h);
  v.svg.style.maxWidth = 'none';
  v.svg.style.width = `${v.w * d.scale}px`;
  v.svg.style.height = `${v.h * d.scale}px`;
  v.svg.style.transform = `translate(${d.tx}px, ${d.ty}px)`;
  syncGrid(d);
  showLevel(d);
}

// 縮放範圍：大圖符合視窗後可能小於 ZOOM.min，下限放寬到符合視窗的倍率，縮小時才不會反而變大。
function clampScale(d, s) {
  return Math.min(ZOOM.max, Math.max(Math.min(ZOOM.min, d.fitScale || ZOOM.min), s));
}

// anchor 為縮放時保持不動的螢幕座標，預設為畫布中心。
function setZoom(d, scale, anchor) {
  if (!viewBox(d)) return;
  const r = d.canvas.getBoundingClientRect();
  const ax = (anchor ? anchor.x : r.left + r.width / 2) - r.left;
  const ay = (anchor ? anchor.y : r.top + r.height / 2) - r.top;
  const next = clampScale(d, scale);
  d.tx = ax - (ax - d.tx) * (next / d.scale);
  d.ty = ay - (ay - d.ty) * (next / d.scale);
  d.scale = next;
  d.fit = false;
  applyView(d);
}
function panBy(d, dx, dy) {
  d.tx += dx;
  d.ty += dy;
  d.fit = false;
  applyView(d);
}

// 窄螢幕展開的說明視窗視為暫時閱讀用，蓋在圖上、圖不讓位也不重新符合大小。
const overlayOpen = () => !info.classList.contains('card') && innerWidth < 900;

// 可放圖的區域：扣掉上下浮動列；小卡或說明視窗擋到時，另外提供它右側與下方兩塊，由 fitScreen 擇優。
function fitArea(d) {
  const r = d.canvas.getBoundingClientRect();
  const full = { left: 16, ...barLimits(d), right: r.width - 16 };
  const b = info.getBoundingClientRect();
  if (!b.width) return { full, around: [] };
  const box = { left: b.left - r.left, top: b.top - r.top, right: b.right - r.left, bottom: b.bottom - r.top };
  return { full, box, around: [{ ...full, left: Math.max(full.left, box.right + 16) }, { ...full, top: Math.max(full.top, box.bottom + 12) }] };
}

// 讓整張圖符合可見區並置中；畫布不可見時不動作，等切換到這張圖時再計算。
// soft 為 true 表示只因說明視窗展開或浮動列尺寸改變而重新符合；窄螢幕展開說明時跳過，避免圖跳動。
// 改方向、旋轉、Theme 重繪、視窗縮放與使用者按「全圖」或 0 都會照常重新計算。
// 先用整塊區域，置中後不碰到小卡或說明視窗就採用；碰到時改用它右側或下方較大的一塊。
function fitScreen(d, soft = false) {
  const v = viewBox(d);
  if (!v || !d.canvas.clientWidth) return;
  if (soft && overlayOpen() && d.placed) { applyView(d); return; }
  const place = (a) => {
    const w = a.right - a.left;
    const h = a.bottom - a.top;
    if (w <= 0 || h <= 0) return null;
    const s = Math.min(w / v.w, h / v.h, ZOOM.fitMax);
    const x = a.left + (w - v.w * s) / 2;
    const y = a.top + (h - v.h * s) / 2;
    return { s, x, y, right: x + v.w * s, bottom: y + v.h * s };
  };
  const { full, box, around } = fitArea(d);
  let best = place(full);
  const hits = (p) => box && !overlayOpen() && p.x < box.right && p.right > box.left && p.y < box.bottom && p.bottom > box.top;
  if (best && hits(best)) {
    best = around.map(place).filter(Boolean).reduce((m, p) => (!m || p.s > m.s ? p : m), null);
  }
  if (!best) return;
  d.scale = best.s;
  d.fitScale = best.s;
  d.tx = best.x;
  d.ty = best.y;
  applyView(d);
  d.fit = true;
  d.placed = true;
}

// 全螢幕：整頁進入 Fullscreen API，隱藏瀏覽器介面；不支援的環境（例如 iPhone Safari）不顯示按鈕。
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const fsEnabled = Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled);
async function toggleFullscreen() {
  const root = document.documentElement;
  try {
    if (fsElement()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else await (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
  } catch {}
}

// 判斷 wheel 來自觸控板還是滑鼠滾輪：滑鼠以行／頁為單位，或每格是 120 的整數倍（wheelDelta）、或 delta 為 ≥50 的整數。
// 同一串連續事件（間隔 < 150ms）沿用第一個事件的判斷，觸控板快速滑動或慣性階段不會中途變成縮放。
let wheelKind = null;
let wheelAt = 0;
// 確定是實體滾輪格（以行／頁為單位或 wheelDelta 為 120 的倍數）時才套用每格最小縮放量。
let wheelNotch = false;
function wheelSource(e) {
  // 有水平分量（以像素為單位）幾乎一定是觸控板，直接改判。
  if (e.deltaMode === 0 && e.deltaX !== 0) wheelKind = null;
  else if (wheelKind && e.timeStamp - wheelAt < 150) { wheelAt = e.timeStamp; return wheelKind; }
  // Chrome 觸控板的 wheelDeltaY 約為 −3×deltaY；符合時一律不當成滑鼠（兩條滑鼠判斷都排除）。
  const chromePad = Boolean(e.wheelDeltaY) && Math.abs(e.deltaY * 3) === Math.abs(e.wheelDeltaY);
  const wheel120 = !chromePad && e.wheelDeltaY && e.wheelDeltaY % 120 === 0;
  const notch = e.deltaX === 0 && !chromePad && (wheel120 || (Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 50));
  wheelKind = e.deltaMode !== 0 || notch ? 'mouse' : 'trackpad';
  wheelNotch = e.deltaMode !== 0 || Boolean(wheel120);
  wheelAt = e.timeStamp;
  return wheelKind;
}
// 觸控板雙指 = 平移、捏合（帶 ctrlKey）= 縮放；滑鼠滾輪 = 縮放、Shift＋滾輪 = 水平平移。縮放倍率與 delta 成比例，誤判時也不會暴衝。
function wheelZoomOrPan(d, e) {
  // 以行為單位（Firefox 滑鼠每格 3 行）時，每行約 33px，讓每格與 Chrome 的 100px 手感一致。
  const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? d.canvas.clientHeight : 1;
  const dx = e.deltaX * unit;
  const dy = e.deltaY * unit;
  const at = { x: e.clientX, y: e.clientY };
  const zoom = e.ctrlKey || e.metaKey;
  // Shift＋滾輪：瀏覽器會把滑鼠的垂直滾動轉成 deltaX，不用來判斷來源，也不留下判斷結果，放開 Shift 後滾輪照常縮放。
  if (e.shiftKey && !zoom) { wheelKind = null; panBy(d, -(dx || dy), 0); return; }
  const kind = wheelSource(e);
  // 滑鼠每格最多約 26%；以頁為單位或滾輪自由轉動時的大 delta 不會一次縮到底。
  const cap = (v, lo) => Math.sign(v) * Math.min(120, Math.max(lo, Math.abs(v)));
  if (zoom) setZoom(d, currentScale(d) * Math.exp(kind === 'trackpad' ? -dy * 0.01 : -cap(dy, 0) * 0.0025), at);
  else if (kind === 'trackpad') panBy(d, -dx, -dy);
  else {
    // 滑鼠每格最多縮放約 26%；確定是滾輪格時至少約 10%，macOS 慢速轉動的小 delta 不會「滾了沒反應」。
    // 只靠 delta 大小判斷成滑鼠的事件不套用下限，誤判的觸控板事件仍按比例縮放、不會暴衝。
    setZoom(d, currentScale(d) * Math.exp(-cap(dy, wheelNotch ? 40 : 0) * 0.0025), at);
  }
}

function bindGestures(d) {
  const c = d.canvas;
  c.addEventListener('wheel', (e) => {
    if (!d.ok) return;
    e.preventDefault();
    wheelZoomOrPan(d, e);
  }, { passive: false });

  // 任何縮放狀態都可用滑鼠、觸控筆或手指拖曳；兩指捏合以兩指中點為中心縮放並跟著移動。
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  const mid = () => {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
  };
  // 以目前的兩指位置重新建立捏合基準；手指組合改變（例如三指放開其中一指）時也要重建，避免倍率跳動。
  const startPinch = () => {
    const r = c.getBoundingClientRect();
    pinch = { ...mid(), scale: d.scale, tx: d.tx, ty: d.ty, left: r.left, top: r.top };
  };
  const startDrag = (e) => { drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tx: d.tx, ty: d.ty, moved: false }; };
  // 按下後才在 window 監聽移動與放開：指標在超過拖曳門檻前滑到浮動列上，拖曳也不會中斷。
  // 不在按下時 capture，圖內連結的 click 才能正常觸發。
  const listen = (on) => {
    const f = on ? addEventListener : removeEventListener;
    f('pointermove', move);
    f('pointerup', release);
    f('pointercancel', release);
  };
  c.addEventListener('pointerdown', (e) => {
    // 畫筆：第二指落下時取消進行中的筆劃，改為兩指捏合。
    if (stroke && e.pointerType === 'touch' && stroke.touch) {
      const first = stroke;
      cancelStroke(d);
      listen(true);
      pointers.set(first.id, first.last);
    } else if (!pointers.size && !stroke && d.ok && wantsInk(e)) {
      e.preventDefault();
      startStroke(d, e);
      return;
    }
    // 畫筆模式下滑鼠中鍵也可平移。
    const middle = penOn && e.pointerType === 'mouse' && e.button === 1;
    if (!d.ok || (e.pointerType === 'mouse' && e.button !== 0 && !middle) || e.target.closest('.err')) return;
    if (middle) e.preventDefault();
    if (!pointers.size) listen(true);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) startDrag(e);
    else if (pointers.size === 2) {
      drag = null;
      startPinch();
      [...pointers.keys()].forEach((id) => { try { c.setPointerCapture(id); } catch {} });
    }
  });
  function move(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const m = mid();
      const s = clampScale(d, pinch.scale * m.dist / pinch.dist);
      d.tx = m.x - pinch.left - (pinch.x - pinch.left - pinch.tx) * (s / pinch.scale);
      d.ty = m.y - pinch.top - (pinch.y - pinch.top - pinch.ty) * (s / pinch.scale);
      d.scale = s;
      d.fit = false;
      applyView(d);
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < PAN.threshold) return;
      drag.moved = true;
      c.setPointerCapture(e.pointerId);
      c.classList.add('dragging');
    }
    d.tx = drag.tx + dx;
    d.ty = drag.ty + dy;
    d.fit = false;
    applyView(d);
  }
  const end = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size < 2) pinch = null;
    else if (pinch) startPinch();
    if (pointers.size === 1) {
      // 捏合後剩一指，從目前位置接著拖曳。
      const [[id, p]] = [...pointers];
      drag = { id, x: p.x, y: p.y, tx: d.tx, ty: d.ty, moved: true };
    } else if (!pointers.size) {
      drag = null;
      listen(false);
    }
  };
  // 拖曳結束時不要觸發圖內連結的點擊：click 在 pointerup 之後同步觸發，所以下一個 frame 才移除 .dragging。
  function release(e) {
    end(e);
    requestAnimationFrame(() => { if (!pointers.size) c.classList.remove('dragging'); });
  }
  // 視窗失焦時（例如在拖曳中切換 App）清掉殘留的指標，避免之後被誤判成捏合。
  addEventListener('blur', () => {
    if (!pointers.size) return;
    pointers.clear();
    drag = pinch = null;
    listen(false);
    c.classList.remove('dragging');
  });
  c.addEventListener('click', (e) => { if (c.classList.contains('dragging')) e.preventDefault(); }, true);
  // 圖內連結與文字的原生拖放會觸發 pointercancel 中斷平移。
  c.addEventListener('dragstart', (e) => e.preventDefault());

  // macOS Safari 的觸控板捏合只送 gesture 事件；觸控螢幕已由 pointer events 處理，避免重複縮放。
  let gestureBase = 1;
  c.addEventListener('gesturestart', (e) => { e.preventDefault(); gestureBase = currentScale(d); });
  c.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    if (!d.ok || pointers.size >= 2) return;
    setZoom(d, gestureBase * e.scale, { x: e.clientX, y: e.clientY });
  });

  c.addEventListener('keydown', (e) => viewKey(d, e));
}

// 畫布或頁面本身取得焦點時：方向鍵平移（Shift 加大步距），+／− 縮放，0 符合視窗，1 原始大小。
function viewKey(d, e) {
  if (!d || !d.ok || e.altKey || e.ctrlKey || e.metaKey) return;
  const step = e.shiftKey ? PAN.key * 5 : PAN.key;
  const move = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
  if (move) panBy(d, ...move);
  else if (e.key === '+' || e.key === '=') setZoom(d, currentScale(d) * ZOOM.step);
  else if (e.key === '-' || e.key === '_') setZoom(d, currentScale(d) / ZOOM.step);
  else if (e.key === '0') fitScreen(d);
  else if (e.key === '1') setZoom(d, 1);
  else return;
  e.preventDefault();
}

let exportSize = load(STORE.size, EXPORT.sizes, '2');
// 版面：只有圖或卡片（加上標題與一句話結論）；配色：跟隨畫面，或固定匯出淺色／深色（必要時以對應 Theme 重新 render）。
let exportLayout = load(STORE.layout, ['plain', 'card'], 'plain');
let exportPalette = load(STORE.palette, ['follow', 'light', 'dark'], 'follow');
// 匯出是否帶上畫筆筆跡（只在有筆跡時顯示這個選項）；只在本次瀏覽有效。
let exportInk = 'on';

// 讀出 SVG 字串的 viewBox 尺寸。
function svgSize(svgText) {
  const m = svgText.match(/viewBox="[^"]*?([\d.]+)[\s,]+([\d.]+)"/);
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 1, h: 1 };
}

// 依選擇的大小算出輸出像素（w、h 為圖的 viewBox 尺寸）；超過 canvas 上限時等比縮小。
function exportDims(w, h) {
  const want = exportSize === 'max' ? Infinity : Number(exportSize);
  const s = Math.min(want, EXPORT.side / w, EXPORT.side / h, Math.sqrt(EXPORT.area / (w * h)));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), capped: s < want };
}

// 配置 canvas；部分瀏覽器（例如 iOS Safari）的上限更低，超過時 getContext 失敗或畫不上去，每次縮小 25% 重試。
function makeCanvas(w, h) {
  for (let k = 0; k < 16; k++) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (g) {
      g.fillRect(w - 1, h - 1, 1, 1);
      if (g.getImageData(w - 1, h - 1, 1, 1).data[3] === 255) {
        g.clearRect(w - 1, h - 1, 1, 1);
        return { c, g, shrunk: k > 0 };
      }
    }
    c.width = c.height = 0;
    w = Math.max(1, Math.floor(w * 0.75));
    h = Math.max(1, Math.floor(h * 0.75));
  }
  throw new Error('canvas');
}

// 把 SVG 轉成點陣圖，回傳 { blob, width, height, capped }。SVG 以目標尺寸繪製，放大時仍是向量品質。
// 含 foreignObject 的 SVG 在部分瀏覽器會污染 canvas，此時改用純 SVG 文字標籤重新 render。
async function rasterize(svgText, type, background) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  const vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || !vb[2] || !vb[3]) throw new Error('no viewBox');
  const want = exportDims(vb[2], vb[3]);
  // SVG 本身就以輸出尺寸宣告，瀏覽器直接以該解析度繪製，不會先畫小圖再放大。
  root.setAttribute('width', want.w);
  root.setAttribute('height', want.h);
  root.removeAttribute('style');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(root));
  await img.decode();
  const { c, g, shrunk } = makeCanvas(want.w, want.h);
  if (background) { g.fillStyle = background; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, 0.92));
  const out = { blob, width: c.width, height: c.height, capped: want.capped || shrunk, svg: svgText };
  c.width = c.height = 0;
  return out;
}
// Mermaid 的設定是全域的：畫面重繪與匯出用的 render 依序執行，避免匯出途中被重繪改掉 Theme（或反過來）。
let renderQueue = Promise.resolve();
function serial(fn) {
  const run = renderQueue.then(fn, fn);
  renderQueue = run.catch(() => {});
  return run;
}

// 以指定 Theme 與 label 模式重新 render 一份匯出用 SVG，結束後還原畫面用的設定。
function renderExport(d, themeName, htmlLabels) {
  return serial(() => renderExportNow(d, themeName, htmlLabels));
}
async function renderExportNow(d, themeName, htmlLabels) {
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: themeName, fontFamily: font,
    themeVariables: { fontFamily: font }, ...(htmlLabels ? {} : { htmlLabels: false, flowchart: { htmlLabels: false } }) });
  try {
    // 與畫面相同：改寫方向後無法 render 時，退回原始碼。
    const source = withDirection(d.source, dirOf(d));
    let svg;
    try {
      ({ svg } = await mermaid.render(`export-${d.i}-${Date.now()}`, source));
    } catch (e) {
      if (source === d.source) throw e;
      ({ svg } = await mermaid.render(`export-${d.i}-${Date.now()}-src`, d.source));
    }
    // 與 d.svg 相同，經由 DOM 序列化成合法的 XML。
    const box = document.createElement('div');
    box.innerHTML = svg;
    return new XMLSerializer().serializeToString(box.querySelector('svg'));
  } finally {
    initMermaid();
  }
}

// 匯出配色：跟隨畫面時用目前的圖；指定淺色／深色而與畫面不同時，改用對應的自動 Theme 重新 render。
function exportTheme(d) {
  const shownDark = d.canvas.classList.contains('dark');
  const dark = exportPalette === 'follow' ? shownDark : exportPalette === 'dark';
  return { dark, rerender: dark !== shownDark ? AUTO_THEME[dark ? 'dark' : 'light'] : null };
}
// 讀取淺色或深色模式下的 CSS token（匯出配色可能與畫面不同）。
// 暫時切換 data-theme 讀值後立即還原；同一個 task 內完成，畫面不會閃動。
// 注意：若日後替顏色加上 transition，這裡的強制樣式計算可能造成閃動，屆時改為快取兩組值。
function tokenColor(name, dark) {
  const html = document.documentElement;
  const keep = html.dataset.theme;
  html.dataset.theme = dark ? 'dark' : 'light';
  const v = getComputedStyle(html).getPropertyValue(name).trim();
  if (keep === undefined) delete html.dataset.theme;
  else html.dataset.theme = keep;
  return v || (dark ? '#E8E8EA' : '#1F2328');
}
function exportBackground(dark) {
  return dark ? getComputedStyle(document.documentElement).getPropertyValue('--canvas-dark').trim() : '#FFFFFF';
}

// 依文字寬度斷行（中日文逐字、其他語言依詞），回傳行陣列。
const measureCtx = document.createElement('canvas').getContext('2d');
function wrapText(text, css, width) {
  measureCtx.font = css;
  // lang 不是合法語言標籤（例如佔位符沒替換）時 Segmenter 會丟錯，改用預設語系或逐字。
  let seg = null;
  try { seg = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(lang, { granularity: 'word' }) : null; } catch {
    try { seg = new Intl.Segmenter(undefined, { granularity: 'word' }); } catch {}
  }
  const parts = seg ? [...seg.segment(text)].map((x) => x.segment) : [...text];
  const lines = [];
  let line = '';
  // 單一片段（長網址、長英文字）比寬度還寬時，改為逐字斷行。
  const pieces = parts.flatMap((x) => (measureCtx.measureText(x).width > width ? [...x] : [x]));
  for (const part of pieces) {
    const next = line + part;
    if (line && measureCtx.measureText(next).width > width) {
      lines.push(line.trimEnd());
      line = part.trimStart();
    } else line = next;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

// 卡片版面：只計算尺寸與斷行，不碰 DOM，供選單顯示輸出像素。
function cardLayout(w, h, title, caption, footnotes = []) {
  const pad = 32;
  const W = Math.max(w, 480);
  const titleCss = `600 22px ${font}`;
  const capCss = `15px ${font}`;
  const titleLines = title ? wrapText(title, titleCss, W) : [];
  const capLines = caption ? wrapText(caption, capCss, W) : [];
  const head = titleLines.length * 30 + (capLines.length ? 6 + capLines.length * 22 : 0) + (titleLines.length || capLines.length ? 20 : 0);
  // 圖下方的註解（腳註式，依編號），每條可斷成多行。
  const footCss = `14px ${font}`;
  const footLines = footnotes.flatMap((t) => wrapText(t, footCss, W));
  const foot = footLines.length ? 16 + footLines.length * 20 : 0;
  return { pad, W, titleCss, capCss, titleLines, capLines, head, footCss, footLines, foot, TW: W + pad * 2, TH: pad + head + h + foot + pad };
}

// 卡片：在圖的上方加上標題與一句話結論，整體仍是一份 SVG，點陣、PDF、SVG 下載共用。文字顏色取自畫面的 token。
function cardSvg(svgText, title, caption, background, dark, footnotes = []) {
  const SVGNS = 'http://www.w3.org/2000/svg';
  const inner = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  const vb = (inner.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || !vb[2] || !vb[3]) return svgText;
  const { pad, W, titleCss, capCss, titleLines, capLines, head, footCss, footLines, TW, TH } = cardLayout(vb[2], vb[3], title, caption, footnotes);
  const doc = document.implementation.createDocument(SVGNS, 'svg', null);
  const root = doc.documentElement;
  [['viewBox', `0 0 ${TW} ${TH}`], ['width', TW], ['height', TH]].forEach(([k, v]) => root.setAttribute(k, v));
  if (background) {
    const r = doc.createElementNS(SVGNS, 'rect');
    [['width', TW], ['height', TH], ['fill', background]].forEach(([k, v]) => r.setAttribute(k, v));
    root.append(r);
  }
  let y = pad;
  const text = (lines, css, size, lineH, color) => lines.forEach((t) => {
    const n = doc.createElementNS(SVGNS, 'text');
    y += lineH;
    [['x', pad], ['y', y - (lineH - size) / 2 - 4], ['fill', color], ['font-family', font], ['font-size', size]].forEach(([k, v]) => n.setAttribute(k, v));
    if (css.startsWith('600')) n.setAttribute('font-weight', '600');
    n.textContent = t;
    root.append(n);
  });
  text(titleLines, titleCss, 22, 30, tokenColor('--text', dark));
  if (capLines.length) y += 6;
  text(capLines, capCss, 15, 22, tokenColor('--muted', dark));
  const graph = doc.importNode(inner, true);
  graph.removeAttribute('style');
  [['x', pad + (W - vb[2]) / 2], ['y', pad + head], ['width', vb[2]], ['height', vb[3]]].forEach(([k, v]) => graph.setAttribute(k, v));
  root.append(graph);
  y = pad + head + vb[3] + 16;
  text(footLines, footCss, 14, 20, tokenColor('--muted', dark));
  return new XMLSerializer().serializeToString(root);
}

// 組出匯出用的 SVG（依配色與版面）。htmlLabels 為 false 時改用純 SVG 文字標籤，避免污染 canvas。
async function exportSvg(d, transparent, htmlLabels = true) {
  const t = exportTheme(d);
  const base = t.rerender || !htmlLabels ? await renderExport(d, t.rerender || currentTheme(), htmlLabels) : d.svg;
  // 筆跡最後才加：它可能擴大 viewBox，徽章要在擴大前依原本的座標放好。
  const ink = (svg) => (exportInk === 'on' ? withInk(d, svg, t.dark) : svg);
  if (exportLayout !== 'card') return { svg: ink(base), dark: t.dark };
  const caption = notes.get(d.section)?.querySelector('.caption')?.textContent.trim() || '';
  const footnotes = d.anns.map((a) => `${a.n}. ${a.text}`);
  return { svg: cardSvg(ink(exportAnnotations(d, base)), d.section.dataset.title, caption, transparent ? null : exportBackground(t.dark), t.dark, footnotes), dark: t.dark };
}

async function exportImage(d, type, transparent) {
  // 淺色匯出用純白，不帶畫布的米白底；深色沿用深色畫布色。
  const first = await exportSvg(d, transparent);
  const background = transparent ? null : exportBackground(first.dark);
  try {
    return await rasterize(first.svg, type, background);
  } catch (e) {
    if (e.name !== 'SecurityError') throw e;
    return await rasterize((await exportSvg(d, transparent, false)).svg, type, background);
  }
}

// 把 JPEG 包成單頁 PDF（不需外部函式庫）：頁面大小等於圖，CSS px 以 0.75 換成 pt，單邊不超過 PDF 上限 14400pt。
async function jpegToPdf(r, viewW, viewH) {
  const jpg = new Uint8Array(await r.blob.arrayBuffer());
  const k = Math.min(0.75, 14400 / viewW, 14400 / viewH);
  const W = (viewW * k).toFixed(2);
  const H = (viewH * k).toFixed(2);
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let len = 0;
  const push = (x) => {
    const b = typeof x === 'string' ? enc.encode(x) : x;
    parts.push(b);
    len += b.length;
  };
  const obj = (n, dict, stream) => {
    offsets[n] = len;
    push(`${n} 0 obj\n${dict}\n`);
    if (stream) { push('stream\n'); push(stream); push('\nendstream\n'); }
    push('endobj\n');
  };
  const content = enc.encode(`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`);
  push('%PDF-1.4\n');
  push(new Uint8Array([37, 226, 227, 207, 211, 10]));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, `<< /Type /XObject /Subtype /Image /Width ${r.width} /Height ${r.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>`, jpg);
  obj(5, `<< /Length ${content.length} >>`, content);
  const xref = len;
  const rows = offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  push(`xref\n0 6\n0000000000 65535 f \n${rows}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}

// 列印／向量 PDF：只印目前這張圖，頁面大小設成圖的尺寸，在列印對話框選「另存為 PDF」即可得到向量 PDF。
function printOne(d) {
  const v = viewBox(d);
  if (!v) return;
  const pageStyle = el('style', {}, `@page { size: ${Math.ceil(v.w) + 2}px ${Math.ceil(v.h) + 2}px; margin: 0; }`);
  document.head.append(pageStyle);
  document.documentElement.classList.add('print-one');
  const done = () => {
    pageStyle.remove();
    document.documentElement.classList.remove('print-one');
    removeEventListener('afterprint', done);
  };
  addEventListener('afterprint', done);
  print();
}

function saveBlob(blob, name) {
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const probe = document.createElement('canvas');
const FORMATS = [['png', 'PNG'], ['png-transparent', null], ['jpeg', 'JPEG']];
if (probe.toDataURL('image/webp').startsWith('data:image/webp')) FORMATS.push(['webp', 'WebP']);
FORMATS.push(['pdf', 'PDF'], ['svg', 'SVG']);

// 工具列只佔一個 Tab 停留點，以方向鍵在按鈕間移動；瀏覽器支援 focusgroup 時交給瀏覽器處理。
function rovingToolbar(bar) {
  bar.setAttribute('focusgroup', 'toolbar wrap');
  if ('focusGroup' in HTMLElement.prototype) return () => {};
  const items = () => [...bar.querySelectorAll('button, select')];
  const sync = (active) => {
    const list = items();
    const keep = list.includes(active) ? active : list.find((b) => b.tabIndex === 0) || list[0];
    list.forEach((b) => { b.tabIndex = b === keep ? 0 : -1; });
  };
  bar.addEventListener('focusin', (e) => sync(e.target));
  bar.addEventListener('keydown', (e) => {
    const list = items();
    const k = list.indexOf(e.target);
    if (k < 0) return;
    const rtl = getComputedStyle(bar).direction === 'rtl';
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    const next = step ? list[(k + step + list.length) % list.length]
      : e.key === 'Home' ? list[0] : e.key === 'End' ? list[list.length - 1] : null;
    if (!next) return;
    e.preventDefault();
    next.focus();
  });
  return () => sync(null);
}

// 彈出面板：優先用 Popover API（點外面或 Esc 自動關閉）；不支援時以 hidden 切換並自行處理關閉。
const nativePopover = Object.hasOwn(HTMLElement.prototype, 'popover');
const popovers = [];
function popover(btn, panel, align, onOpen) {
  btn.setAttribute('aria-expanded', 'false');
  const prop = (k, v) => panel.style.setProperty(k, v);
  const place = () => {
    const r = btn.getBoundingClientRect();
    const up = align === 'up';
    prop('--pop-top', up ? 'auto' : `${Math.round(r.bottom + 8)}px`);
    prop('--pop-bottom', up ? `${Math.round(innerHeight - r.top + 8)}px` : 'auto');
    prop('--pop-max-h', `${Math.max(120, Math.round(up ? r.top - 16 : innerHeight - r.bottom - 16))}px`);
    const end = align === 'right' || up;
    prop('--pop-right', end ? `${Math.max(12, Math.round(innerWidth - r.right))}px` : 'auto');
    prop('--pop-left', end ? 'auto' : `${Math.max(12, Math.round(r.left))}px`);
  };
  // 開啟後若超出視窗左右邊緣，改貼齊該側。
  const clamp = () => {
    const m = panel.getBoundingClientRect();
    if (m.left < 12) { prop('--pop-right', 'auto'); prop('--pop-left', '12px'); }
    else if (m.right > innerWidth - 12) { prop('--pop-left', 'auto'); prop('--pop-right', '12px'); }
  };
  let set;
  if (nativePopover) {
    panel.setAttribute('popover', 'auto');
    btn.setAttribute('popovertarget', panel.id);
    panel.addEventListener('beforetoggle', (e) => { if (e.newState === 'open') place(); });
    panel.addEventListener('toggle', (e) => {
      btn.setAttribute('aria-expanded', String(e.newState === 'open'));
      if (e.newState === 'open') { clamp(); onOpen?.(); }
    });
    set = (v) => {
      const open = panel.matches(':popover-open');
      if (v && !open) panel.showPopover();
      if (!v && open) panel.hidePopover();
    };
  } else {
    panel.hidden = true;
    set = (v) => {
      if (v) place();
      panel.hidden = !v;
      btn.setAttribute('aria-expanded', String(v));
      if (v) { clamp(); onOpen?.(); }
    };
    btn.addEventListener('click', () => {
      const v = panel.hidden;
      popovers.forEach((p) => p.set(false));
      set(v);
    });
  }
  const p = { btn, panel, set, isOpen: () => (nativePopover ? panel.matches(':popover-open') : !panel.hidden) };
  popovers.push(p);
  return p;
}
if (!nativePopover) {
  document.addEventListener('click', (e) => {
    popovers.forEach((p) => { if (p.isOpen() && !p.btn.contains(e.target) && !p.panel.contains(e.target)) p.set(false); });
  });
}

// 下拉選單：開啟時聚焦第一項，↑／↓／Home／End 移動，Tab 離開時關閉。
function menuKeys(menu, p) {
  const items = () => [...menu.querySelectorAll('[role^="menuitem"]')].filter((x) => !x.closest('[hidden]'));
  menu.addEventListener('keydown', (e) => {
    const list = items();
    const k = list.indexOf(document.activeElement);
    if (k < 0 && e.key === 'ArrowUp') { e.preventDefault(); list[list.length - 1]?.focus(); return; }
    const next = { ArrowDown: list[(k + 1) % list.length], ArrowUp: list[(k - 1 + list.length) % list.length],
                   Home: list[0], End: list[list.length - 1] }[e.key];
    if (next) { e.preventDefault(); next.focus(); }
    if (e.key === 'Tab') {
      p.set(false);
      // 不支援 Popover API 時，關閉後焦點不會自動回到按鈕，先移回再讓 Tab 繼續。
      if (!nativePopover) p.btn.focus();
    }
  });
  return () => items()[0]?.focus();
}

// 操作結果提示（複製、匯出），同時供螢幕閱讀器讀出。
const toast = el('p', { class: 'toast float', role: 'status' });
let toastTimer = 0;
function notify(text) {
  // 先清空再寫入，連續相同的訊息也會再讀一次。
  toast.textContent = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.textContent = text;
    toastTimer = setTimeout(() => { toast.textContent = ''; }, 2000);
  }, 50);
}

const diagrams = [];
let badCount = 0;
const sections = [...document.querySelectorAll('section.diagram')];
document.documentElement.classList.add('app');

// 說明視窗：頁面標題與摘要，加上目前這張圖的標題、一句話結論、圖例與原始碼。
const page = document.querySelector('.page');
const info = el('aside', { id: 'info', 'aria-label': T.info });
const closeInfo = el('button', { type: 'button', class: 'close', 'aria-label': T.close, title: T.close }, '×');
const expandInfo = el('button', { type: 'button', class: 'expand', 'aria-expanded': 'false', 'aria-controls': 'info' }, T.expand);
info.append(closeInfo);
// 說明視窗最底部：產生工具與專案連結（另開視窗、不帶 referrer）。
const credit = el('p', { class: 'credit' });
const repoA = el('a', { href: APP.repo, target: '_blank', rel: 'noopener noreferrer', 'aria-label': T.repoLink }, `diagram-first v${APP.version} · GitHub`);
credit.append(...[T.madeWith, repoA, T.madeWithAfter].filter(Boolean).flatMap((x, k) => (k ? [' ', x] : [x])));

// 觸控裝置用精簡版提示，不列出滾輪與鍵盤操作。
const hint = el('p', { id: 'canvas-hint', class: 'hint' }, matchMedia('(any-pointer: fine)').matches ? T.hint : T.hintTouch);
const headerEl = document.querySelector('header');
if (headerEl) info.append(headerEl);
page.prepend(info);
const notes = new Map();

for (const [i, section] of sections.entries()) {
  if (!section.id) section.id = `diagram-${i + 1}`;
  const title = section.querySelector('h2')?.textContent.trim() || `#${i + 1}`;
  section.dataset.title = title;
  const note = el('div', { class: 'notes' });
  note.append(el('h3', {}, title));
  const caption = section.querySelector('.caption');
  if (caption) note.append(caption);
  notes.set(section, note);
  section.append(note);

  const srcNode = section.querySelector('script.mermaid-src');
  if (!srcNode) continue;
  const source = dedent(srcNode.textContent);

  const toolbar = el('div', { class: 'toolbar', role: 'toolbar', 'aria-label': title });
  const canvas = el('div', { class: 'canvas', role: 'region', 'aria-label': title, 'aria-describedby': 'canvas-hint', tabindex: '0' });
  const details = el('details');
  const pre = el('pre', { tabindex: '0' });
  pre.append(el('code', {}, source));
  details.append(el('summary', {}, T.source), pre);
  srcNode.after(canvas, toolbar);
  const legend = section.querySelector('.legend');
  if (legend) {
    const items = legend.querySelectorAll('li').length;
    const box = el('details', { class: 'legend-box', open: '' });
    box.append(el('summary', {}, items ? `${T.legend} (${items})` : T.legend), legend);
    note.append(box);
  }
  // Agent 註解：<ol class="annotations"><li data-node="節點 id">文字</li></ol>，移到說明視窗，依序編號。
  const annList = section.querySelector('ol.annotations');
  const anns = annList ? [...annList.querySelectorAll(':scope > li')].map((li) => ({ node: li.dataset.node || null, text: li.textContent.trim() }))
    .filter((a) => a.text).map((a, k) => ({ ...a, n: k + 1 })) : [];
  if (annList) {
    annList.remove();
    if (anns.length) {
      const box = el('div', { class: 'ann-box' });
      const ol = el('ol', { class: 'ann-list' });
      anns.forEach((a) => {
        const li = el('li', { value: String(a.n) });
        a.item = li;
        li.append(a.text);
        ol.append(li);
      });
      box.append(el('h4', {}, `${T.annTitle} (${anns.length})`), ol);
      note.append(box);
    }
  }
  note.append(details);

  // ⋯ 選單：下載、複製圖片、複製原始碼。
  const moreBtn = el('button', { type: 'button', 'aria-label': T.more, title: T.more, 'aria-haspopup': 'menu', 'aria-controls': `more-${i + 1}` }, '⋯');
  const menu = el('div', { class: 'pop menu', id: `more-${i + 1}`, role: 'menu', 'aria-label': T.more });
  toolbar.append(moreBtn);
  document.body.append(menu);
  let focusFirst = () => {};
  const more = popover(moreBtn, menu, 'up', () => { syncSizes(); focusFirst(); });
  focusFirst = menuKeys(menu, more);
  const menuItem = (label, run) => {
    const b = el('button', { type: 'button', role: 'menuitem', tabindex: '-1' }, label);
    b.addEventListener('click', async () => {
      more.set(false);
      moreBtn.focus();
      await run();
    });
    menu.append(b);
    return b;
  };
  menuItem(T.copy, async () => {
    try {
      await navigator.clipboard.writeText(source);
      notify(T.copied);
    } catch {
      notify(T.copyFail);
      details.open = true;
      showInfo(true);
    }
  });
  const syncToolbar = rovingToolbar(toolbar);
  const reportItem = menuItem(T.reportMenu, () => copyReport(i));
  reportItem.title = T.reportTitle;

  try {
    await mermaid.parse(source);
  } catch (e) {
    badCount++;
    const box = el('div', { class: 'err' }, T.parseFail);
    errors.set(i, String(e.message || e));
    box.append(el('pre', {}, String(e.message || e)), reportButton(i));
    canvas.append(box);
    details.open = true;
    continue;
  }

  const d = { i, section, source, canvas, details, toolbar, ok: false, svg: '', scale: 1, tx: 0, ty: 0,
              direction: 'page', fit: true, syncToolbar, anns };
  // 輸出尺寸超過瀏覽器上限而縮小時，提示實際像素。
  const report = (r) => { if (r.capped) notify(T.capped(r.width, r.height)); };
  const download = async (v) => {
    const name = `diagram-${i + 1}`;
    try {
      if (v === 'svg') saveBlob(new Blob([(await exportSvg(d, false)).svg], { type: 'image/svg+xml' }), `${name}.svg`);
      else if (v === 'pdf') {
        const r = await exportImage(d, 'image/jpeg', false);
        const vb = svgSize(r.svg);
        saveBlob(await jpegToPdf(r, vb.w, vb.h), `${name}.pdf`);
        report(r);
      } else {
        const type = v === 'png-transparent' ? 'image/png' : `image/${v}`;
        const ext = v === 'jpeg' ? 'jpg' : v === 'png-transparent' ? 'png' : v;
        const r = await exportImage(d, type, v === 'png-transparent');
        saveBlob(r.blob, `${name}.${ext}`);
        report(r);
      }
    } catch {
      notify(T.exportFail);
    }
  };
  const copyImage = async () => {
    try {
      let r = null;
      const png = exportImage(d, 'image/png', false).then((x) => { r = x; return x.blob; });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      notify(r && r.capped ? T.capped(r.width, r.height) : T.copied);
    } catch {
      notify(T.copyFail);
    }
  };
  // 匯出選項：大小（倍率或最大）、版面（只有圖／卡片）、配色（跟隨畫面／淺色／深色）。所有圖共用並記在 localStorage；
  // 點選不關閉選單，第一列顯示這張圖實際輸出的像素。
  const opts = el('div', { class: 'opts' });
  d.sizeLabel = el('span', { class: 'size-label', 'aria-hidden': 'true' });
  const optRow = (key, label, values) => {
    const row = el('div', { class: 'sizes', role: 'group', 'aria-label': label });
    if (key !== 'size') row.append(el('span', { class: 'opt-label', 'aria-hidden': 'true' }, label));
    row.append(...values.map(([v, text]) => {
      const b = el('button', { type: 'button', role: 'menuitemradio', tabindex: '-1', 'data-opt': key, 'data-value': v }, text);
      b.addEventListener('click', () => setExportOpt(key, v));
      return b;
    }));
    return row;
  };
  const sizeRow = optRow('size', T.size, EXPORT.sizes.map((v) => [v, v === 'max' ? T.sizeMax : `${v}x`]));
  sizeRow.prepend(d.sizeLabel);
  opts.append(sizeRow,
    optRow('layout', T.layout, [['plain', T.layoutPlain], ['card', T.layoutCard]]),
    optRow('palette', T.palette, [['follow', T.paletteFollow], ['light', T.light], ['dark', T.dark]]));
  d.inkRow = optRow('ink', T.inkLabel, [['on', T.inkOn], ['off', T.inkOff]]);
  d.inkRow.hidden = true;
  opts.append(d.inkRow);
  // 圖片相關項目放在原始碼之前；render 失敗時隱藏。
  d.imageItems = [opts, ...FORMATS.map(([v, label]) => menuItem(T.downloadAs(label || T.transparent), () => download(v))),
                  Object.assign(menuItem(T.printPdf, () => printOne(d)), { title: T.printTitle }), menuItem(T.copyImage, copyImage)];
  // 問題回報不受 render 成敗影響，排在最後，語法錯誤時也能用。
  menu.append(reportItem);
  menu.prepend(...d.imageItems);
  d.imageItems.forEach((b) => { b.hidden = true; });
  const zoom = el('div', { class: 'zoom', role: 'group' });
  const outBtn = el('button', { type: 'button', 'aria-label': T.zoomOut, title: T.zoomOut }, '−');
  d.level = el('button', { type: 'button', class: 'level', title: T.zoomActual }, '');
  const inBtn = el('button', { type: 'button', 'aria-label': T.zoomIn, title: T.zoomIn }, '+');
  const resetBtn = el('button', { type: 'button', title: `${T.fitTitle} (0)` }, T.reset);
  outBtn.addEventListener('click', () => setZoom(d, currentScale(d) / ZOOM.step));
  inBtn.addEventListener('click', () => setZoom(d, currentScale(d) * ZOOM.step));
  d.level.addEventListener('click', () => setZoom(d, 1));
  resetBtn.addEventListener('click', () => fitScreen(d));
  zoom.append(outBtn, d.level, inBtn);
  const penBtn = el('button', { type: 'button', class: 'pen-btn', 'aria-label': T.pen, title: `${T.pen} (P)`, 'aria-pressed': 'false' }, '✎');
  penBtn.addEventListener('click', () => setPen(!penOn));
  d.buttons = [zoom, resetBtn, penBtn];
  if (isDirected(source)) {
    const dirSelect = el('select', { 'aria-label': T.direction, title: T.direction });
    [['page', T.followPage], ['vertical', T.vertical], ['horizontal', T.horizontal]]
      .forEach(([v, label]) => dirSelect.append(el('option', { value: v }, label)));
    dirSelect.addEventListener('change', async () => {
      d.direction = dirSelect.value;
      // 方向改變後圖的尺寸不同，舊倍率不再適用，重新符合視窗。
      d.fit = true;
      await renderOne(d);
    });
    d.buttons.push(dirSelect);
  }
  bindGestures(d);
  bindNodes(d);
  // 說明視窗的註解：有對應節點的可點擊，鎖定並帶到該節點。
  anns.forEach((a) => {
    a.item?.addEventListener('click', () => {
      if (!a.target) return;
      if (selected?.node !== a.target) select(d, a.target);
      else ensureVisible(d, a.target.el);
    });
  });
  diagrams.push(d);
}

function setExportOpt(key, v) {
  if (key === 'size') { exportSize = v; save(STORE.size, v); }
  if (key === 'layout') { exportLayout = v; save(STORE.layout, v); }
  if (key === 'palette') { exportPalette = v; save(STORE.palette, v); }
  if (key === 'ink') exportInk = v;
  syncSizes();
}
// ---- 節點索引：由 Mermaid 的 diagram 資料取得節點與連線，對應到 SVG 元素。解析不到時整個高亮功能不出現（例如 sequence）。----
async function indexGraph(d, source) {
  d.graph = null;
  let data;
  try {
    const dg = await mermaid.mermaidAPI.getDiagramFromText(source);
    data = typeof dg.db.getData === 'function' ? dg.db.getData() : null;
  } catch { return; }
  const svg = d.canvas.querySelector('svg');
  if (!svg || !data || !data.nodes?.length || !data.edges?.length) return;
  const pre = svg.id + '-';
  const exact = new Map();
  const loose = new Map();
  svg.querySelectorAll('g.node').forEach((g) => {
    if (!g.id.startsWith(pre)) return;
    const k = g.id.slice(pre.length);
    exact.set(k, g);
    // 部分圖種（例如 class）的 DOM id 尾端流水號與資料不同，去掉尾端數字後若唯一也可對應。
    const s = k.replace(/-\d+$/, '');
    loose.set(s, loose.has(s) ? null : g);
  });
  const nodes = new Map();
  const used = new Set();
  for (const n of data.nodes) {
    if (n.isGroup) continue;
    const keys = [n.domId, n.id].filter(Boolean).map(String);
    const g = keys.map((k) => exact.get(k)).find(Boolean) || keys.map((k) => loose.get(k.replace(/-\d+$/, ''))).find(Boolean);
    if (!g || used.has(g)) continue;
    used.add(g);
    const raw = typeof n.label === 'string' && !/[<>]/.test(n.label) && n.label !== 'undefined' ? n.label : '';
    const shown = (g.querySelector('.nodeLabel, .label, text')?.textContent || g.textContent || '').replace(/\s+/g, ' ').trim();
    const label = /^(stateStart|stateEnd)$/.test(n.shape) ? (n.shape === 'stateStart' ? '[*] start' : '[*] end') : shown || raw || String(n.id);
    // 原始碼裡的 id：mindmap 在 nodeId，ER 的 id 是 entity-名稱-流水號；其他圖種就是 id。註解與節點引用都用它。
    const src = n.nodeId ?? String(n.id).match(/^entity-(.+)-\d+$/)?.[1] ?? n.id;
    nodes.set(n.id, { id: n.id, src: String(src), el: g, label, out: [], in: [] });
  }
  const edgeEls = new Map();
  svg.querySelectorAll('[data-id]').forEach((x) => {
    if (x.closest('g.node')) return;
    const list = edgeEls.get(x.dataset.id) || [];
    list.push(x);
    edgeEls.set(x.dataset.id, list);
  });
  let count = 0;
  for (const e of data.edges) {
    const a = nodes.get(e.start);
    const b = nodes.get(e.end);
    const els = edgeEls.get(e.id) || [];
    if (!a || !b) continue;
    els.forEach((x) => x.setAttribute('data-hl-edge', ''));
    const edge = { a, b, els };
    a.out.push(edge);
    b.in.push(edge);
    count++;
  }
  if (nodes.size < 2 || !count) return;
  d.graph = { nodes, byEl: new Map([...nodes.values()].map((n) => [n.el, n])), bySrc: new Map([...nodes.values()].map((n) => [n.src, n])) };
  // 節點用 roving tabindex：整張圖只有一個 Tab 停留點，節點之間用 [ ]、Alt＋方向鍵移動。
  let first = true;
  for (const n of nodes.values()) {
    const { ups, downs } = reach(n);
    n.el.setAttribute('tabindex', first ? '0' : '-1');
    first = false;
    n.el.setAttribute('role', 'button');
    n.el.setAttribute('aria-pressed', 'false');
    n.el.setAttribute('aria-label', T.nodeAria(n.label, ups.size, downs.size));
  }
}

// 註解徽章：在對應節點右上角畫編號圓點（SVG 座標，跟著圖平移縮放）；說明視窗的註解可點擊定位並鎖定節點。
// 找不到節點（或圖種沒有節點資料）的註解只列在說明視窗，並記下供狀態列提示。
function placeAnnotations(d) {
  const svg = d.canvas.querySelector('svg');
  if (!svg || !d.anns.length) return;
  // 未顯示的圖（display: none）量不到節點位置；先記下，切換到這張圖時再放。
  d.annPending = !d.canvas.clientWidth;
  svg.querySelector(':scope > g.ann-layer')?.remove();
  const SVGNS = 'http://www.w3.org/2000/svg';
  const vb = svg.viewBox.baseVal;
  const box = svg.getBoundingClientRect();
  const k = box.width ? vb.width / box.width : 1;
  const layer = document.createElementNS(SVGNS, 'g');
  layer.setAttribute('class', 'ann-layer');
  layer.setAttribute('aria-hidden', 'true');
  const stack = new Map();
  d.anns.forEach((a) => {
    a.target = a.node !== null ? d.graph?.bySrc.get(a.node) || d.graph?.nodes.get(a.node) || null : null;
    a.pos = null;
    if (a.item) {
      a.item.classList.toggle('linked', Boolean(a.target));
      a.item.title = a.node !== null ? T.annItem(a.n, a.node) : '';
    }
    if (!a.target || d.annPending) return;
    const r = a.target.el.getBoundingClientRect();
    const count = stack.get(a.target) || 0;
    stack.set(a.target, count + 1);
    // 一般節點放右上角；菱形等多邊形的外框角落是空白，改放在頂點右側。
    const poly = a.target.el.querySelector(':scope > polygon, :scope > g > polygon');
    const sx = poly ? r.left + r.width / 2 + 14 : r.right;
    const sy = poly ? r.top + 6 : r.top;
    const x = vb.x + (sx - box.left) * k - count * 18;
    const y = vb.y + (sy - box.top) * k;
    a.pos = { x, y };
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'ann-badge');
    g.setAttribute('transform', `translate(${x} ${y})`);
    g.dataset.ann = String(a.n);
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('r', '9');
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dy', '0.35em');
    t.textContent = String(a.n);
    g.append(c, t);
    layer.append(g);
  });
  svg.append(layer);
  // 有註解的節點：無障礙名稱附上註解全文（只加一次）。
  d.graph?.nodes.forEach((n) => {
    const texts = annsOf(d, n).map((a) => a.text);
    if (!texts.length || n.el.dataset.annAria) return;
    n.el.dataset.annAria = '1';
    n.el.setAttribute('aria-label', n.el.getAttribute('aria-label') + T.annAria(texts.join('；')));
  });
}
const annsOf = (d, node) => d.anns.filter((a) => a.target === node);
// 匯出用：把徽章加進匯出的 SVG（只有卡片版面使用），並回傳文字清單。
function exportAnnotations(d, svgText) {
  const placed = d.anns.filter((a) => a.pos);
  if (!placed.length) return svgText;
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.documentElement;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const layer = doc.createElementNS(SVGNS, 'g');
  const map = viewMap(d, root);
  if (map) layer.setAttribute('transform', map);
  root.append(layer);
  placed.forEach((a) => {
    const g = doc.createElementNS(SVGNS, 'g');
    g.setAttribute('transform', `translate(${a.pos.x} ${a.pos.y})`);
    const c = doc.createElementNS(SVGNS, 'circle');
    [['r', '9'], ['fill', '#BF8700']].forEach(([k, v]) => c.setAttribute(k, v));
    const t = doc.createElementNS(SVGNS, 'text');
    [['text-anchor', 'middle'], ['dy', '0.35em'], ['fill', '#FFFFFF'], ['font-size', '11'], ['font-weight', '700'], ['font-family', font]].forEach(([k, v]) => t.setAttribute(k, v));
    t.textContent = String(a.n);
    g.append(c, t);
    layer.append(g);
  });
  return new XMLSerializer().serializeToString(root);
}

// ---- 畫筆：暫時的白板筆跡。畫在圖的 SVG 座標上（跟著平移縮放），只存在記憶體，不保存；可帶進匯出與列印。----
// 筆跡依「圖＋實際方向」分組：切換方向會重新排版，筆跡先藏起來，切回原方向再出現；換 Theme 時保留。
const TOOLS = [
  { id: 'red', label: 'penRed', color: '#E5484D', width: 3 },
  { id: 'blue', label: 'penBlue', color: '#0969DA', width: 3 },
  { id: 'ink', label: 'penInk', color: null, width: 3 },
  { id: 'hl', label: 'highlighter', color: '#FFD33D', width: 16, opacity: 0.4 },
  { id: 'laser', label: 'laser', color: '#FF3B30', width: 4 },
  { id: 'eraser', label: 'eraser' },
];
let penOn = false;
let tool = TOOLS[0];
let stroke = null;
let spaceDown = false;
// 方向不影響排版的圖種（sequence、gantt 等）只有一組筆跡。
const layoutKey = (d) => {
  if (!isDirected(d.source)) return 'fixed';
  const v = dirOf(d);
  return v === 'auto' ? (landscape.matches ? 'horizontal' : 'vertical') : v;
};
function inkOf(d) {
  d.ink ||= new Map();
  const k = layoutKey(d);
  if (!d.ink.has(k)) d.ink.set(k, { strokes: [], history: [] });
  return d.ink.get(k);
}
const hasInk = () => diagrams.some((d) => d.ink && [...d.ink.values()].some((x) => x.strokes.length));
// 畫筆模式中，或觸控筆（不必切模式）按下時畫線；按住 Space 時改為平移。
const wantsInk = (e) => !spaceDown && (e.pointerType === 'pen' ? e.button === 0 : penOn && (e.pointerType !== 'mouse' || e.button === 0));
function inkLayer(d) {
  const svg = d.canvas.querySelector('svg');
  let g = svg?.querySelector(':scope > g.ink');
  if (svg && !g) {
    g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'ink');
    g.setAttribute('aria-hidden', 'true');
    svg.append(g);
  }
  return g;
}
function toSvg(d, e) {
  const svg = d.canvas.querySelector('svg');
  const m = svg.getScreenCTM()?.inverse();
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
  return [Math.round(pt.x * 10) / 10, Math.round(pt.y * 10) / 10];
}
// 以中點的二次曲線連接各點，畫出平滑的線。
function pathData(pts) {
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}l0.01 0`;
  let p = `M${pts[0][0]} ${pts[0][1]}`;
  for (let k = 1; k < pts.length - 1; k++) {
    const [x, y] = pts[k];
    const [nx, ny] = pts[k + 1];
    p += `Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${p}L${lx} ${ly}`;
}
// dark 指定深淺色：黑筆（跟隨前景色）在深色畫布或深色匯出時改用淺色前景。
function strokeEl(s, doc = document, dark = null) {
  const el = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  const color = s.color || tokenColor('--text', dark ?? s.d.canvas.classList.contains('dark'));
  [['d', pathData(s.pts)], ['fill', 'none'], ['stroke', color], ['stroke-width', s.width], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round']]
    .forEach(([k, v]) => el.setAttribute(k, v));
  if (s.opacity) el.setAttribute('stroke-opacity', s.opacity);
  return el;
}
function drawInk(d) {
  const g = inkLayer(d);
  if (!g) return;
  g.replaceChildren();
  inkOf(d).strokes.forEach((s) => { s.el = strokeEl(s); g.append(s.el); });
  // 畫面重繪（例如換 Theme）後黑筆顏色跟著深淺色更新。
}
function startStroke(d, e) {
  const c = d.canvas;
  try { c.setPointerCapture(e.pointerId); } catch {}
  if (tool.id === 'eraser') {
    stroke = { d, id: e.pointerId, erase: true, touch: e.pointerType === 'touch', last: { x: e.clientX, y: e.clientY } };
    eraseAt(d, e);
  } else {
    // 線寬以「畫下當時的螢幕像素」換算成圖的座標，之後跟著圖一起縮放。
    const s = { d, pts: [toSvg(d, e)], color: tool.color, width: Math.round((tool.width / d.scale) * 100) / 100, opacity: tool.opacity };
    s.el = strokeEl(s);
    if (tool.id === 'laser') s.el.setAttribute('class', 'laser');
    // 不在畫筆模式時的觸控筆：移動超過門檻才開始畫，單純點一下（例如點節點）不留下墨點。
    const lazy = !penOn;
    if (!lazy) inkLayer(d).append(s.el);
    stroke = { d, id: e.pointerId, s, lazy, start: { x: e.clientX, y: e.clientY }, laser: tool.id === 'laser', touch: e.pointerType === 'touch', last: { x: e.clientX, y: e.clientY } };
  }
  const moveInk = (ev) => {
    if (!stroke || ev.pointerId !== stroke.id) return;
    stroke.last = { x: ev.clientX, y: ev.clientY };
    if (stroke.erase) { eraseAt(d, ev); return; }
    if (stroke.lazy) {
      if (Math.hypot(ev.clientX - stroke.start.x, ev.clientY - stroke.start.y) < PAN.threshold) return;
      stroke.lazy = false;
      inkLayer(d).append(stroke.s.el);
    }
    const evs = ev.getCoalescedEvents?.() || [ev];
    evs.forEach((x) => {
      const pt = toSvg(d, x);
      const prev = stroke.s.pts[stroke.s.pts.length - 1];
      // 太近的點略過，減少路徑長度。
      if (Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) * d.scale >= 2) stroke.s.pts.push(pt);
    });
    stroke.s.el.setAttribute('d', pathData(stroke.s.pts));
  };
  const up = (ev) => {
    if (!stroke || ev.pointerId !== stroke.id) return;
    removeEventListener('pointermove', moveInk);
    removeEventListener('pointerup', up);
    removeEventListener('pointercancel', up);
    const done = stroke;
    stroke = null;
    if (done.erase || done.lazy) return;
    if (done.laser) {
      // 雷射筆：約 1.5 秒後淡出，不留下筆跡；偏好減少動態時直接消失。
      setTimeout(() => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { done.s.el.remove(); return; }
        done.s.el.classList.add('fade');
        setTimeout(() => done.s.el.remove(), 400);
      }, 1500);
      return;
    }
    const ink = inkOf(d);
    ink.strokes.push(done.s);
    ink.history.push({ add: done.s });
    syncSizes();
  };
  stroke.cleanup = () => { removeEventListener('pointermove', moveInk); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
  addEventListener('pointermove', moveInk);
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
}
function cancelStroke() {
  if (!stroke) return;
  stroke.cleanup();
  stroke.s?.el.remove();
  stroke = null;
}
// 橡皮擦：以整條筆劃為單位，指標經過（約 10px 內）就刪除，可復原。以點到折線的距離判斷，不必剛好點中細線。
function eraseAt(d, e) {
  const ink = inkOf(d);
  const [px, py] = toSvg(d, e);
  const near = (s) => {
    const r = Math.max(s.width / 2, 10 / d.scale);
    return s.pts.some(([x, y], k) => {
      const [ax, ay] = k ? s.pts[k - 1] : [x, y];
      const dx = x - ax;
      const dy = y - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= r;
    });
  };
  const k = ink.strokes.findLastIndex(near);
  if (k < 0) return;
  const [s] = ink.strokes.splice(k, 1);
  s.el.remove();
  ink.history.push({ erase: s, at: k });
  syncSizes();
}
function undoInk(d) {
  const ink = inkOf(d);
  const h = ink.history.pop();
  if (!h) return;
  if (h.add) ink.strokes.splice(ink.strokes.indexOf(h.add), 1);
  if (h.erase) ink.strokes.splice(h.at, 0, h.erase);
  if (h.clear) ink.strokes.push(...h.clear);
  drawInk(d);
  syncSizes();
}
function clearInk(d) {
  const ink = inkOf(d);
  if (!ink.strokes.length) return;
  ink.history.push({ clear: ink.strokes.splice(0) });
  drawInk(d);
  syncSizes();
  notify(T.inkCleared);
}
// 匯出用的 SVG 若重新 render（換配色或改用純 SVG 標籤），viewBox 可能和畫面不同；筆跡與徽章依兩者的 viewBox 等比對應過去。
function viewMap(d, root) {
  const a = svgSize(d.svg);
  const ob = (d.svg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 1 1').split(/[\s,]+/).map(Number);
  const nb = (root.getAttribute('viewBox') || '0 0 1 1').split(/[\s,]+/).map(Number);
  if (ob.every((v, k) => Math.abs(v - nb[k]) < 0.5)) return '';
  return `translate(${nb[0]} ${nb[1]}) scale(${nb[2] / a.w} ${nb[3] / a.h}) translate(${-ob[0]} ${-ob[1]})`;
}
// 匯出：把目前排版的筆跡加進匯出的 SVG（雷射筆不包含）；黑筆依匯出配色決定深淺。
function withInk(d, svgText, dark) {
  const strokes = inkOf(d).strokes;
  if (!strokes.length) return svgText;
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  const map = viewMap(d, doc.documentElement);
  if (map) g.setAttribute('transform', map);
  strokes.forEach((s) => g.append(strokeEl(s, doc, dark)));
  const root = doc.documentElement;
  root.append(g);
  // 筆跡超出圖的範圍時，擴大匯出的 viewBox 把筆跡包進來（含線寬與一點邊距）。
  const vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length === 4 && !map) {
    let [x0, y0, x1, y1] = [vb[0], vb[1], vb[0] + vb[2], vb[1] + vb[3]];
    strokes.forEach((s) => s.pts.forEach(([x, y]) => {
      const r = s.width / 2 + 8;
      x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r);
    }));
    if (x0 < vb[0] || y0 < vb[1] || x1 > vb[0] + vb[2] || y1 > vb[1] + vb[3]) {
      root.setAttribute('viewBox', `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
      root.removeAttribute('style');
    }
  }
  return new XMLSerializer().serializeToString(root);
}

// 畫筆工具列：固定在右側，畫筆模式時顯示。
const penbar = el('div', { id: 'penbar', class: 'float', role: 'toolbar', 'aria-label': T.penTools, hidden: '' });
const toolBtns = TOOLS.map((t) => {
  const b = el('button', { type: 'button', 'aria-label': T[t.label], title: T[t.label], 'aria-pressed': String(t === tool), 'data-tool': t.id });
  b.append(el('span', { class: 'swatch', 'aria-hidden': 'true' }));
  b.addEventListener('click', () => {
    tool = t;
    toolBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    document.documentElement.classList.toggle('erasing', t.id === 'eraser');
  });
  return b;
});
const curDiagram = () => diagrams.find((x) => x.section === sections[current]);
const undoBtn = el('button', { type: 'button', 'aria-label': T.undo, title: `${T.undo} (⌘/Ctrl+Z)` }, '↶');
undoBtn.addEventListener('click', () => { const d = curDiagram(); if (d) undoInk(d); });
const clearBtn = el('button', { type: 'button', 'aria-label': T.clearInk, title: T.clearInk }, '🗑');
clearBtn.addEventListener('click', () => { const d = curDiagram(); if (d) clearInk(d); });
const exitBtn = el('button', { type: 'button', 'aria-label': T.exitPen, title: `${T.exitPen} (Esc)` }, '×');
exitBtn.addEventListener('click', () => setPen(false));
penbar.append(...toolBtns, el('span', { class: 'sep', 'aria-hidden': 'true' }), undoBtn, clearBtn, exitBtn);
function setPen(on) {
  penOn = on;
  penbar.hidden = !on;
  document.documentElement.classList.toggle('pen-on', on);
  document.querySelectorAll('.pen-btn').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  if (on) diagrams.forEach((d) => { if (!selected || selected.d !== d) highlight(d, null); });
  else cancelStroke();
  notify(on ? (matchMedia('(any-pointer: fine)').matches ? T.penOn : T.penOnTouch) : T.penOff);
}
// 有筆跡時離開頁面先提醒（筆跡只在記憶體）。
addEventListener('beforeunload', (e) => { if (hasInk()) { e.preventDefault(); e.returnValue = T.inkLeave; } });
addEventListener('keyup', (e) => { if (e.key === ' ') spaceDown = false; });
addEventListener('blur', () => { spaceDown = false; });

// 上游與下游：沿連線方向往前、往後走訪所有可到達的節點（含間接）。
function reach(node) {
  const walk = (dir) => {
    const seen = new Set();
    const edges = new Set();
    const stack = [node];
    while (stack.length) {
      const n = stack.pop();
      for (const e of n[dir]) {
        edges.add(e);
        const m = dir === 'out' ? e.b : e.a;
        if (m !== node && !seen.has(m)) { seen.add(m); stack.push(m); }
      }
    }
    return { seen, edges };
  };
  const down = walk('out');
  const up = walk('in');
  return { ups: up.seen, downs: down.seen, edges: new Set([...up.edges, ...down.edges]) };
}

// 套用高亮：node 為 null 時清除。locked 表示使用者點選鎖定（hover／focus 只是預覽）。
function highlight(d, node) {
  const svg = d.canvas.querySelector('svg');
  if (!svg) return;
  svg.querySelectorAll('.hl-on, .hl-sel, .hl-lock').forEach((x) => x.classList.remove('hl-on', 'hl-sel', 'hl-lock'));
  svg.classList.toggle('hl', Boolean(node));
  if (!node) return;
  const r = reach(node);
  node.el.classList.add('hl-on', 'hl-sel');
  if (selected?.node === node) node.el.classList.add('hl-lock');
  [...r.ups, ...r.downs].forEach((n) => n.el.classList.add('hl-on'));
  r.edges.forEach((e) => e.els.forEach((x) => x.classList.add('hl-on')));
}

const selbar = el('div', { id: 'selbar', class: 'float', role: 'group', 'aria-label': T.selected, hidden: '' });
const selText = el('span', { class: 'sel-text' });
const selCopy = el('button', { type: 'button' }, T.copyRef);
const selClear = el('button', { type: 'button', 'aria-label': T.clearSel, title: `${T.clearSel} (Esc)` }, '×');
const selNote = el('div', { class: 'sel-note', hidden: '' });
selbar.append(selText, selCopy, selClear, selNote);
let selected = null;
const selLive = el('p', { class: 'sr-only', role: 'status' });

// quiet 為 true 時不播報（重繪後還原選取）。
function select(d, node, quiet = false) {
  if (selected?.node === node) node = null;
  if (selected) selected.node.el.setAttribute('aria-pressed', 'false');
  selected = node ? { d, node } : null;
  highlight(d, node);
  if (node) {
    node.el.setAttribute('aria-pressed', 'true');
    node.el.classList.add('hl-lock');
    const r = reach(node);
    const full = T.selInfo(node.label, r.ups.size, r.downs.size);
    // 窄螢幕用精簡文字（↑ 上游、↓ 下游），完整文字留在 title 與螢幕閱讀器的播報。
    selText.replaceChildren(el('span', { class: 'full' }, full), el('span', { class: 'short' }, `${node.label} ↑${r.ups.size} ↓${r.downs.size}`));
    selText.title = full;
    // 節點有 Agent 註解時，在浮動列第二行顯示全文。
    const notesHere = annsOf(d, node);
    selNote.replaceChildren(...notesHere.map((a) => el('span', {}, `${a.n}. ${a.text}`)));
    selNote.hidden = !notesHere.length;
    // 浮動列剛出現時 live region 常不會被唸出，改用常駐、只給螢幕閱讀器的播報區（畫面上已有浮動列，不再跳提示）。
    if (!quiet) { selLive.textContent = ''; requestAnimationFrame(() => { selLive.textContent = full; }); }
  }
  selbar.hidden = !node;
  // 浮動列佔掉底部空間，平移邊界與「全圖」要跟著讓位。
  root.style.setProperty('--sel-h', node ? `${selbar.offsetHeight + 12}px` : '0px');
  // 鎖定的節點若被浮動列或其他浮動元素蓋住，平移讓它露出來（沒被蓋住時不動）。
  if (node && !quiet) ensureVisible(d, node.el);
}
function clearSelection(d) {
  if (selected && (!d || selected.d === d)) select(selected.d, selected.node);
  else if (d) highlight(d, null);
}
// 節點引用：圖的位置、Mermaid 節點 id 與名稱、直接上下游（各最多 8 個）與全部上下游數量，Claude 能據此在原始碼定位。
function nodeRef(d, node) {
  const r = reach(node);
  const names = (list) => {
    const uniq = [...new Set(list)];
    if (!uniq.length) return T.none;
    const shown = uniq.slice(0, 8).map((n) => n.label).join('、');
    return uniq.length > 8 ? `${shown} ${T.andMore(uniq.length - 8)}` : shown;
  };
  const k = sections.indexOf(d.section) + 1;
  // mindmap 等圖種的 id 是自動流水號，對定位沒有幫助，省略。
  const id = /^\d+$/.test(node.src) ? '' : node.src;
  const texts = annsOf(d, node).map((a) => a.text);
  return T.nodeRef(k, sections.length, d.section.dataset.title, id, node.label,
    names(node.in.map((e) => e.a)), names(node.out.map((e) => e.b)), r.ups.size, r.downs.size) + (texts.length ? T.annRef(texts.join('；')) : '');
}
selCopy.addEventListener('click', async () => {
  if (!selected) return;
  try {
    await navigator.clipboard.writeText(nodeRef(selected.d, selected.node));
    notify(T.copied);
  } catch {
    notify(T.copyFail);
  }
});
selClear.addEventListener('click', () => {
  const n = selected?.node;
  clearSelection();
  n?.el.focus({ preventScroll: true });
});

// 節點互動：滑鼠移入或鍵盤聚焦時預覽，點擊或 Enter／Space 鎖定，Esc 或點空白處取消。
function bindNodes(d) {
  const c = d.canvas;
  const nodeOf = (t) => d.graph?.byEl.get(t.closest?.('g.node'));
  const preview = (n) => { if (!penOn && (!selected || selected.d !== d)) highlight(d, n); };
  // 滑鼠離開節點時，若鍵盤焦點仍在某個節點上，回到該節點的預覽。
  const focused = () => (document.activeElement?.matches?.(':focus-visible') ? nodeOf(document.activeElement) : null);
  c.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') { const n = nodeOf(e.target); if (n) preview(n); } });
  c.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse' || !nodeOf(e.target) || nodeOf(e.relatedTarget || c) === nodeOf(e.target)) return;
    preview(focused() || null);
  });
  c.addEventListener('click', (e) => {
    if (c.classList.contains('dragging') || !d.graph || penOn) return;
    // 帶連結的節點交給連結本身，不同時鎖定。
    if (e.target.closest?.('a')) return;
    const badge = e.target.closest?.('.ann-badge');
    const n = badge ? d.anns.find((a) => String(a.n) === badge.dataset.ann)?.target : nodeOf(e.target);
    if (n) select(d, n);
    else if (selected?.d === d) clearSelection();
  });
  // 只有鍵盤聚焦（:focus-visible）才預覽並平移；滑鼠點擊造成的聚焦不移動圖，避免點擊或拖曳時跳動。
  c.addEventListener('focusin', (e) => {
    const n = nodeOf(e.target);
    if (!n) return;
    d.graph.nodes.forEach((x) => x.el.setAttribute('tabindex', x === n ? '0' : '-1'));
    if (!e.target.matches(':focus-visible')) return;
    preview(n);
    ensureVisible(d, n.el);
  });
  c.addEventListener('focusout', (e) => { if (nodeOf(e.target) && !nodeOf(e.relatedTarget || c)) preview(null); });
  c.addEventListener('keydown', (e) => {
    const n = nodeOf(e.target);
    if (!n) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(d, n); return; }
    const next = moveTarget(d, n, e);
    // Alt＋方向鍵在 Windows／Linux 是瀏覽器的上一頁／下一頁；焦點在節點上時一律攔下，找不到目標就停在原節點。
    const altArrow = e.altKey && /^Arrow/.test(e.key);
    if (next || altArrow) { e.preventDefault(); e.stopPropagation(); next?.el.focus(); }
    else if (e.key === 'Escape' && !selected) { e.preventDefault(); c.focus(); }
  }, true);
  // 畫布是 overflow: hidden，瀏覽器聚焦節點時仍可能捲動它；一律歸零，改以平移帶到可見處。
  c.addEventListener('scroll', () => { if (c.scrollLeft || c.scrollTop) { c.scrollLeft = 0; c.scrollTop = 0; } });
}
// 節點間移動：[ ] 依文件順序前後移動；Alt＋方向鍵移到該方向最近的節點。
function moveTarget(d, n, e) {
  const list = [...d.graph.nodes.values()];
  if (e.key === '[' || e.key === ']') return list[(list.indexOf(n) + (e.key === ']' ? 1 : list.length - 1)) % list.length];
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!e.altKey || !dir) return null;
  const center = (x) => { const r = x.el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const [cx, cy] = center(n);
  let best = null;
  for (const m of list) {
    if (m === n) continue;
    const [x, y] = center(m);
    const along = (x - cx) * dir[0] + (y - cy) * dir[1];
    if (along <= 0) continue;
    const across = Math.abs((x - cx) * dir[1] + (y - cy) * dir[0]);
    const score = along + across * 2;
    if (!best || score < best.score) best = { m, score };
  }
  return best?.m || null;
}

// 節點不在上下浮動列之間的可見區時，平移把它帶進來。
function ensureVisible(d, node) {
  const r = node.getBoundingClientRect();
  const c = d.canvas.getBoundingClientRect();
  const { top, bottom } = barLimits(d);
  const dx = r.left < c.left + 16 ? c.left + 16 - r.left : r.right > c.right - 16 ? c.right - 16 - r.right : 0;
  const dy = r.top < c.top + top ? c.top + top - r.top : r.bottom > c.top + bottom ? c.top + bottom - r.bottom : 0;
  if (dx || dy) panBy(d, dx, dy);
}

// ---- 回報給 Claude：把錯誤、圖的位置、環境與原始碼整理成一段文字，貼回對話。----
// i 為 null 時（狀態列）：附上狀態列訊息與所有失敗的圖；沒有失敗的圖時（例如 ELK 警告）附上目前這張圖。
function buildReport(i) {
  const lines = [T.reportHead, `${T.reportPage}: ${document.title}`];
  if (i === null && statusEl.firstChild) lines.push(`${T.reportState}: ${statusEl.firstChild.textContent}`);
  const failed = sections.map((_, k) => k).filter((k) => errors.has(k));
  const list = i !== null ? [i] : failed.length ? failed : [current];
  const dirLabel = { auto: T.auto, vertical: T.vertical, horizontal: T.horizontal };
  for (const k of list) {
    const section = sections[k];
    const d = diagrams.find((x) => x.section === section);
    lines.push('', `${T.reportFig}: ${T.reportDiagram(k + 1, sections.length, section.dataset.title)}`);
    lines.push(`${T.reportState}: ${errors.get(k) || (d && d.ok ? T.reportOk : '?')}`);
    if (d) lines.push(`${T.reportView}: ${T.direction} ${dirLabel[dirOf(d)] || dirOf(d)}, Theme ${currentTheme()}`);
    const src = section.querySelector('script.mermaid-src');
    // fence 比原始碼內最長的連續反引號多一個，避免截斷。
    const code = src ? dedent(src.textContent) : '';
    const fence = '`'.repeat(Math.max(3, ...(code.match(/`+/g) || []).map((x) => x.length + 1)));
    if (src) lines.push(`${T.reportSource}:`, `${fence}mermaid`, code, fence);
  }
  lines.push('', `${T.reportEnv}: diagram-first ${APP.version}, Mermaid ${MERMAID_VERSION}, ELK ${elkOk === null ? '?' : elkOk ? 'on' : 'off'}, ${navigator.userAgent}`);
  if (!errors.size || (i !== null && !errors.has(i))) lines.push('', T.reportNote);
  return lines.join('\n');
}
async function copyReport(i) {
  try {
    await navigator.clipboard.writeText(buildReport(i));
    notify(T.reportCopied);
  } catch {
    notify(T.copyFail);
  }
}
function reportButton(i) {
  const b = el('button', { type: 'button', class: 'report', title: T.reportTitle }, i === null && errors.size > 1 ? T.reportAll : T.report);
  b.addEventListener('click', () => copyReport(i));
  return b;
}

// 同步所有選單的匯出選項，並更新每張圖的輸出像素說明（卡片版面依實際卡片尺寸計算）。
function syncSizes() {
  const cur = { size: exportSize, layout: exportLayout, palette: exportPalette, ink: exportInk };
  diagrams.forEach((d) => { if (d.inkRow) d.inkRow.hidden = !inkOf(d).strokes.length; });
  document.querySelectorAll('[data-opt]').forEach((b) => b.setAttribute('aria-checked', String(cur[b.dataset.opt] === b.dataset.value)));
  // 只更新目前這張圖（選單只會在目前這張圖上開啟）。
  diagrams.filter((d) => d.section === sections[current]).forEach((d) => {
    if (!d.ok || !d.sizeLabel || !viewBox(d)) return;
    let { w, h } = svgSize(d.svg);
    if (exportLayout === 'card') {
      const caption = notes.get(d.section)?.querySelector('.caption')?.textContent.trim() || '';
      ({ TW: w, TH: h } = cardLayout(w, h, d.section.dataset.title, caption, d.anns.map((a) => `${a.n}. ${a.text}`)));
    }
    const o = exportDims(w, h);
    const text = T.pixels(o.w, o.h);
    d.sizeLabel.textContent = `${T.size} · ${text}`;
    d.sizeLabel.parentElement.setAttribute('aria-label', `${T.size} ${text}`);
  });
}

// 每張圖的方向：「跟隨頁面」時用頁首的方向設定。
function dirOf(d) {
  return d.direction === 'page' ? direction : d.direction;
}

let renderCount = 0;
function renderOne(d) {
  return serial(() => renderOneNow(d));
}
async function renderOneNow(d) {
  const n = ++renderCount;
  d.canvas.classList.toggle('dark', currentTheme().includes('dark'));
  // 重繪前記下鍵盤焦點所在的節點（重繪會移除它）。
  const focusId = d.graph?.byEl.get(document.activeElement)?.id ?? null;
  try {
    const source = withDirection(d.source, dirOf(d));
    let svg;
    try {
      ({ svg } = await mermaid.render(`diagram-${d.i}-${n}`, source));
    } catch (e) {
      if (source === d.source) throw e;
      ({ svg } = await mermaid.render(`diagram-${d.i}-${n}-src`, d.source));
    }
    d.canvas.innerHTML = svg;
    // 從 DOM 序列化成合法的 XML：Mermaid 的 HTML 標籤（例如 <br>）不一定是自我封閉，直接當 XML 解析會失敗。
    d.svg = new XMLSerializer().serializeToString(d.canvas.querySelector('svg'));
    errors.delete(d.i);
    // 重繪（換 Theme、方向、旋轉）後，依節點 id 還原原本鎖定的節點。
    const keep = selected?.d === d ? selected.node.id : null;
    clearSelection(d);
    await indexGraph(d, source);
    placeAnnotations(d);
    drawInk(d);
    const again = keep !== null && d.graph?.nodes.get(keep);
    if (again) select(d, again, true);
    // 原本聚焦的節點被重繪移除了：把 roving tabindex 與焦點放回同 id 的節點。
    const back = d.graph?.nodes.get(focusId ?? keep);
    if (back) {
      d.graph.nodes.forEach((x) => x.el.setAttribute('tabindex', x === back ? '0' : '-1'));
      if (focusId !== null) back.el.focus({ preventScroll: true });
    }
    if (!d.ok) { d.toolbar.prepend(...d.buttons); d.syncToolbar(); }
    d.imageItems.forEach((b) => { b.hidden = false; });
    d.ok = true;
    d.canvas.classList.add('ready');
    if (d.fit) fitScreen(d);
    else applyView(d);
  } catch (e) {
    const box = el('div', { class: 'err' }, T.renderFail);
    errors.set(d.i, String(e.message || e));
    box.append(el('pre', {}, String(e.message || e)), reportButton(d.i));
    d.canvas.replaceChildren(box);
    d.buttons.forEach((b) => b.remove());
    d.imageItems.forEach((b) => { b.hidden = true; });
    d.syncToolbar();
    d.ok = false;
    d.canvas.classList.remove('ready', 'dragging');
    d.details.open = true;
  }
}
// filter 為 null 時重繪全部；否則只重繪符合條件的圖。
function renderAll(filter = null) {
  return serial(async () => {
    initMermaid();
    for (const d of diagrams) {
      if (!filter || filter(d)) await renderOneNow(d);
    }
  });
}
const followsPage = (d) => d.direction === 'page';

// 右上角：說明、設定、全螢幕。
const actions = el('div', { id: 'actions', class: 'float' });
const infoBtn = el('button', { type: 'button', 'aria-label': T.info, title: `${T.info} (?)`, 'aria-controls': 'info', 'aria-keyshortcuts': '?' }, `ⓘ ${T.info}`);
// v 為 true 時展開完整說明；false 時收合成只有標題與一句話結論的小卡，圖是主角。
function showInfo(v, remember = true) {
  info.classList.toggle('card', !v);
  infoBtn.setAttribute('aria-pressed', String(v));
  expandInfo.setAttribute('aria-expanded', String(v));
  if (remember) save(STORE.info, v ? 'open' : 'closed');
  // 只重新符合仍在 fit 狀態的圖；使用者已手動平移或縮放的圖不動，避免跳動。
  diagrams.forEach((d) => { if (d.ok && d.fit) requestAnimationFrame(() => fitScreen(d, true)); });
}
const isOpen = () => !info.classList.contains('card');
infoBtn.addEventListener('click', () => showInfo(!isOpen()));
closeInfo.addEventListener('click', () => { showInfo(false); infoBtn.focus(); });
expandInfo.addEventListener('click', () => { showInfo(true); closeInfo.focus(); });
// 預設收合成小卡，畫布幾乎整個可見。
showInfo(load(STORE.info, ['open', 'closed'], 'closed') === 'open', false);
const settingsWrap = el('div');
const settingsBtn = el('button', { type: 'button', 'aria-label': T.settings, title: T.settings, 'aria-controls': 'settings' }, '⚙');
const settings = el('div', { class: 'pop', id: 'settings', role: 'group', 'aria-label': T.settings });
const controls = document.getElementById('controls') || el('div', { class: 'controls' });
settings.append(controls);
settingsWrap.append(settingsBtn, settings);
popover(settingsBtn, settings, 'right');
actions.append(infoBtn, settingsWrap);
if (fsEnabled) {
  const fsBtn = el('button', { type: 'button', 'aria-pressed': 'false' }, T.fullscreen);
  fsBtn.addEventListener('click', toggleFullscreen);
  const sync = () => {
    const on = Boolean(fsElement());
    fsBtn.textContent = on ? T.exitFullscreen : T.fullscreen;
    fsBtn.setAttribute('aria-pressed', String(on));
  };
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  actions.append(fsBtn);
}

const modeGroup = el('div', { class: 'segmented', role: 'group', 'aria-label': T.mode });
const modeButtons = ['auto', 'light', 'dark'].map((m) => {
  const b = el('button', { type: 'button', 'aria-pressed': String(m === mode) }, T[m]);
  b.addEventListener('click', async () => {
    mode = m;
    save(STORE.mode, m);
    modeButtons.forEach((x, k) => x.setAttribute('aria-pressed', String(['auto', 'light', 'dark'][k] === m)));
    applyMode();
    if (theme === 'auto') await renderAll();
  });
  return b;
});
modeGroup.append(...modeButtons);
const themeSelect = el('select', { 'aria-label': T.theme });
themeSelect.append(el('option', { value: 'auto' }, `${T.auto} (${AUTO_THEME.light} / ${AUTO_THEME.dark})`));
THEMES.forEach((t) => themeSelect.append(el('option', { value: t }, t)));
themeSelect.value = theme;
themeSelect.addEventListener('change', async () => {
  theme = themeSelect.value;
  save(STORE.theme, theme);
  await renderAll();
});
const DIRECTIONS = ['auto', 'vertical', 'horizontal'];
const directionGroup = el('div', { class: 'segmented', role: 'group', 'aria-label': T.direction });
const directionButtons = DIRECTIONS.map((v) => {
  const b = el('button', { type: 'button', 'aria-pressed': String(v === direction) }, T[v]);
  b.addEventListener('click', async () => {
    direction = v;
    save(STORE.direction, v);
    directionButtons.forEach((x, k) => x.setAttribute('aria-pressed', String(DIRECTIONS[k] === v)));
    diagrams.forEach((d) => { if (followsPage(d)) d.fit = true; });
    await renderAll(followsPage);
  });
  return b;
});
directionGroup.append(...directionButtons);
controls.append(modeGroup, directionGroup, themeSelect);

// 左上角：目錄切換。兩張圖以上才有清單與上一張／下一張。
const nav = el('nav', { id: 'nav', class: 'float toc', 'aria-label': T.toc });
const tocWrap = el('div');
const tocBtn = el('button', { type: 'button', class: 'toc-btn', 'aria-controls': 'toc-panel' });
tocWrap.append(tocBtn);
nav.append(tocWrap);
const links = new Map();
let current = 0;
const multi = sections.length >= 2;
const prevBtn = el('button', { type: 'button', 'aria-label': T.prev, title: `${T.prev} (PageUp)` }, '‹');
const nextBtn = el('button', { type: 'button', 'aria-label': T.next, title: `${T.next} (PageDown)` }, '›');
if (multi) {
  const panel = el('div', { class: 'pop', id: 'toc-panel' });
  const list = el('ol');
  sections.forEach((section) => {
    const a = el('a', { href: `#${section.id}` }, section.dataset.title);
    links.set(section, a);
    const li = el('li');
    li.append(a);
    list.append(li);
  });
  panel.append(list);
  tocWrap.append(panel);
  const toc = popover(tocBtn, panel);
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    toc.set(false);
    show(sections.findIndex((x) => `#${x.id}` === a.getAttribute('href')));
  });
  prevBtn.addEventListener('click', () => show(current - 1));
  nextBtn.addEventListener('click', () => show(current + 1));
  nav.append(prevBtn, nextBtn);
} else {
  tocBtn.disabled = true;
}
document.body.append(nav, actions, selbar, penbar, toast, selLive);

// 切換到第 k 張圖：顯示該圖、把它的說明移入說明視窗，並同步網址的 #id。
function show(k, updateHash = true) {
  popovers.forEach((p) => p.set(false));
  clearSelection();
  if (!sections.length) return;
  current = (k + sections.length) % sections.length;
  const section = sections[current];
  sections.forEach((x) => x.classList.toggle('active', x === section));
  info.querySelectorAll('.notes').forEach((n) => n.remove());
  info.append(notes.get(section), hint, credit, expandInfo);
  // 標題過長時只截斷標題，張數與 ▾ 保持可見。
  tocBtn.replaceChildren(el('span', { class: 't' }, section.dataset.title));
  if (multi) {
    tocBtn.prepend(el('span', { 'aria-hidden': 'true' }, '☰'));
    // 窄螢幕會隱藏標題，無障礙名稱仍保留完整資訊。
    tocBtn.setAttribute('aria-label', `${T.toc}: ${section.dataset.title} ${current + 1}/${sections.length}`);
  }
  if (multi) tocBtn.append(el('span', {}, `${current + 1}/${sections.length} ▾`));
  links.forEach((a, x) => a.setAttribute('aria-current', String(x === section)));
  if (updateHash && location.hash !== `#${section.id}`) history.replaceState(null, '', `#${section.id}`);
  const d = diagrams.find((x) => x.section === section);
  if (d && d.ok) requestAnimationFrame(() => {
    if (d.annPending) placeAnnotations(d);
    if (d.fit) fitScreen(d);
    else applyView(d);
  });
}
const fromHash = () => {
  let hash = location.hash;
  try { hash = decodeURIComponent(hash); } catch {}
  return Math.max(0, sections.findIndex((x) => `#${x.id}` === hash));
};
addEventListener('hashchange', () => show(fromHash(), false));
// Ctrl／⌘＋滾輪或觸控板捏合落在浮動列上時，縮放目前這張圖，而不是整個頁面。
// 展開的說明視窗與彈出面板保留瀏覽器縮放，讓需要放大文字的人仍能放大閱讀。
const keepsPageZoom = (t) => Boolean(t.closest?.('.canvas, #info:not(.card), .pop'));
// 目前這張圖 render 失敗時不攔截，保留瀏覽器縮放。
const zoomTarget = (t) => {
  if (keepsPageZoom(t)) return null;
  const d = diagrams.find((x) => x.section === sections[current]);
  return d && d.ok ? d : null;
};
document.addEventListener('wheel', (e) => {
  const d = (e.ctrlKey || e.metaKey) && zoomTarget(e.target);
  if (!d) return;
  e.preventDefault();
  wheelZoomOrPan(d, e);
}, { passive: false });
// macOS Safari 的觸控板捏合落在浮動列上時也縮放目前這張圖。gesture 事件也來自 iOS 觸控捏合，觸控裝置上不攔截，保留整頁放大。
if (!navigator.maxTouchPoints) {
  let base = null;
  document.addEventListener('gesturestart', (e) => {
    const d = zoomTarget(e.target);
    base = d ? { d, scale: currentScale(d) } : null;
    if (d) e.preventDefault();
  });
  document.addEventListener('gesturechange', (e) => {
    if (!base) return;
    e.preventDefault();
    setZoom(base.d, base.scale * e.scale, { x: e.clientX, y: e.clientY });
  });
  document.addEventListener('gestureend', () => { base = null; });
}
document.addEventListener('keydown', (e) => {
  const popOpen = popovers.some((p) => p.isOpen());
  if (e.key === 'Escape' && !nativePopover && popOpen) {
    popovers.forEach((p) => { if (p.isOpen()) { p.set(false); p.btn.focus(); } });
    return;
  }
  // Esc：先離開畫筆模式，再取消選取。
  if (e.key === 'Escape' && penOn && !popOpen) { setPen(false); return; }
  const typing = e.target.closest?.('pre, input, textarea, select, .pop');
  // ⌘／Ctrl＋Z：復原目前這張圖的筆跡。
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !typing) {
    const d = curDiagram();
    if (d && inkOf(d).history.length) { e.preventDefault(); undoInk(d); return; }
  }
  // 畫筆模式按住 Space 時拖曳改為平移；焦點在按鈕上時不攔截，讓按鈕照常以 Space 操作。
  if (e.key === ' ' && penOn && !typing) {
    spaceDown = true;
    if (!e.target.closest?.('button')) { e.preventDefault(); return; }
  }
  if ((e.key === 'p' || e.key === 'P') && !e.altKey && !e.ctrlKey && !e.metaKey && !typing) {
    const d = curDiagram();
    if (d && d.ok) { e.preventDefault(); setPen(!penOn); return; }
  }
  // Esc：有選取的節點時先取消選取（彈出選單開著時交給選單處理）。
  if (e.key === 'Escape' && selected && !popOpen) {
    const n = selected.node;
    clearSelection();
    if (selbar.contains(e.target)) n.el.focus({ preventScroll: true });
    return;
  }
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  // ?：展開說明視窗並捲到操作提示；在原始碼、輸入框與選單內不攔截。
  if (e.key === '?' && !e.target.closest?.('pre, input, textarea, select, .pop')) {
    e.preventDefault();
    showInfo(true, false);
    hint.scrollIntoView({ block: 'nearest' });
    hint.classList.remove('flash');
    void hint.offsetWidth;
    hint.classList.add('flash');
    return;
  }
  // 整頁就是畫布：焦點在頁面本身時，方向鍵與 +／−／0／1 作用在目前這張圖，和畫布取得焦點時一致。
  // 切換圖：PageUp／PageDown（頁面、畫布與節點、目錄上），以及目錄內的 ←／→。原始碼、工具列與面板內的按鍵不攔截。
  const t = e.target;
  const page = t === document.body || t === document.documentElement;
  const inNav = Boolean(t.closest?.('#nav'));
  const paging = e.key === 'PageUp' || e.key === 'PageDown';
  if (multi && (paging ? page || inNav || Boolean(t.closest?.('.canvas')) : inNav && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) {
    e.preventDefault();
    show(current + (e.key === 'ArrowLeft' || e.key === 'PageUp' ? -1 : 1));
    return;
  }
  if (page) viewKey(diagrams.find((x) => x.section === sections[current]), e);
});
// 列印時把各圖的說明放回原位，逐張印出。
addEventListener('beforeprint', () => notes.forEach((n, section) => section.append(n)));
addEventListener('afterprint', () => show(current, false));
// 依浮動列的實際高度與寬度保留畫布空間（手機上工具列可能換行）。
const root = document.documentElement;
const measure = () => {
  const toolbars = diagrams.map((d) => d.toolbar).concat([...document.querySelectorAll('section.active .toolbar')]);
  root.style.setProperty('--top-h', `${Math.ceil(Math.max(nav.offsetHeight, actions.offsetHeight))}px`);
  root.style.setProperty('--actions-w', `${Math.ceil(actions.offsetWidth)}px`);
  root.style.setProperty('--bottom-h', `${Math.ceil(Math.max(0, ...toolbars.map((x) => x.offsetHeight)))}px`);
  diagrams.forEach((d) => { if (d.ok && d.fit) fitScreen(d, true); });
};
const bars = new ResizeObserver(() => requestAnimationFrame(measure));
[nav, actions, info, ...document.querySelectorAll('.toolbar')].forEach((x) => bars.observe(x));
show(fromHash());

systemDark.addEventListener('change', async () => {
  if (mode === 'auto' && theme === 'auto') await renderAll();
});
landscape.addEventListener('change', async () => {
  const auto = (d) => dirOf(d) === 'auto';
  diagrams.forEach((d) => { if (auto(d)) d.fit = true; });
  await renderAll(auto);
});
let resizeFrame = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => diagrams.forEach((d) => {
    if (d.fit) fitScreen(d);
    else applyView(d);
  }));
});

await renderAll();
badCount += diagrams.filter((d) => !d.ok).length;

// 先檢查 ELK，錯誤回報裡才有正確的排版資訊。
elkOk = await serial(() => elkIsActive(mermaid));
if (badCount) {
  setStatus('error', T.some(diagrams.filter((d) => d.ok).length, badCount), reportButton(null));
} else if (!elkOk) {
  setStatus('warn', T.noElk, reportButton(null));
} else {
  // 只在有節點資料的圖種提示；sequence 等圖種的註解本來就只列在說明視窗。
  const missing = diagrams.filter((d) => d.graph).flatMap((d) => d.anns.filter((a) => a.node !== null && !d.graph.bySrc.has(a.node) && !d.graph.nodes.has(a.node)).map((a) => `${d.section.dataset.title} #${a.n}（${a.node}）`));
  if (missing.length) setStatus('warn', T.annMissing(missing.join('、')), reportButton(null));
}
