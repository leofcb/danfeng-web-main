// ============================================================
// export-monday-board.mjs — 从 Monday「Projects: Off-Plan」板导出 raw-board.json
// 在 Mac 真机跑（需 MONDAY_TOKEN + 外网）：node scripts/export-monday-board.mjs
// 产出 lib/data/raw-board.json（与 build-catalog 期望的 23 字段同构，列映射已对 15 Cascade 验证）。
// ============================================================
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'data');
const BOARD_ID = 3916277144;
const TOKEN = process.env.MONDAY_TOKEN;
if (!TOKEN) { console.error('缺 MONDAY_TOKEN（仅 Mac 真机可跑）'); process.exit(1); }

// raw-board 字段 → Monday 列 id（已逐字段验证）
const COLS = {
  developer: 'connect_boards7', community: 'text_mkp4vsev', city: 'label__1', areaDLD: 'text_mm4fz1nv',
  propertyTypes: 'type__1', unitTypes: 'dropdown', ownership: 'color_mm4dq7mn', presaleStatus: 'status',
  projectStatusDLD: 'color_mm4dkwva', completionDate: 'date_mm4e3ck', percent: 'numeric_mm4dwn4d',
  startingPrice: 'numeric7', minSize: 'numeric4', maxSize: 'numeric6', paymentPlan: 'text_mkx1s7we',
  amenities: 'long_text_mm4dmnsm', views: 'long_text_mm4daa8j', locationDistance: 'long_text_mm4dze05',
  paymentSchedule: 'long_text_mm4d9331', projectLink: 'link9', cn: 'text_mm4w4apw',
};
const COL_IDS = [...new Set(Object.values(COLS))];

async function mondayFetch(query, variables) {
  const r = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { Authorization: TOKEN, 'Content-Type': 'application/json', 'API-Version': '2024-10' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error('Monday GraphQL: ' + JSON.stringify(j.errors));
  return j.data;
}

const Q = `query ($cursor: String) {
  boards(ids: [${BOARD_ID}]) {
    items_page(limit: 200, cursor: $cursor) {
      cursor
      items { id name column_values(ids: [${COL_IDS.map((c) => `"${c}"`).join(',')}]) { id text } }
    }
  }
}`;

const out = [];
let cursor = null, pages = 0;
process.stdout.write('[export] 导出 Monday 项目板 …\n');
do {
  const data = await mondayFetch(Q, { cursor });
  const page = data.boards?.[0]?.items_page;
  if (!page) break;
  cursor = page.cursor; pages += 1;
  for (const it of page.items || []) {
    const byId = new Map((it.column_values || []).map((c) => [c.id, c.text ?? '']));
    const row = { id: String(it.id), name: it.name };
    for (const [field, colId] of Object.entries(COLS)) row[field] = (byId.get(colId) ?? '').trim();
    out.push(row);
  }
  process.stdout.write(`  · 已导出 ${out.length} 项（${pages} 页）\n`);
} while (cursor);

writeFileSync(join(DATA, 'raw-board.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`✅ raw-board.json 已写入：${out.length} 个项目`);
const byDev = {};
out.forEach((r) => { if (r.developer) byDev[r.developer] = (byDev[r.developer] || 0) + 1; });
console.log(`   Beyond 项目数：${byDev['Beyond'] || 0}（对齐 Monday 现状）`);
