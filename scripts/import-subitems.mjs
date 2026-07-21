// ============================================================
// import-subitems.mjs — 子项库户型补导（全量跑，供批量点亮 v5 页）
// ------------------------------------------------------------
// 从 Monday「Projects: Off-Plan」board 3916277144 拉每项目子项（户型），
// 只取【护栏白名单列】写入 content/projects/<slug>.json 的 unitTypes[]：
//   name（户型）· Units（套数 text_mm4dmq60）· Min/Max Size（面积）· Starting Price（PF 起价示意）。
// 🔴 严禁取：Primary/Current Price、Primary/Current/Area PSF（去化/现价/单价敏感列）——
//   这些列 id 已在下方 FORBIDDEN_COLS 显式登记，脚本不请求、不写入。
//
// 幂等：已存在的 <slug>.json 只更新 unitTypes/unitNote，保留其余人工字段；
// 不存在则生成最小骨架（可后续补 intro/finishes 等）。默认不改 template 字段。
//
// 用法：
//   MONDAY_TOKEN=xxx node scripts/import-subitems.mjs                 # 全量
//   MONDAY_TOKEN=xxx node scripts/import-subitems.mjs creek-waters altan   # 指定 slug
//   MONDAY_TOKEN=xxx node scripts/import-subitems.mjs --v5-only       # 仅已 template=v5 的项目
// 沙盒无外网/Token 时不可运行；须在具备 Monday 访问的机器执行。
// ============================================================
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONTENT = join(ROOT, 'content', 'projects');
const CATALOG = join(ROOT, 'lib', 'data', 'catalog.json');

const PARENT_BOARD = 3916277144;
// 白名单列（唯一允许取的子项列）。
const COL = {
  units: 'text_mm4dmq60',      // Units 套数
  min: 'numeric_mm4e1vte',     // Min. Size (sq.ft.)
  max: 'numeric_mm4ep6s1',     // Max. Size (sq.ft.)
  start: 'numeric_mm4ey1fd',   // Starting Price (AED) — PF 起价示意
};
// 🔴 禁列（现价/单价/去化敏感）——仅登记以自证不取，脚本永不请求。
const FORBIDDEN_COLS = ['numeric_mm4f2e21', 'numeric_mm4g2h3j', 'numeric_mm4fsfds', 'numeric_mm4gd9jn', 'numeric_mm4f9yap'];

const TOKEN = process.env.MONDAY_TOKEN || process.env.MONDAY_API_TOKEN;
if (!TOKEN) { console.error('缺 MONDAY_TOKEN 环境变量。'); process.exit(2); }

function slugify(name) {
  return String(name || '').toLowerCase().trim()
    .replace(/&/g, ' and ').replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}
// 复刻 catalog 去重 slug（与 lib/catalog.js 一致）。
function buildSlugMap(catalog) {
  const seen = new Map(); const byName = new Map();
  for (const p of catalog) {
    let s = slugify(p.name);
    if (seen.has(s)) { let i = 2; while (seen.has(`${s}-${i}`)) i++; s = `${s}-${i}`; }
    seen.set(s, p); byName.set(p.name, s);
  }
  return byName;
}

async function gql(query, variables) {
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: TOKEN, 'API-Version': '2024-10' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data;
}

const bedNum = (name) => { const m = String(name).match(/(\d+)\s*bed/i) || String(name).match(/(\d+)/); return m ? m[1] : ''; };
const fmtAed = (n) => `AED ${Number(n).toLocaleString('en-US')} 起（开盘起价 · 非实时报价）`;

function toUnitTypes(subitems) {
  return subitems.map((s) => {
    const cv = Object.fromEntries((s.column_values || []).map((c) => [c.id, c.text]));
    const bn = bedNum(s.name);
    const isPh = Number(bn) >= 5 || /penthouse/i.test(s.name);
    const type = isPh ? `${bn || 5} 居复式 · 顶层公寓` : `${bn} 居公寓`;
    const min = Number(cv[COL.min]) || null;
    const max = Number(cv[COL.max]) || min;
    const start = Number(cv[COL.start]) || null;
    const units = parseInt(cv[COL.units], 10);
    const out = { type, sizeMinSqft: min, sizeMaxSqft: max };
    if (Number.isFinite(units) && units > 0) out.unitCount = units;
    if (start) { out.startFromAED = start; out.startFromLabel = fmtAed(start); }
    return out;
  }).filter((u) => u.sizeMinSqft || u.startFromAED);
}

async function main() {
  const args = process.argv.slice(2);
  const v5Only = args.includes('--v5-only');
  const wantSlugs = args.filter((a) => !a.startsWith('--'));
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const slugByName = buildSlugMap(catalog);
  const nameBySlug = new Map([...slugByName].map(([n, s]) => [s, n]));

  // 决定要处理的项目集
  let targetNames;
  if (wantSlugs.length) {
    targetNames = wantSlugs.map((s) => nameBySlug.get(s)).filter(Boolean);
  } else if (v5Only && existsSync(CONTENT)) {
    targetNames = readdirSync(CONTENT).filter((f) => f.endsWith('.json'))
      .map((f) => { try { const j = JSON.parse(readFileSync(join(CONTENT, f), 'utf8')); return j.template === 'v5' ? nameBySlug.get(f.replace('.json', '')) : null; } catch { return null; } })
      .filter(Boolean);
  } else {
    targetNames = catalog.map((p) => p.name);
  }

  if (!existsSync(CONTENT)) mkdirSync(CONTENT, { recursive: true });
  let done = 0; let skipped = 0;
  const colIds = Object.values(COL);

  // 分批查询父项 + 子项（每批 ≤ 25 名）
  for (let i = 0; i < targetNames.length; i += 25) {
    const batch = targetNames.slice(i, i + 25);
    const data = await gql(
      `query ($ids:[ID!], $names:[CompareValue!], $cols:[String!]) {
         boards(ids:$ids){ items_page(limit:200, query_params:{rules:[{column_id:"name", compare_value:$names, operator:any_of}]}){
           items{ id name subitems{ id name column_values(ids:$cols){ id text } } } } } }`,
      JSON.stringify({ ids: [String(PARENT_BOARD)], names: batch, cols: colIds }),
    );
    const items = data.boards?.[0]?.items_page?.items || [];
    for (const it of items) {
      const slug = slugByName.get(it.name);
      if (!slug) { skipped++; continue; }
      const unitTypes = toUnitTypes(it.subitems || []);
      if (!unitTypes.length) { skipped++; continue; }
      const file = join(CONTENT, `${slug}.json`);
      let json = {};
      if (existsSync(file)) json = JSON.parse(readFileSync(file, 'utf8'));
      json.slug = json.slug || slug;
      json.name = json.name || it.name;
      json.unitTypes = unitTypes;
      json.unitNote = json.unitNote || '户型面积与开盘起价为开发商公布示意口径（非实时报价）；套数为开发商公布配比示意。实时可售房态与价格以丹枫持牌顾问确认为准。';
      writeFileSync(file, JSON.stringify(json, null, 1) + '\n');
      done++;
      console.log(`✓ ${slug}: ${unitTypes.length} 户型`);
    }
  }
  console.log(`\n完成：写入 ${done} 项目，跳过 ${skipped}（无子项/未匹配 slug）。禁列 ${FORBIDDEN_COLS.length} 个未请求。`);
}

main().catch((e) => { console.error(e); process.exit(1); });
