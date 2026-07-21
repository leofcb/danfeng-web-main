// ============================================================
// purge-dropbox.mjs — 一次性 Dropbox 内部资料链接根除脚本（LEO 2026-07-10 指令）
// ------------------------------------------------------------
// Dropbox 链接=内部资料库，不得出现在前端数据层任何文件。
// 扫描目标：lib/data/catalog.json、lib/data/raw-board.json、
//   content/projects/*.json —— 递归清空任意字符串值中含 "dropbox.com"
//   的字段（置空串，保留字段/schema 结构不变，便于前端 falsy 判断隐藏）。
// 仅一次性运行，不进入常规构建流程（build-catalog.mjs 已单独修正，
// 未来重导不再从 Monday dropbox 列回填 brochureUrl）。
// ============================================================
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'lib', 'data');
const CONTENT_PROJECTS = join(__dirname, '..', 'content', 'projects');

let totalCleared = 0;
const report = [];

function purge(node, path, fileLabel) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => purge(v, `${path}[${i}]`, fileLabel));
  } else if (node && typeof node === 'object') {
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === 'string' && v.toLowerCase().includes('dropbox.com')) {
        report.push(`${fileLabel}: ${path}.${k} (was dropbox link) → cleared`);
        node[k] = '';
        totalCleared++;
      } else {
        purge(v, `${path}.${k}`, fileLabel);
      }
    }
  }
}

function processFile(fullPath, label) {
  const text = readFileSync(fullPath, 'utf8');
  const data = JSON.parse(text);
  purge(data, label, label);
  writeFileSync(fullPath, JSON.stringify(data, null, 1));
}

// 1) catalog.json
processFile(join(DATA, 'catalog.json'), 'catalog.json');

// 2) raw-board.json
processFile(join(DATA, 'raw-board.json'), 'raw-board.json');

// 3) content/projects/*.json
for (const f of readdirSync(CONTENT_PROJECTS).filter((f) => f.endsWith('.json'))) {
  processFile(join(CONTENT_PROJECTS, f), `content/projects/${f}`);
}

console.log(`清除 dropbox.com 链接：共 ${totalCleared} 处`);
report.forEach((r) => console.log('  - ' + r));
