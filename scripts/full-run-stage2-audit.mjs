// ============================================================
// full-run-stage2-audit.mjs — 全量 1705 项装配器稳健性抽验（全量实跑 · 非抽样）
// ------------------------------------------------------------
// 沙盒可跑（无网络/无 Monday）。复用 v5-guardrail 的 SWC→CJS require 垫片，
// 用最终 catalog.json（1705）逐项实调 buildProjectPageData(p, loadRich(slug)||{})。
// 统计：crash 数 / 各章渲染率 / 售态分布 / undefined·NaN·null 文本泄漏 / emoji /
//       10 个最稀薄项目降级样例。任何 crash > 0 或泄漏 > 0 → 退出码 1。
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const hasEmoji = (s) => EMOJI_RE.test(String(s));

// —— SWC→CJS require 垫片（与 v5-guardrail 同源）——
function compileCjs(absPath) {
  const code = readFileSync(absPath, 'utf8');
  return swc.transformSync(code, {
    filename: absPath,
    module: { type: 'commonjs' },
    jsc: { parser: { syntax: 'ecmascript', jsx: false }, target: 'es2020', transform: {} },
  }).code;
}
const moduleCache = new Map();
function loadCjs(absPath) {
  if (moduleCache.has(absPath)) return moduleCache.get(absPath).exports;
  const dir = dirname(absPath);
  const mod = { exports: {} };
  moduleCache.set(absPath, mod);
  const localRequire = (spec) => {
    if (spec.endsWith('.json')) {
      const p = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : resolve(dir, spec);
      return JSON.parse(readFileSync(p, 'utf8'));
    }
    let target = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : resolve(dir, spec);
    if (!/\.[jt]sx?$/.test(target)) {
      if (existsSync(target + '.js')) target += '.js';
      else if (existsSync(target + '.mjs')) target += '.mjs';
    }
    return loadCjs(target);
  };
  const fn = new Function('module', 'exports', 'require', compileCjs(absPath));
  fn(mod, mod.exports, localRequire);
  return mod.exports;
}

const { buildProjectPageData } = loadCjs(join(ROOT, 'lib', 'projectPageData.js'));

// —— catalog 复刻 __slug（与 catalog.js 同算法 + 去重）——
const cat = JSON.parse(readFileSync(join(ROOT, 'lib/data/catalog.json'), 'utf8'));
const slugify = (name) => String(name || '').toLowerCase().trim().replace(/&/g, ' and ')
  .replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
const seen = new Map();
for (const p of cat) { let s = slugify(p.name); if (seen.has(s)) { let i = 2; while (seen.has(`${s}-${i}`)) i++; s = `${s}-${i}`; } p.__slug = s; seen.set(s, p); }

const subIndex = JSON.parse(readFileSync(join(ROOT, 'lib/data/subitems-index.json'), 'utf8'));
function loadRich(slug) {
  try { return JSON.parse(readFileSync(join(ROOT, 'content/projects', `${slug}.json`), 'utf8')); }
  catch { return {}; }
}

// —— walk helpers ——
function walkStrings(node, cb, path = '$') {
  if (node == null) return;
  if (typeof node === 'string') { cb(node, path); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => walkStrings(v, cb, `${path}[${i}]`)); return; }
  if (typeof node === 'object') { for (const k of Object.keys(node)) walkStrings(node[k], cb, `${path}.${k}`); }
}
// 泄漏词：整词边界（避免误伤 "Nullah" 类正常词；这里数据全中英文，直接子串足够）。
const LEAK_RE = /(undefined|NaN|\bnull\b)/;

const stats = {
  total: cat.length, crashes: [], leaks: [], emojis: [],
  heroImg: 0, floors: 0, floorsFromSub: 0, highlights: 0, hlJson: 0, location: 0,
  productDetails: 0, amenities: 0, community: 0, communityPriceBand: 0,
  developer: 0, developerRated: 0,
  sale: { sold: 0, coming: 0, available: 0, other: 0 },
};
const richness = []; // {slug, score, data-summary}

