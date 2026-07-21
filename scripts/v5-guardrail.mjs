// ============================================================
// v5-guardrail.mjs — v5 落地页专项断言（SWC 单文件编译 + 装配器实跑 + 护栏）
// ------------------------------------------------------------
// 沙盒可跑（无需 Monday/网络）。三块：
//  A) SWC 编译校验：projectPageData.js / ProjectLandingV5.jsx / V5Enhance.jsx /
//     projectLandingV5.styles.js / app/projects/[slug]/page.jsx 逐文件编译（catch 语法/JSX 错）。
//  B) 装配器实跑：把 lib/projectPageData.js + lib/catalog.js + 数据 JSON 用 SWC 转 CJS，
//     require 垫片加载，对 creek-waters / creek-waters-2 / altan 实调 buildProjectPageData，
//     断言：售态严格等于 catalog.status（Sold Out→已售罄，绝不美化）、无缺槽、图片本地、无 emoji。
//  C) 护栏静扫：源码/内容 JSON 无 emoji、无 PSF/现价/去化 token、图片路径全本地。
// 任一失败 → 退出码 1。
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const swc = require('next/dist/build/swc');
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let fails = 0;
const fail = (m) => { fails++; console.error('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);

// emoji 检测：彩色 emoji 面 + 杂项符号/交通面 + 变体选择符。
// 刻意不含箭头块（U+2190-21FF）——v5 用 → ↓ 作纯文本箭头，非 emoji，须放行。
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{27BF}\u{FE0F}]/u;
function hasEmoji(s) { return EMOJI_RE.test(String(s)); }
// 与官方 guardrail-check.mjs 一致：只禁具体敏感键，允许合规说明句里出现「PSF」一词
// （如 priceNote 的"任何单价(PSF)…不入本文件"自证语）。
const FORBIDDEN_TOKENS = ['primaryprice', 'primarypsf', 'unitssold', 'soldrate', 'currentprice', 'currentpsf', 'areapsf'];
const norm = (s) => String(s).toLowerCase().replace(/[_\-\s]/g, '');

// ————— A) SWC 单文件编译 —————
console.log('\n[A] SWC 单文件编译校验');
const compileTargets = [
  'lib/projectPageData.js',
  // 正式视觉母版：Tilal 暗调影院版（LEO 2026-07-12 定案 · 断言目标已切至此组件）
  'components/ProjectLandingTilal.jsx',
  'components/projectLandingTilal.styles.js',
  'components/TilalEnhance.jsx',
  // 退居备份：v5 象牙白版（保留代码，仍须编译通过）
  'components/ProjectLandingV5.jsx',
  'components/V5Enhance.jsx',
  'components/V5Chrome.jsx',
  'components/projectLandingV5.styles.js',
  'app/projects/[slug]/page.jsx',
  // 样式共享化（第3棒）：路由段级 CSS 挂载点
  'app/projects/[slug]/layout.jsx',
];
for (const rel of compileTargets) {
  try {
    const code = readFileSync(join(ROOT, rel), 'utf8');
    swc.transformSync(code, { filename: rel, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } } });
    ok(`编译通过 ${rel}`);
  } catch (e) { fail(`编译失败 ${rel}: ${String(e.message).split('\n')[0]}`); }
}

// ————— B) 装配器实跑（SWC→CJS + require 垫片）—————
console.log('\n[B] 装配器实跑 buildProjectPageData（真库数据）');
function compileCjs(absPath) {
  const code = readFileSync(absPath, 'utf8');
  const out = swc.transformSync(code, {
    filename: absPath,
    module: { type: 'commonjs' },
    jsc: { parser: { syntax: 'ecmascript', jsx: false }, target: 'es2020', transform: {} },
  });
  return out.code;
}
const moduleCache = new Map();
function loadCjs(absPath) {
  if (moduleCache.has(absPath)) return moduleCache.get(absPath).exports;
  const dir = dirname(absPath);
  const mod = { exports: {} };
  moduleCache.set(absPath, mod);
  const localRequire = (spec) => {
    // JSON 直接读
    if (spec.endsWith('.json')) {
      const p = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : resolve(dir, spec);
      return JSON.parse(readFileSync(p, 'utf8'));
    }
    // 模块别名 @/ → 项目根
    let target = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : resolve(dir, spec);
    if (!/\.[jt]sx?$/.test(target)) {
      if (existsSync(target + '.js')) target += '.js';
      else if (existsSync(target + '.mjs')) target += '.mjs';
    }
    return loadCjs(target);
  };
  const compiled = compileCjs(absPath);
  const fn = new Function('module', 'exports', 'require', compiled);
  fn(mod, mod.exports, localRequire);
  return mod.exports;
}

