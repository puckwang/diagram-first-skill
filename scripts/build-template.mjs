#!/usr/bin/env node
// 由 src/ 產生 skills/diagram-first/templates/diagram.html。
//
//   node scripts/build-template.mjs          產生樣板
//   node scripts/build-template.mjs --check  只檢查樣板是否與 src/ 一致（CI 用），不一致時以非 0 結束
//
// 處理：去除 CSS 與 JS 的註解、行首縮排與空行（不改名、不重排，避免引入依賴），
// 內嵌到 src/template.html，並以內嵌後的 script 內容計算 CSP 的 sha256。
// 不要直接修改產出的樣板，改 src/ 後重新執行本腳本。
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const OUT = 'skills/diagram-first/templates/diagram.html';

// 逐字掃描，辨識字串、樣板字串、註解與 regex literal；回傳 [{ text, code }] 片段，code 為 false 表示在字串或 regex 內。
function scan(src, { regex }) {
  const out = [];
  let i = 0;
  let buf = '';
  let prev = '';
  const flush = (code) => { if (buf) out.push({ text: buf, code }); buf = ''; };
  const tpl = [];
  const readString = (q) => {
    flush(true);
    let j = i + 1;
    while (j < src.length && src[j] !== q) {
      if (src[j] === '\\') j++;
      j++;
    }
    out.push({ text: src.slice(i, j + 1), code: false });
    i = j + 1;
    prev = q;
  };
  const readTemplate = () => {
    flush(true);
    let j = i + 1;
    let depth = 0;
    while (j < src.length) {
      if (src[j] === '\\') { j += 2; continue; }
      if (depth === 0 && src[j] === '`') break;
      if (src[j] === '$' && src[j + 1] === '{') { depth++; j += 2; continue; }
      if (depth > 0 && src[j] === '}') { depth--; j++; continue; }
      if (depth > 0 && (src[j] === "'" || src[j] === '"')) {
        const q = src[j];
        j++;
        while (j < src.length && src[j] !== q) { if (src[j] === '\\') j++; j++; }
      }
      j++;
    }
    out.push({ text: src.slice(i, j + 1), code: false });
    i = j + 1;
    prev = '`';
  };
  void tpl;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      continue;
    }
    if (regex && c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '"' || c === "'") { readString(c); continue; }
    if (regex && c === '`') { readTemplate(); continue; }
    if (regex && c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev))) {
      flush(true);
      let j = i + 1;
      let cls = false;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === '[') cls = true;
        else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) break;
        j++;
      }
      j++;
      while (/[a-z]/.test(src[j] || '')) j++;
      out.push({ text: src.slice(i, j), code: false });
      i = j;
      prev = '/';
      continue;
    }
    buf += c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  flush(true);
  return out;
}

// 去除註解後，只在程式碼片段內移除行首空白、行尾空白與空行（字串與樣板字串內容不動）。
function compact(src, opts) {
  const text = scan(src, opts).map((p) => (p.code
    ? p.text.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n')
    : p.text)).join('');
  return text.replace(/^\s+/, '').replace(/\s+$/, '');
}

const css = compact(read('src/viewer.css'), { regex: false });
const js = compact(read('src/viewer.js'), { regex: true });
let html = read('src/template.html');
const put = (marker, value) => {
  if (html.split(marker).length !== 2) throw new Error(`marker ${marker} must appear once`);
  html = html.replace(marker, () => value);
};
put('/* build:css */', css);
put('// build:js', js);
const open = '<script type="module">';
const start = html.lastIndexOf(open) + open.length;
const body = html.slice(start, html.indexOf('</script>', start));
const hash = createHash('sha256').update(body, 'utf8').digest('base64');
put("'sha256-BUILD'", `'sha256-${hash}'`);

if (process.argv.includes('--check')) {
  if (read(OUT) !== html) {
    console.error(`${OUT} 與 src/ 不一致，請執行 node scripts/build-template.mjs`);
    process.exit(1);
  }
  console.log(`${OUT} 與 src/ 一致`);
} else {
  writeFileSync(join(root, OUT), html);
  console.log(`${OUT}: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB, sha256-${hash}`);
}
