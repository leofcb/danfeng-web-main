// ============================================================
// export-monday-data.mjs — 三板全导出：项目 / 开发商 / 社区 → raw-*.json
// Mac 真机跑（需 MONDAY_TOKEN + 外网）：node scripts/export-monday-data.mjs
// 产出与现有 raw-board / raw-developers / raw-communities.json 同构：
//   · 项目板：按"友好字段名→列id"映射（已对 15 Cascade 逐字段验证）
//   · 开发商/社区板：按"列id 为键"导出 text 值（列清单取自现有 raw 文件，保持护栏子集不变）
//   · 社区含 subitems（户型级）
// ============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'data');
const TOKEN = process.env.MONDAY_TOKEN;
if (!TOKEN) { console.error('缺 MONDAY_TOKEN（仅 Mac 真机可跑）'); process.exit(1); }

const PROJ_BOARD = 3916277144, DEV_BOARD = 6350528756, COMM_BOARD = 18420441803;

// 项目板：友好字段名 → 列 id（已验证）
const PROJ_COLS = {
  developer: 'connect_boards7', community: 'text_mkp4vsev', city: 'label__1', areaDLD: 'text_mm4fz1nv',
  propertyTypes: 'type__1', unitTypes: 'dropdown', ownership: 'color_mm4dq7mn', presaleStatus: 'status',
  projectStatusDLD: 'color_mm4dkwva', completionDate: 'date_mm4e3ck', percent: 'numeric_mm4dwn4d',
  startingPrice: 'numeric7', minSize: 'numeric4', maxSize: 'numeric6', paymentPlan: 'text_mkx1s7we',
  amenities: 'long_text_mm4dmnsm', views: 'long_text_mm4daa8j', locationDistance: 'long_text_mm4dze05',
  paymentSchedule: 'long_text_mm4d9331', projectLink: 'link9', cn: 'text_mm4w4apw',
};

async function mondayFetch(query, variables) {
  const r = await fetch('https://api.monday.com/v2', {
    method: 'POST', headers: { Authorization: TOKEN, 'Content-Type': 'application/json', 'API-Version': '2024-10' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error('Monday GraphQL: ' + JSON.stringify(j.errors));
  return j.data;
}

// 关联列(BoardRelation)的 text 为空，需读 display_value（如 developer=connect_boards7）。
const CV = 'id text ... on BoardRelationValue { display_value } ... on MirrorValue { display_value }';
const cvVal = (c) => (c.display_value != null && c.display_value !== '') ? c.display_value : (c.text ?? '');
// 通用分页拉取：返回 items（含 id/name/指定列值，可选 subitems）
async function fetchBoard(boardId, colIds, subColIds) {
  const colSel = colIds.map((c) => `"${c}"`).join(',');
  const subSel = subColIds ? `subitems { name column_values(ids:[${subColIds.map((c) => `"${c}"`).join(',')}]){${CV}} }` : '';
  const Q = `query ($cursor: String) { boards(ids: [${boardId}]) { items_page(limit: 200, cursor: $cursor) {
    cursor items { id name column_values(ids: [${colSel}]) { ${CV} } ${subSel} } } } }`;
  const out = []; let cursor = null, pages = 0;
  do {
    const d = await mondayFetch(Q, { cursor });
    const p = d.boards?.[0]?.items_page; if (!p) break; cursor = p.cursor; pages += 1;
    for (const it of p.items || []) out.push({ it });
    process.stdout.write(`    · ${out.length} 项（${pages} 页）\n`);
  } while (cursor);
  return out.map((x) => x.it);
}
const textById = (it) => new Map((it.column_values || []).map((c) => [c.id, cvVal(c)]));

// 从现有 raw 文件取列清单（排除 id/name/subitems），保持护栏子集不变
function colsFromRaw(file, exclude = ['id', 'name', 'subitems']) {
  const p = join(DATA, file);
  if (!existsSync(p)) return null;
  const arr = JSON.parse(readFileSync(p, 'utf8'));
  return Object.keys(arr[0]).filter((k) => !exclude.includes(k));
}

// ① 项目板
console.log('① 项目板 → raw-board.json');
const projItems = await fetchBoard(PROJ_BOARD, [...new Set(Object.values(PROJ_COLS))]);
const rawBoard = projItems.map((it) => {
  const t = textById(it); const row = { id: String(it.id), name: it.name };
  for (const [f, cid] of Object.entries(PROJ_COLS)) row[f] = (t.get(cid) ?? '').trim();
  return row;
});
writeFileSync(join(DATA, 'raw-board.json'), JSON.stringify(rawBoard, null, 1) + '\n');
const devCount = rawBoard.filter((r) => r.developer === 'Beyond').length;
console.log(`   ✓ ${rawBoard.length} 项目（Beyond ${devCount} 个）`);

// ② 开发商板（列 id 为键）
console.log('② 开发商板 → raw-developers.json');
const devCols = colsFromRaw('raw-developers.json');
if (devCols) {
  const devItems = await fetchBoard(DEV_BOARD, devCols);
  const rawDev = devItems.map((it) => { const t = textById(it); const row = { id: String(it.id), name: it.name }; for (const c of devCols) row[c] = t.has(c) ? t.get(c) : null; return row; });
  writeFileSync(join(DATA, 'raw-developers.json'), JSON.stringify(rawDev, null, 1) + '\n');
  console.log(`   ✓ ${rawDev.length} 开发商`);
} else console.log('   ⚠ 无现有 raw-developers.json，跳过（无法确定护栏列子集）');

// ③ 社区板（列 id 为键 + subitems）
console.log('③ 社区板 → raw-communities.json');
const commCols = colsFromRaw('raw-communities.json');
if (commCols) {
  let subCols = [];
  try { const c0 = JSON.parse(readFileSync(join(DATA, 'raw-communities.json'), 'utf8')).find((c) => c.subitems && c.subitems.length); if (c0) subCols = Object.keys(c0.subitems[0]).filter((k) => k !== 'name'); } catch {}
  const commItems = await fetchBoard(COMM_BOARD, commCols, subCols.length ? subCols : null);
  const rawComm = commItems.map((it) => {
    const t = textById(it); const row = { id: String(it.id), name: it.name };
    for (const c of commCols) row[c] = t.has(c) ? t.get(c) : null;
    row.subitems = (it.subitems || []).map((s) => { const st = new Map((s.column_values || []).map((c) => [c.id, cvVal(c)])); const sr = { name: s.name }; for (const sc of subCols) sr[sc] = st.has(sc) ? st.get(sc) : null; return sr; });
    return row;
  });
  writeFileSync(join(DATA, 'raw-communities.json'), JSON.stringify(rawComm, null, 1) + '\n');
  console.log(`   ✓ ${rawComm.length} 社区`);
} else console.log('   ⚠ 无现有 raw-communities.json，跳过');

console.log('✅ 三板导出完成');