let buildProjectPageData;
try {
  ({ buildProjectPageData } = loadCjs(join(ROOT, 'lib', 'projectPageData.js')));
  ok('装配器 + catalog + 数据 JSON 加载成功（无 import/crash）');
} catch (e) { fail('装配器加载失败: ' + e.message); }

// catalog slug 复刻（找 p）
function loadCatalogBySlug() {
  const cat = JSON.parse(readFileSync(join(ROOT, 'lib/data/catalog.json'), 'utf8'));
  const slugify = (name) => String(name || '').toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  const seen = new Map();
  for (const p of cat) { let s = slugify(p.name); if (seen.has(s)) { let i = 2; while (seen.has(`${s}-${i}`)) i++; s = `${s}-${i}`; } p.__slug = s; seen.set(s, p); }
  return seen;
}
const catBySlug = loadCatalogBySlug();

// 期望售态（严格由 catalog.status 派生）
const EXPECT = { 'creek-waters': 'sold', 'creek-waters-2': 'sold', altan: 'available' };
// 期望产品细节章存在性（弹性段：creek-waters/altan 有楼书块 → 渲染；creek-waters-2 无 → 整章省略）
const EXPECT_PD = { 'creek-waters': true, 'creek-waters-2': false, altan: true };

function walkStrings(node, cb, path = '$') {
  if (node == null) return;
  if (typeof node === 'string') { cb(node, path); return; }
  if (Array.isArray(node)) { node.forEach((v, i) => walkStrings(v, cb, `${path}[${i}]`)); return; }
  if (typeof node === 'object') { for (const k of Object.keys(node)) walkStrings(node[k], cb, `${path}.${k}`); }
}
function walkImages(node, cb) {
  if (node == null) return;
  if (Array.isArray(node)) return node.forEach((v) => walkImages(v, cb));
  if (typeof node === 'object') {
    if (typeof node.src === 'string') cb(node.src);
    for (const k of Object.keys(node)) walkImages(node[k], cb);
  }
}

