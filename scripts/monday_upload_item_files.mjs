#!/usr/bin/env node
// ============================================================
// 通用 Monday 文件列上传器（对齐 Codex 版接口，可跨项目复用）
// ------------------------------------------------------------
// 直接调用 Monday 文件 API 上传，不用 n8n / 浏览器自动化 / 单项目脚本。
// 用法：
//   MONDAY_TOKEN='xxx' node scripts/monday_upload_item_files.mjs \
//     <ITEM_ID> <COLUMN_ID> \
//     "本地路径1::显示名-01.webp" "本地路径2::显示名-02.webp" ...
// 例（Arancia Yards 2 的 9 张 hero → Hero Images 列 file_mm54knz0）：
//   MONDAY_TOKEN='xxx' node danfeng-web/scripts/monday_upload_item_files.mjs \
//     12462563248 file_mm54knz0 \
//     "deliverables/arancia-yards-2/hero-images/01-hero-aerial.webp::arancia-yards-2-01-hero.webp" ...
// 设计：
//   - 端点 https://api.monday.com/v2/file，mutation add_file_to_column（multipart）。
//   - Token 只从环境变量 MONDAY_TOKEN 读；绝不写进代码/日志/Git。
//   - 按 Monday 上已有文件名去重：同名跳过，幂等，可重复执行。
//   - 上传后重读 item.assets 校验；只有 absent 为空才算完成，否则退出码 2。
//   - 只往指定列加文件，绝不修改其他字段或删除已有附件。
// ⚠️ 云沙箱通常无法直连 Monday（出口代理封锁）；本工具需在本地机器
//    （或 Cowork「在你电脑上」模式）运行。
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const API = 'https://api.monday.com/v2';
const TOKEN = process.env.MONDAY_TOKEN;
if (!TOKEN) { console.error('✗ 需要环境变量 MONDAY_TOKEN（勿写进代码/日志）'); process.exit(1); }

const [, , itemId, columnId, ...pairs] = process.argv;
if (!itemId || !columnId || pairs.length === 0) {
  console.error('用法: MONDAY_TOKEN=xxx node scripts/monday_upload_item_files.mjs <ITEM_ID> <COLUMN_ID> "本地路径::显示名.webp" ...');
  process.exit(1);
}

async function gql(query, variables) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json', 'API-Version': '2024-10' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

async function itemAssetNames() {
  const d = await gql('query($ids:[ID!]){ items(ids:$ids){ assets{ name } } }', { ids: [itemId] });
  return new Set((d.items?.[0]?.assets || []).map((a) => a.name));
}

async function uploadOne(path, displayName) {
  const buf = readFileSync(path);
  const form = new FormData();
  form.append('query', `mutation add($file: File!){ add_file_to_column(item_id: ${itemId}, column_id: "${columnId}", file: $file){ id name } }`);
  form.append('map', '{"1":["variables.file"]}');
  form.append('1', new Blob([buf]), displayName);
  const r = await fetch(`${API}/file`, { method: 'POST', headers: { Authorization: TOKEN }, body: form });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data?.add_file_to_column;
}

// 解析 "路径::显示名"（无 :: 时用文件名）
const files = pairs.map((p) => {
  const i = p.indexOf('::');
  const path = i >= 0 ? p.slice(0, i) : p;
  const name = i >= 0 ? p.slice(i + 2) : basename(p);
  return { path, name };
});

for (const f of files) {
  if (!existsSync(f.path)) { console.error(`✗ 文件不存在: ${f.path}`); process.exit(1); }
}

console.log(`▶ 目标 item=${itemId} 列=${columnId}，共 ${files.length} 个文件`);
const before = await itemAssetNames();
const uploaded = [], skipped = [];
for (const f of files) {
  if (before.has(f.name)) { skipped.push(f.name); console.log(`  ↷ 跳过(已存在) ${f.name}`); continue; }
  await uploadOne(f.path, f.name);
  uploaded.push(f.name);
  console.log(`  ✓ 上传 ${f.name}`);
}

// 上传后重读校验
const after = await itemAssetNames();
const absent = files.filter((f) => !after.has(f.name)).map((f) => f.name);
console.log(`\n结果: uploaded=${uploaded.length} · skipped=${skipped.length} · absent=${absent.length} · item=${itemId}`);
if (absent.length) { console.error('  ⚠ 以下文件校验缺失(需复查):', absent.join(', ')); process.exit(2); }
console.log('✅ 校验通过：absent 为空，全部在库。');