for (const p of cat) {
  const slug = p.__slug;
  const rich = loadRich(slug);
  const hadRichUnits = Array.isArray(rich.unitTypes) && rich.unitTypes.length > 0;
  let data;
  try { data = buildProjectPageData(p, rich); }
  catch (e) { stats.crashes.push({ slug, name: p.name, err: String(e && e.message).split('\n')[0] }); continue; }

  // 售态
  stats.sale[data.state.kind] = (stats.sale[data.state.kind] || 0) + 1;
  // 各章渲染率
  if (data.hero && data.hero.image) stats.heroImg++;
  const nFloors = (data.unit && data.unit.floors) ? data.unit.floors.length : 0;
  if (nFloors > 0) { stats.floors++; if (!hadRichUnits) stats.floorsFromSub++; }
  if (data.highlights) { stats.highlights++; if (data.highlights.source === 'json') stats.hlJson++; }
  if (data.location) stats.location++;
  if (data.productDetails) stats.productDetails++;
  if (data.amenities) stats.amenities++;
  if (data.community) { stats.community++; if (data.community.priceBand) stats.communityPriceBand++; }
  if (data.developer) { stats.developer++; if (data.developer.rated) stats.developerRated++; }

  // 泄漏 + emoji 扫描（全字符串）
  walkStrings(data, (s, path) => {
    if (LEAK_RE.test(s)) stats.leaks.push({ slug, path, sample: s.slice(0, 60) });
    if (hasEmoji(s)) stats.emojis.push({ slug, path, sample: s.slice(0, 30) });
  });

  // 稀薄度评分（分越低越稀薄）
  const score =
    (/[0-9]/.test(String(p.startHint || '')) ? 1 : 0) +
    (String(p.location || '').trim() ? 1 : 0) +
    (String(p.amenities || '').trim() ? 1 : 0) +
    (data.community ? 1 : 0) +
    (data.developer ? 1 : 0) +
    (data.developer && data.developer.rated ? 1 : 0) +
    (nFloors > 0 ? 1 : 0) +
    (String(p.cn || '').trim() ? 1 : 0) +
    (String(p.tags || '').trim() ? 1 : 0) +
    (String(p.handover || '').trim() ? 1 : 0);
  richness.push({
    slug, name: p.name, score,
    summary: {
      status: p.status, saleKind: data.state.kind,
      dev: p.developer, devRated: !!(data.developer && data.developer.rated),
      area: p.area, community: !!data.community,
      floors: nFloors, highlights: data.highlights ? data.highlights.items.length : 0,
      hlSource: data.highlights ? data.highlights.source : '-',
      location: !!data.location, amenities: !!data.amenities, heroImg: !!(data.hero && data.hero.image),
      priceSummary: data.unit && data.unit.priceSummary ? data.unit.priceSummary.value : null,
      guardOk: !!(data.unit && data.unit.priceSummary && /非实时报价/.test(data.unit.priceSummary.note || '')),
    },
  });
}

const pct = (n) => `${n} (${(n / stats.total * 100).toFixed(1)}%)`;
console.log('===== 全量 1705 装配稳健性抽验 =====');
console.log(`总项目：${stats.total}`);
console.log(`CRASH：${stats.crashes.length}`);
if (stats.crashes.length) stats.crashes.slice(0, 20).forEach((c) => console.log(`  ✗ ${c.slug} · ${c.name}: ${c.err}`));
console.log('\n--- 售态分布 ---');
console.log(`  在售 available：${pct(stats.sale.available)}`);
console.log(`  即将开盘 coming：${pct(stats.sale.coming)}`);
console.log(`  已售罄 sold：${pct(stats.sale.sold)}`);
console.log(`  其他/待更新 other：${pct(stats.sale.other)}`);
console.log('\n--- 各章渲染率 ---');
console.log(`  Hero 有真图：${pct(stats.heroImg)}`);
console.log(`  户型卡(floors>0)：${pct(stats.floors)}  其中 subitems 回落点亮：${stats.floorsFromSub}`);
console.log(`  核心亮点章：${pct(stats.highlights)}  其中实采 json：${stats.hlJson}（其余为程序化兜底）`);
console.log(`  地段位置章：${pct(stats.location)}`);
console.log(`  产品细节章(弹性)：${pct(stats.productDetails)}`);
console.log(`  公共配套章：${pct(stats.amenities)}`);
console.log(`  社区生活章：${pct(stats.community)}  其中带参考价带：${stats.communityPriceBand}`);
console.log(`  开发商章：${pct(stats.developer)}  其中当前版 DFP-5 评级：${stats.developerRated}`);
console.log('\n--- 泄漏 / emoji 扫描 ---');
console.log(`  undefined/NaN/null 文本泄漏：${stats.leaks.length}`);
stats.leaks.slice(0, 30).forEach((l) => console.log(`    ✗ ${l.slug} @ ${l.path}: ${l.sample}`));
console.log(`  emoji 泄漏：${stats.emojis.length}`);
stats.emojis.slice(0, 30).forEach((l) => console.log(`    ✗ ${l.slug} @ ${l.path}: ${l.sample}`));

console.log('\n--- 10 个最稀薄项目降级样例 ---');
richness.sort((a, b) => a.score - b.score || a.slug.localeCompare(b.slug));
for (const r of richness.slice(0, 10)) {
  console.log(`  [score ${r.score}] ${r.slug} · ${r.name}`);
  console.log(`    ${JSON.stringify(r.summary)}`);
}

// 稀薄样例护栏检查：全部必须有 priceSummary 护栏串在场
const thinNoGuard = richness.slice(0, 30).filter((r) => !r.summary.guardOk);
console.log(`\n  最稀薄 30 项中缺失指导价护栏串：${thinNoGuard.length}`);
thinNoGuard.forEach((r) => console.log(`    ✗ ${r.slug}`));

const fail = stats.crashes.length > 0 || stats.leaks.length > 0 || stats.emojis.length > 0;
if (fail) { console.error('\n❌ 抽验未过：存在 crash / 泄漏 / emoji。'); process.exit(1); }
console.log('\n✅ 全量抽验通过：0 crash · 0 泄漏 · 0 emoji · 全项装配成功。');