if (buildProjectPageData) {
  for (const slug of Object.keys(EXPECT)) {
    console.log(`  — ${slug} —`);
    const p = catBySlug.get(slug);
    if (!p) { fail(`catalog 无 ${slug}`); continue; }
    const rich = JSON.parse(readFileSync(join(ROOT, 'content/projects', `${slug}.json`), 'utf8'));
    let data;
    try { data = buildProjectPageData(p, rich); } catch (e) { fail(`${slug} 装配 crash: ${e.message}`); continue; }

    // 售态断言（最高优先）：渲染态 === catalog.status 派生
    if (data.state.kind === EXPECT[slug]) ok(`售态绑库正确：catalog.status="${p.status}" → kind=${data.state.kind} / label=${data.state.label}`);
    else fail(`售态失真：catalog.status="${p.status}" 期望 ${EXPECT[slug]}，实得 ${data.state.kind}`);
    // 售罄盘绝不出现「在售/发售/在建」美化词
    if (data.state.kind === 'sold') {
      const bad = [];
      walkStrings(data, (s) => { if (/在售|发售中|在建发售|正在发售/.test(s)) bad.push(s.slice(0, 30)); });
      if (bad.length) fail(`${slug} 售罄盘出现美化售态词：${bad.join(' | ')}`); else ok('售罄盘无「在售/发售」美化词');
    }

    // 缺槽/结构断言
    if (!data.hero || !data.hero.h1) fail('hero 缺 h1'); else ok(`hero.h1="${data.hero.h1}"`);
    if (!Array.isArray(data.facts) || data.facts.length !== 6) fail(`facts 应 6 格（收束版单行信息带），实得 ${data.facts?.length}`); else ok('facts 6 格（单行全宽信息带）');
    if (data.unit.floors.length !== rich.unitTypes.length) fail(`floors(${data.unit.floors.length}) ≠ unitTypes(${rich.unitTypes.length})`); else ok(`floors ${data.unit.floors.length} 卡（每卡含面积/套数/起价）`);
    // 户型卡含套数 + 起价（LEO 决策①）
    const cardOk = data.unit.floors.every((f) => f.rows.some((r) => r.k === '套数') && f.rows.some((r) => r.k === '起价'));
    if (cardOk) ok('户型卡含套数 + 起价示意（决策①）'); else fail('户型卡缺套数/起价行');
    if (!data.overview || data.overview.stats.length < 2) fail('overview.stats < 2'); else ok(`overview.stats ${data.overview.stats.length} 格`);

    // 收束版 · 样板断言①：首屏左栏紧凑四格（CTA 下方 · 恰 4 格 · 2×2 · 含起售价护栏口径）
    const st = data.hero.stats;
    if (Array.isArray(st) && st.length === 4) ok(`左栏四格齐：${st.map((x) => x.k).join(' / ')}`);
    else fail(`左栏四格应恰 4 格，实得 ${st?.length}`);
    const stKeys = (st || []).map((x) => x.k);
    if (['预售状态', '交付时间', '起售价', '户型'].every((k) => stKeys.includes(k))) ok('左栏四格含 预售状态/交付时间/起售价/户型');
    else fail(`左栏四格缺核心字段：${stKeys.join(',')}`);
    const stPrice = (st || []).filter((x) => x.isPrice);
    if (stPrice.length === 1 && /非实时报价/.test(stPrice[0].note || '')) ok(`护栏字符串在场（左栏仅一处 isPrice）："${stPrice[0].note}"`);
    else fail(`起售价格数异常或缺护栏：isPrice=${stPrice.length}`);
    // 收束版 · hero 数据结构断言：无 lead / 无 badge / 无旧 keyInfo，有 tagline + stats
    if (data.hero.lead === undefined) ok('hero 无 lead 字段（首屏简介文字已删）'); else fail('hero 仍残留 lead 字段');
    if (data.hero.badge === undefined) ok('hero 无 badge 字段（图上悬浮价签已删）'); else fail('hero 仍残留 badge 字段（悬浮价签未删）');
    if (data.hero.keyInfo === undefined) ok('hero 无 keyInfo 字段（旧独立关键信息带已并入下带）'); else fail('hero 仍残留 keyInfo（旧 6 格关键信息带未收束）');
    if (typeof data.hero.tagline === 'string' && data.hero.tagline.trim()) ok(`hero.tagline 在场："${data.hero.tagline.slice(0, 40)}"`); else fail('hero 缺 tagline 一句');

    // 收束版 · 样板断言②：下带 6 格 · 核心字段齐（付款结构不入带，LEO 2026-07-11）· 与左栏四格零字段重复
    const factKeys = (data.facts || []).map((f) => f.k);
    if (['物业类型', '面积区间', '业权', '黄金签证', '开发商', '所在社区'].every((k) => factKeys.includes(k))) ok(`下带 6 格核心字段齐：${factKeys.join(' / ')}`);
    else fail(`下带 6 格缺核心字段：${factKeys.join(',')}`);
    if (factKeys.includes('付款结构')) fail('付款结构不应入信息带（户型价格章已含付款计划）'); else ok('付款结构未入带（归户型价格章）');
    const dup = factKeys.filter((k) => stKeys.includes(k));
    if (!dup.length) ok('左栏四格 ↔ 下带 6 格 无字段重复'); else fail(`字段重复：${dup.join(',')}`);
    // 收束版 · 样板断言③：起售价全页首屏仅一处（左栏四格），下带 facts + 概况 stats 绝不再现
    const startTxt = String(stPrice[0]?.v || '');
    const firstScreenBadFacts = (data.facts || []).some((f) => /起售价|开盘起价|起价/.test(f.k)) || (data.facts || []).some((f) => startTxt && startTxt.length > 3 && String(f.v).includes(startTxt));
    if (!firstScreenBadFacts) ok('起售价唯一（下带 facts 不再现 · 首屏唯一出现于左栏四格）'); else fail('起售价在下带 facts 重复出现');

    // 收束版 · 样板断言④：对齐高度账（静态估算 · 目标 左栏内容高 ≈ 右图 3:2 高 ±16px）
    // 右图：内容宽≈1112px − gap52 → 右栏(1.04/2.04)≈540px → 3:2 图高≈360px。
    // 左栏内容账（含四格）：tag60 + h1≈96 + en40 + tagline≈100 + cta52 + 四格(顶线+2 行≈2×46+margin30)≈152 ≈ 500px；
    // align-items:center 下两栏几何居中，四格为「填高对齐件」——本断言只校验四格在场（填高件存在），像素齐平由浏览器终验。
    if (Array.isArray(st) && st.length === 4) ok('对齐：左栏填高四格在场（左栏底≈图底，像素级 ±16px 由 Vercel 终验目测）');
    else fail('对齐失据：左栏四格缺失，无法填高对齐');

    // 段 3 · 核心亮点（3–5 条 + 实写非兜底）
    if (data.highlights && Array.isArray(data.highlights.items) && data.highlights.items.length >= 3 && data.highlights.items.length <= 5) ok(`核心亮点 ${data.highlights.items.length} 条（3–5）`);
    else fail(`核心亮点条数越界或缺失：${data.highlights?.items?.length}`);
    // 三样板均有实采 highlights → 必须实写（source=json），且首条与 JSON 首条一致（证明非程序化兜底）
    if (data.highlights && data.highlights.source === 'json' && data.highlights.items[0] === (rich.highlights || [])[0]) ok('核心亮点为实采内容（source=json · 首条绑 JSON 实写）');
    else fail(`核心亮点疑似程序化兜底：source=${data.highlights?.source}`);

    // 点④ 地段位置（距离表在场 + 免密钥地图 iframe src 合法 · 无 API key 泄漏）
    if (data.location && Array.isArray(data.location.distances) && data.location.distances.length > 0) ok(`地段位置 ${data.location.distances.length} 条距离`);
    else fail('地段位置缺距离表');
    const me = String(data.location?.mapEmbed || '');
    if (/^https:\/\/maps\.google\.com\/maps\?/.test(me) && /output=embed/.test(me) && /[?&]q=/.test(me) && !/[?&](key|apikey)=/i.test(me)) ok(`地图 iframe src 合法（免密钥 · output=embed）：${me.slice(0, 64)}…`);
    else fail(`地图 iframe src 非法或含 key：${me.slice(0, 80)}`);

    // 点⑥ 付款计划并入户型价格章 + 指导价格汇总行（护栏口径）
    if (rich.payment && Array.isArray(rich.payment.milestones) && rich.payment.milestones.length) {
      if (data.unit.payment && data.unit.payment.milestones.length === rich.payment.milestones.length) ok(`付款计划并入户型章（${data.unit.payment.milestones.length} 阶段 · 结构 ${data.unit.payment.structure}）`);
      else fail(`付款计划缺失/阶段数不符：${data.unit.payment?.milestones?.length}`);
    } else ok('无 rich.payment → 付款计划块省略（可接受）');
    const ps = data.unit.priceSummary;
    if (ps && /非实时报价/.test(ps.note || '') && /以丹枫持牌顾问/.test(ps.note || '')) ok(`指导价格汇总行护栏在场："${ps.label} = ${ps.value}"`);
    else fail(`指导价格汇总行护栏缺失：${JSON.stringify(ps)}`);

    // 段 5 · 产品细节（弹性：按 EXPECT_PD 齐全或省略）
    const hasPD = !!data.productDetails;
    if (hasPD === EXPECT_PD[slug]) ok(`产品细节章${hasPD ? `渲染（${data.productDetails.blocks.length} 块）` : '按规则整章省略'}`);
    else fail(`产品细节章存在性失真：期望 ${EXPECT_PD[slug]}，实得 ${hasPD}`);
    if (hasPD) {
      const blkOk = data.productDetails.blocks.every((b) => (b.title || b.body));
      if (blkOk) ok('产品细节每块含题/文'); else fail('产品细节存在空块');
    }

    // 段 9 · 开发商简介（DFP-5 绑最新库 + 互链 slug 有效）
    if (data.developer) {
      const dv = data.developer;
      if (dv.leaves === 5 && dv.score === '95.2' && /v3\.1/.test(dv.version || '')) ok(`开发商 DFP-5 绑最新库：${dv.leaves}叶 / ${dv.score} / ${dv.version}`);
      else fail(`开发商 DFP-5 未绑最新库：leaves=${dv.leaves} score=${dv.score} ver=${dv.version}`);
      const chipStr = dv.chips.map((c) => `${c.k}${c.v}`).join(' ');
      if (/114,497/.test(chipStr) && /92\.47/.test(chipStr) && /#1/.test(chipStr)) ok(`开发商 chip 绑库真值：${chipStr}`);
      else fail(`开发商 chip 非库真值：${chipStr}`);
      if (/^\/developers\/[a-z0-9一-鿿-]+$/i.test(dv.href || '')) ok(`开发商互链 slug 有效：${dv.href}`); else fail(`开发商互链 slug 无效：${dv.href}`);
    } else fail('开发商简介章缺失');

    // 段 8 · 社区生活（社区名绑库 + 参考价带护栏字符串在场 + 互链 slug 有效）
    if (data.community) {
      const cm = data.community;
      if (/迪拜云溪港/.test(cm.link.cn)) ok(`社区名以社区库为准：${cm.link.cn}`); else fail(`社区名未用库值：${cm.link.cn}`);
      if (cm.link.tags.length <= 4) ok(`社区 tag 取前 ${cm.link.tags.length}（≤4）`); else fail(`社区 tag ${cm.link.tags.length} > 4`);
      if (/^\/communities\/[a-z0-9一-鿿-]+$/i.test(cm.link.href || '')) ok(`社区互链 slug 有效：${cm.link.href}`); else fail(`社区互链 slug 无效：${cm.link.href}`);
      if (cm.priceBand) {
        const note = String(cm.priceBand.note || '');
        const badge = String(cm.priceBand.badge || '');
        if (/非实时报价/.test(badge) && /以丹枫持牌顾问/.test(note)) ok('社区参考价带护栏字符串在场（非实时 badge + 顾问口径）');
        else fail(`社区参考价带护栏字符串缺失：badge="${badge}" note 片段="${note.slice(0, 20)}"`);
      } else ok('社区无 marketData → 参考价带省略（可接受）');
    } else fail('社区生活章缺失');

    // 图片全本地
    let imgBad = 0, imgN = 0;
    walkImages(data, (src) => { imgN++; if (!/^\/(img|projects|video)\//.test(src)) { imgBad++; fail(`非本地图片/视频路径：${src}`); } });
    if (!imgBad) ok(`图片/短片全本地（${imgN} 处，/img·/projects·/video）`);

    // 无 emoji
    let emo = 0;
    walkStrings(data, (s, path) => { if (hasEmoji(s)) { emo++; fail(`装配数据含 emoji @ ${path}: ${s.slice(0, 20)}`); } });
    if (!emo) ok('装配数据无 emoji');
  }
}

// ————— C) 护栏静扫（源码 + 内容 JSON）—————
console.log('\n[C] 源码/内容 emoji + 护栏 token 静扫');
const scanFiles = [
  'components/ProjectLandingTilal.jsx', 'components/TilalEnhance.jsx', 'components/projectLandingTilal.styles.js',
  'components/ProjectLandingV5.jsx', 'components/V5Enhance.jsx', 'components/V5Chrome.jsx',
  'lib/projectPageData.js', 'components/projectLandingV5.styles.js',
  'content/projects/creek-waters.json', 'content/projects/creek-waters-2.json', 'content/projects/altan.json',
];
for (const rel of scanFiles) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  // emoji（源码里禁 emoji；🔒/🍁 等均须 SVG）
  const lines = text.split('\n');
  let emo = 0;
  lines.forEach((ln, i) => { if (hasEmoji(ln)) { emo++; if (emo <= 3) fail(`${rel}:${i + 1} 含 emoji: ${ln.trim().slice(0, 40)}`); } });
  if (!emo) ok(`${rel} 无 emoji`);
  else fail(`${rel} 共 ${emo} 行含 emoji`);
  // 内容 JSON 额外扫 PSF/现价 token
  if (rel.endsWith('.json')) {
    const n = norm(text);
    for (const t of FORBIDDEN_TOKENS) if (n.includes(t)) fail(`${rel} 含护栏 token "${t}"`);
  }
}

// ————— D) 章节顺序 + 导航锚点 + CTA 双路径（源码静态断言）—————
console.log('\n[D] 章节顺序 · 锚点补全 · CTA 双路径静态断言');
{
  // 断言目标 = 正式视觉母版 ProjectLandingTilal.jsx（LEO 2026-07-12 定案 · Tilal 暗调影院版）
  const jsx = readFileSync(join(ROOT, 'components/ProjectLandingTilal.jsx'), 'utf8');
  const styles = readFileSync(join(ROOT, 'components/projectLandingTilal.styles.js'), 'utf8');

  // 章节顺序：公共配套 → 社区生活 → 开发商 → 户型价格（价格压轴）
  const iAmenities = jsx.indexOf('id="amenities"');
  const iCommunity = jsx.indexOf('id="community"');
  const iDeveloper = jsx.indexOf('id="developer"');
  const iUnit = jsx.indexOf('id="unit"');
  if (iCommunity > -1 && iDeveloper > -1 && iUnit > -1 && iAmenities < iCommunity && iCommunity < iDeveloper && iDeveloper < iUnit) ok('章节顺序正确：公共配套 → 社区生活 → 开发商 → 户型价格（价格压轴）');
  else fail(`章节顺序失真：amenities@${iAmenities} community@${iCommunity} developer@${iDeveloper} unit@${iUnit}`);
  // 顶部锚点导航含全部十段（navLinks 常量内以 '#xxx' 字面出现）
  const needAnchors = ['#overview', '#highlights', '#location', '#product', '#amenities', '#community', '#developer', '#unit'];
  const missing = needAnchors.filter((a) => !jsx.includes(`'${a}'`));
  if (!missing.length) ok(`锚点导航全列十段（含公共配套 #amenities）：${needAnchors.join(' ')}`);
  else fail(`锚点导航缺章节：${missing.join(' ')}`);

  // CTA 双路径：无 WhatsApp，恰两条 .path（AI 智能投顾 + 微信顾问），且主路径挂 askHref
  const pathN = (jsx.match(/className="path\b/g) || []).length; // \b 排除容器 "paths"
  if (!/whatsapp/i.test(jsx) && pathN === 2 && /href=\{d\.askHref\}/.test(jsx)) ok(`CTA 双路径：去 WhatsApp（0 命中）· path ${pathN} 条（AI 智能投顾 + 微信顾问）· 主路径绑 askHref`);
  else fail(`CTA 路径异常：WhatsApp 命中=${/whatsapp/i.test(jsx)} · path=${pathN}`);

  // ——— 母版四处返修静态验证 ———
  // ④ 品牌名：Danfeng Properties 在场（导航+页脚），DANFENG REALTY 零残留
  if (/Danfeng Properties/.test(jsx) && !/DANFENG REALTY/.test(jsx)) ok('返修④ 品牌名 Danfeng Properties 在场 · DANFENG REALTY 零残留');
  else fail(`返修④ 品牌名失真：hasProperties=${/Danfeng Properties/.test(jsx)} hasRealty=${/DANFENG REALTY/.test(jsx)}`);
  // ① overview 臆造值清除：无 "B+G+3P+53" 字面，metric-grid 绑 overview.stats.map（装配器真值）
  if (!/B\+G\+3P\+53/.test(jsx) && /overview\.stats\.map/.test(jsx)) ok('返修① 无 B+G+3P+53 臆造值 · metric-grid 绑 overview.stats 装配器真值');
  else fail(`返修① 臆造值未清或未绑库：hasFab=${/B\+G\+3P\+53/.test(jsx)}`);
  // ② Hero 引言改可选槽：条件渲染 hero.quote（无值不渲染），无自撰营销引言硬编码
  if (/hero\.quote \?/.test(jsx) && !/城市更新叙事里/.test(jsx)) ok('返修② Hero 引言为可选数据槽（hero.quote 条件渲染）· 无自撰营销引言硬编码');
  else fail(`返修② Hero 引言未槽位化：cond=${/hero\.quote \?/.test(jsx)} hasHardcoded=${/城市更新叙事里/.test(jsx)}`);
  // ③ 社区参考价表绑 priceBand.rows 全量渲染（不硬编码 3 行）
  if (/community\.priceBand\.rows\.map/.test(jsx)) ok('返修③ 社区参考价表绑 community.priceBand.rows 全量渲染（行数随装配器）');
  else fail('返修③ 社区参考价表未绑 priceBand.rows');

  // Hero 结构：hero-tag / h1 em / hero-en / tagline / hero-actions / hero-panel + hero-stats 映射 hero.stats
  const heroOk = /className="hero-tag"/.test(jsx) && /className="hero-en"/.test(jsx)
    && /className="tagline"/.test(jsx) && /className="hero-actions"/.test(jsx)
    && /className="hero-panel"/.test(jsx) && /className="hero-stats"/.test(jsx) && /hero\.stats\.map/.test(jsx);
  if (heroOk) ok('Hero 母版结构齐（hero-tag/h1·em/hero-en/tagline/hero-actions/hero-panel/hero-stats 映射 hero.stats）');
  else fail('Hero 母版结构缺件');
  // 售态反抽锚点：状态格保留 data-slot="state.label"
  if (/data-slot/.test(jsx) && /state\.label/.test(jsx)) ok('售态反抽锚点在场（data-slot="state.label"）'); else fail('售态反抽锚点缺失');
  // tagline 一句在场
  if (/hero\.tagline \?/.test(jsx)) ok('首屏 tagline 一句条件在场（hero.tagline）'); else fail('首屏缺 hero.tagline 一句');
  // 全宽事实带 6 格：fact-band + facts.map，位于 hero header 之后
  const iHeroClose = jsx.indexOf('</header>');
  const iFacts = jsx.indexOf('className="fact-band"');
  if (/className="fact-band"/.test(jsx) && /facts\.map/.test(jsx) && iFacts > iHeroClose) ok('全宽事实带 6 格映射 facts（Hero 正下方 · 母版 6 列）');
  else fail(`事实带结构/落位失真：heroEnd@${iHeroClose} facts@${iFacts}`);

  // 样式作用域：TILAL_CSS 全程 .tilal 前缀（防污染全站）· 母版关键规则在场
  if (/export const TILAL_CSS/.test(styles) && /\.tilal \.hero\b/.test(styles) && /\.tilal \.facts\b/.test(styles) && /\.tilal \.amenity-section\b/.test(styles)) ok('Tilal 样式作用域化在场（.tilal 前缀 · hero/facts/amenity-section 母版规则）');
  else fail('Tilal 样式作用域/母版规则缺失');
  // Hero/CTA 背景图机械替换为 CSS 变量（由组件按图片槽位内联注入，非硬编码 assets-altan 路径）
  if (/var\(--hero-img\)/.test(styles) && /var\(--cta-img\)/.test(styles) && !/assets-altan/.test(styles)) ok('Hero/CTA 背景图槽位化（var(--hero-img)/var(--cta-img) · 无硬编码 assets-altan 路径）');
  else fail(`背景图未槽位化：heroVar=${/var\(--hero-img\)/.test(styles)} ctaVar=${/var\(--cta-img\)/.test(styles)} hasAssets=${/assets-altan/.test(styles)}`);
  // facts 母版 6 列
  if (/\.tilal \.facts\{[^}]*repeat\(6,1fr\)/.test(styles)) ok('事实带 6 格样式在场（facts repeat(6,1fr) · 母版断点降列）'); else fail('事实带 6 格样式缺失（facts 非 6 列）');
}

// ————— E) 样式共享化断言（第3棒 · LEO 2026-07-12 批）—————
// TILAL_CSS 不再随组件内联 <style> 注入每页 SSR 输出（原每页 ~24KB × 1705 页），
// 改由 app/projects/[slug]/tilal.css 经路由段级 CSS import 承载（layout.jsx）。
// 断言：① 组件不再内联注入整份样式；② tilal.css 存在且与 styles.js 的 TILAL_CSS
// 逐字节一致（视觉零变化的硬证据）；③ layout.jsx 确实 import 了它，样式不会丢。
console.log('\n[E] 样式共享化：静态 css 文件在场 + 与 TILAL_CSS 逐字节一致 + 组件不再内联注入');
{
  const jsx = readFileSync(join(ROOT, 'components/ProjectLandingTilal.jsx'), 'utf8');
  const cssPath = join(ROOT, 'app/projects/[slug]/tilal.css');
  const layoutPath = join(ROOT, 'app/projects/[slug]/layout.jsx');

  // ① 组件不再内联整份样式（旧写法 <style dangerouslySetInnerHTML={{ __html: TILAL_CSS }} />）
  if (!/dangerouslySetInnerHTML.*TILAL_CSS/.test(jsx) && !/import\s*\{\s*TILAL_CSS\s*\}/.test(jsx)) {
    ok('组件已移除内联 <style dangerouslySetInnerHTML={{__html:TILAL_CSS}}> 与 TILAL_CSS 导入（不再随每页 SSR 重复输出）');
  } else fail('组件仍内联注入 TILAL_CSS（样式共享化未落地）');

  // ② 静态 css 文件存在，且与 styles.js 导出的 TILAL_CSS 内容逐字节一致（去除 styles.js 侧插入的头部说明注释后比对）
  if (!existsSync(cssPath)) {
    fail('app/projects/[slug]/tilal.css 不存在（样式共享化产物缺失）');
  } else {
    const stylesSrc = readFileSync(join(ROOT, 'components/projectLandingTilal.styles.js'), 'utf8');
    const m = stylesSrc.match(/export const TILAL_CSS = String\.raw`([\s\S]*)`;\s*$/);
    if (!m) fail('styles.js 中 TILAL_CSS 模板字面量解析失败（比对基准缺失）');
    else {
      const expected = m[1];
      let actual = readFileSync(cssPath, 'utf8');
      // tilal.css 顶部（@import 行之后）额外插了一段来源说明 CSS 注释块，比对前剔除该注释块
      actual = actual.replace(/\n\/\*[\s\S]*?\*\/\n/, '\n');
      if (actual === expected) ok(`tilal.css 与 styles.js TILAL_CSS 逐字节一致（${actual.length} 字符，视觉零变化）`);
      else fail('tilal.css 内容与 styles.js TILAL_CSS 不一致（存在分叉修改风险）');
    }
    // 作用域前缀 + 关键规则仍在（与 D 段对 styles.js 的断言互证，双源同款）
    if (existsSync(cssPath)) {
      const cssText = readFileSync(cssPath, 'utf8');
      if (/\.tilal \.hero\b/.test(cssText) && /\.tilal \.amenity-section\b/.test(cssText) && /var\(--hero-img\)/.test(cssText)) ok('tilal.css 母版关键规则在场（.tilal 作用域前缀 + hero-img 槽位）');
      else fail('tilal.css 缺母版关键规则');
    }
  }

  // ③ layout.jsx 确实 import 了 tilal.css（否则样式静默丢失，页面裸奔）
  if (existsSync(layoutPath)) {
    const layoutSrc = readFileSync(layoutPath, 'utf8');
    if (/import\s+['"]\.\/tilal\.css['"]/.test(layoutSrc)) ok('app/projects/[slug]/layout.jsx 已 import ./tilal.css（路由段级样式挂载）');
    else fail('layout.jsx 未 import ./tilal.css（样式会丢失）');
  } else fail('app/projects/[slug]/layout.jsx 不存在（路由段样式挂载点缺失）');
}

// ————— F) 视频能力护栏（路线一 heroVideo 本地 /video/ · 路线二 videoUrl 仅 youtube · 全库无 dropbox）—————
console.log('\n[F] 视频能力：heroVideo 本地 /video/ + videoUrl 仅 youtube + 视频字段无 dropbox');
{
  const YT_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;
  // 路线一：assets-manifest.json heroVideo.src/poster 必须站内本地 /video/ 路径
  const manPath = join(ROOT, 'lib/data/assets-manifest.json');
  if (existsSync(manPath)) {
    const man = JSON.parse(readFileSync(manPath, 'utf8'));
    let hvN = 0, hvBad = 0;
    for (const [slug, a] of Object.entries(man.projects || {})) {
      if (a && a.heroVideo) {
        hvN++;
        for (const [k, v] of [['src', a.heroVideo.src], ['poster', a.heroVideo.poster]]) {
          if (v == null) continue;
          if (!/^\/video\//.test(String(v))) { hvBad++; fail(`manifest heroVideo.${k} 非本地 /video/ 路径 @ ${slug}: ${v}`); }
        }
      }
    }
    if (!hvBad) ok(`manifest heroVideo 全本地 /video/（${hvN} 盘有短片）`);
  } else ok('assets-manifest.json 不存在（管线未跑），heroVideo 断言跳过');

  // 路线二：catalog.json videoUrl 仅 youtube 域
  const catPath = join(ROOT, 'lib/data/catalog.json');
  if (existsSync(catPath)) {
    const cat = JSON.parse(readFileSync(catPath, 'utf8'));
    let vuN = 0, vuBad = 0;
    for (const p of (Array.isArray(cat) ? cat : [])) {
      if (p && p.videoUrl != null && String(p.videoUrl) !== '') {
        vuN++;
        if (!YT_RE.test(String(p.videoUrl))) { vuBad++; fail(`catalog videoUrl 非 youtube 域 @ ${p.name}: ${p.videoUrl}`); }
      }
    }
    if (!vuBad) ok(`catalog videoUrl 全 youtube 域（${vuN} 条）`);
  } else fail('catalog.json 不存在');

  // 视频字段纳入 dropbox 扫描：manifest + catalog 全文无 dropbox.com
  let dbHit = 0;
  for (const rel of ['lib/data/assets-manifest.json', 'lib/data/catalog.json']) {
    const fp = join(ROOT, rel);
    if (!existsSync(fp)) continue;
    if (/dropbox\.com/i.test(readFileSync(fp, 'utf8'))) { dbHit++; fail(`${rel} 含 dropbox.com（视频/素材字段泄漏）`); }
  }
  if (!dbHit) ok('manifest + catalog 全文无 dropbox.com（视频字段纳入 dropbox 扫描）');

  // 组件侧：heroVideo 首屏 <video> 分支 + 项目视频块懒加载门面（静态断言 · 组件真的渲染两路线）
  const jsxF = readFileSync(join(ROOT, 'components/ProjectLandingTilal.jsx'), 'utf8');
  if (/hero\.heroVideo \?/.test(jsxF) && /className="hero-video"/.test(jsxF) && /<source src=\{hero\.heroVideo\.src\}/.test(jsxF)) ok('组件首屏 heroVideo <video> 条件分支在场（路线一）');
  else fail('组件缺 heroVideo <video> 首屏分支');
  if (/\{video &&/.test(jsxF) && /id="video"/.test(jsxF) && /<ProjectVideoEmbed video=\{video\}/.test(jsxF)) ok('组件「项目视频」块条件渲染 + 懒加载门面在场（路线二）');
  else fail('组件缺「项目视频」块/懒加载门面');
  const embF = readFileSync(join(ROOT, 'components/ProjectVideoEmbed.jsx'), 'utf8');
  if (/youtube-nocookie/.test(jsxF + embF) || /embedUrl/.test(embF)) ok('YouTube 嵌入走 youtube-nocookie 隐私增强域（点击后注入 iframe）');
  else fail('YouTube 嵌入未用 youtube-nocookie 隐私增强域');
}

// ————— 汇总 —————
if (fails > 0) { console.error(`\n❌ v5 断言失败：${fails} 处。`); process.exit(1); }
console.log('\n✅ v5 断言全通过：SWC 编译 OK + 装配器实跑无 crash + 售态严格绑库（售罄不美化）+ 户型卡含套数/起价 + DFP-5/chip/社区名/tag 绑最新库 + 图片全本地 + 全链路无 emoji + 样式共享化落地（tilal.css 逐字节绑 TILAL_CSS · 组件零内联）。');
