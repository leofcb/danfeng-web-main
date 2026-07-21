// ============================================================
// build-developers.mjs — 开发商维表构建（320 家，全板全量）
// ------------------------------------------------------------
// 输入：lib/data/raw-developers.json（Monday「Companies: Developers」板
//        6350528756 全量只读导出，仅含 AI 可读列，全板分页拉取）。
// 输出：lib/data/developers.json（schema 与 catalog 风格一致，中文注释）。
//
// 键 = name，必须与 catalog.json 的 developer 字段值对齐。
//
// 🔴 护栏：绝不导出 Registration Status / RENEW STATUS / Priority /
//    Contacts·Deals 关系及其 Count 公式 / 四个 rating 列 / Office Location /
//    DLD SPVs 关系。这些是商务 CRM 与内部评级，脚本只消费白名单列，
//    禁列从源头就不在 raw-developers.json 中。
//
// 🟢 DFP-5 例外：DFP5 Score/Leaves/Rating Status/Coverage/Confidence/
//    Rated Date/Version + A~E 五维分是 LEO 批准的对客客观评级数据，
//    非商务 CRM/内部评级，允许导出至 dfp5 块。NR（未评级）者仅带
//    {status:"NR"}，不带分数字段。
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'lib', 'data');

const RAW = JSON.parse(readFileSync(join(DATA, 'raw-developers.json'), 'utf8'));

// —— Monday 列 id → 语义（仅白名单 AI 可读列）——
//   text_mm4wsw1a               Brand CN（中文名）
//   link                        Website
//   country                     Country
//   numbers                     Year Founded
//   dup__of_year_founded_...    Employee（员工数）
//   color_mm4w3av0              Ownership（所有制）
//   color_mm4ww0wj              Tier（梯队）
//   text_mm4h7dqr               Developer Number（主号）
//   numeric_mm4wtkfp            DXB Rank
//   numeric_mm4wbj6m            Transactions YTD
//   numeric_mm4wfpkq            Sales Value AED B
//   numeric_mm4wkdfd            Capital Gain AED B
//   numeric_mm4wtb1j            Capital Gain %
//   numeric_mm4wxkkt            Absorption %
//   numeric_mm4wtkb6            UC Projects
//   numeric_mm4wszjg            UC Units
//   numeric_mm4w53bh            Delivered Projects
//   numeric_mm4wnfa1            Delivered Units
//   text_mm4w3p5j               Bed Mix
//   date_mm4w4t07               DXB As-of
//   link_mm4wsw24               DXB Link
//   long_text_mm4wfe9p          Track Record EN
//   long_text_mm4w8rt3          Blurb CN
//   text_mm4w93ak              On-Board Stats
//
//   —— DFP-5 评级块（对客客观数据，LEO 批准）——
//   numeric_mm4xhkam            DFP5 Score (0-100)
//   numeric_mm4xnzwb            DFP5 Leaves (0.5-5)
//   color_mm4xxajz              DFP5 Rating Status (Rated/NR)
//   numeric_mm4xx6se            DFP5 Coverage %
//   color_mm4xx4ak              DFP5 Confidence (High/Medium/Low)
//   date_mm4xbw3h               DFP5 Rated Date
//   text_mm4xv7ak               DFP5 Version
//   numeric_mm4xe95c            DFP5 A（交付履约维）
//   numeric_mm4xhhp2            DFP5 B（市场表现维）
//   numeric_mm4xfnf7            DFP5 C（规模与趋势维）
//   numeric_mm4x6nan            DFP5 D（注册合规维）
//   numeric_mm4xd84m            DFP5 E（公司背景维）
//   —— DFP-5 指标级采集列（首席官批准落地，仅 Rated 家带）——
//   numeric_mm4x5f1w            A2 工期中位（月）→ a2MedianMonths
//   numeric_mm4ybdnx            A2 样本数         → a2Samples
//   numeric_mm4yx1y0            A2b 准时率参考(%) → a2bOntimeRefPct（标「参考」）
//   numeric_mm4xtm0x            D1 合规托管覆盖(%)→ d1EscrowPct（口径「合规托管覆盖」，非「资金安全」）

// —— 空值归一：空串 / null / undefined → undefined（省略键）——
function str(v) {
  const s = v == null ? '' : String(v).trim();
  return s || undefined;
}
function num(v) {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

// —— DXB 分析块：任一子字段非空才输出，全部干净（省略空键）——
function buildDxb(r) {
  const dxb = {};
  const set = (k, v) => { if (v !== undefined) dxb[k] = v; };
  set('rank', num(r.numeric_mm4wtkfp));
  set('transactionsYtd', num(r.numeric_mm4wbj6m));
  set('salesValueBn', num(r.numeric_mm4wfpkq));
  set('capitalGainBn', num(r.numeric_mm4wkdfd));
  set('capitalGainPct', num(r.numeric_mm4wtb1j));
  set('absorptionPct', num(r.numeric_mm4wxkkt));
  set('ucProjects', num(r.numeric_mm4wtkb6));
  set('ucUnits', num(r.numeric_mm4wszjg));
  set('deliveredProjects', num(r.numeric_mm4w53bh));
  set('deliveredUnits', num(r.numeric_mm4wnfa1));
  set('bedMix', str(r.text_mm4w3p5j));
  set('asOf', str(r.date_mm4w4t07));
  set('link', str(r.link_mm4wsw24));
  return Object.keys(dxb).length ? dxb : undefined;
}

// —— DFP5 评级块：NR 只带 {status:"NR"}；Rated 带完整分数+五维 ——
function buildDfp5(r) {
  const status = str(r.color_mm4xxajz);
  if (!status) return undefined;
  if (status !== 'Rated') return { status };
  const dfp5 = { status };
  const set = (k, v) => { if (v !== undefined) dfp5[k] = v; };
  set('score', num(r.numeric_mm4xhkam));
  set('leaves', num(r.numeric_mm4xnzwb));
  set('coverage', num(r.numeric_mm4xx6se));
  set('confidence', str(r.color_mm4xx4ak));
  set('ratedDate', str(r.date_mm4xbw3h));
  set('version', str(r.text_mm4xv7ak));
  const dims = {};
  const setDim = (k, v) => { if (v !== undefined) dims[k] = v; };
  setDim('a', num(r.numeric_mm4xe95c));
  setDim('b', num(r.numeric_mm4xhhp2));
  setDim('c', num(r.numeric_mm4xfnf7));
  setDim('d', num(r.numeric_mm4x6nan));
  setDim('e', num(r.numeric_mm4xd84m));
  if (Object.keys(dims).length) dfp5.dims = dims;
  // 指标级采集（首席官批准落地）：工期中位/样本数/准时率参考/合规托管覆盖。
  // 稀疏字段——仅有值才写键（多数 Rated 家部分缺，NR 家全无）。
  set('a2MedianMonths', num(r.numeric_mm4x5f1w));    // 工期中位（月）
  set('a2Samples', num(r.numeric_mm4ybdnx));         // 工期样本数
  set('a2bOntimeRefPct', num(r.numeric_mm4yx1y0));   // 准时率参考(%)
  set('d1EscrowPct', num(r.numeric_mm4xtm0x));       // 合规托管覆盖(%)
  return dfp5;
}

const developers = RAW.map((r) => {
  const out = {};
  const set = (k, v) => { if (v !== undefined) out[k] = v; };

  set('name', str(r.name));               // 键，须与 catalog developer 值对齐
  set('cn', str(r.text_mm4wsw1a));         // 中文名
  set('tier', str(r.color_mm4ww0wj));      // 梯队 S/A/B…
  set('ownership', str(r.color_mm4w3av0)); // 所有制
  set('founded', num(r.numbers));          // 成立年份
  set('employees', num(r.dup__of_year_founded_mkm7wng1)); // 员工数
  set('devNumber', str(r.text_mm4h7dqr));  // Developer Number 主号
  set('website', str(r.link));             // 官网
  set('country', str(r.country));          // 国家

  const dxb = buildDxb(r);
  if (dxb) out.dxb = dxb;                   // DXB 市场表现块

  const dfp5 = buildDfp5(r);
  if (dfp5) out.dfp5 = dfp5;                 // DFP-5 评级块（对客客观数据）

  set('trackRecord', str(r.long_text_mm4wfe9p)); // 履历（EN）
  set('blurbCn', str(r.long_text_mm4w8rt3));      // 简述（CN）
  set('onBoardStats', str(r.text_mm4w93ak));      // 在板项目统计

  return out;
});

writeFileSync(join(DATA, 'developers.json'), JSON.stringify(developers, null, 1));

// —— catalog developer 值对齐校验 ——
let catalog = [];
try {
  catalog = JSON.parse(readFileSync(join(DATA, 'catalog.json'), 'utf8'));
} catch { /* catalog 缺失时跳过对齐校验 */ }

// 归一映射表：catalog developer 值的已知变体 → developers.json 的 name 键。
// 当前 catalog 的 developer 值与板名逐字一致，此表为未来变体（如
// "DAMAC" vs "Damac"、"Wasl Properties" vs "wasl"）预留。
const NAME_ALIAS = {
  damac: 'Damac',
  'wasl': 'Wasl Properties',
  'wasl properties': 'Wasl Properties',
  deyaar: 'DEYAAR',
  leos: 'LEOS',
  octa: 'OCTA',
};
function normKey(s) {
  return String(s || '').toLowerCase().trim();
}
const devByKey = new Map();
for (const d of developers) {
  devByKey.set(normKey(d.name), d);
}
function resolveDev(devVal) {
  const k = normKey(devVal);
  if (!k) return null;
  if (devByKey.has(k)) return devByKey.get(k);
  const alias = NAME_ALIAS[k];
  if (alias && devByKey.has(normKey(alias))) return devByKey.get(normKey(alias));
  return null;
}

const catalogDevs = new Set(catalog.map((p) => p.developer).filter(Boolean));
const missing = [];
for (const dv of catalogDevs) {
  if (!resolveDev(dv)) missing.push(dv);
}

// —— 覆盖率统计 ——
const total = developers.length;
const hasDxb = developers.filter((d) => d.dxb).length;
const hasBlurb = developers.filter((d) => d.blurbCn).length;
const hasFounded = developers.filter((d) => d.founded !== undefined).length;
const hasTrack = developers.filter((d) => d.trackRecord).length;
const hasCn = developers.filter((d) => d.cn).length;
const hasTier = developers.filter((d) => d.tier).length;
const hasDfp5 = developers.filter((d) => d.dfp5).length;
const dfp5Rated = developers.filter((d) => d.dfp5 && d.dfp5.status === 'Rated').length;
const dfp5Nr = developers.filter((d) => d.dfp5 && d.dfp5.status === 'NR').length;

console.log('开发商维表总数:', total);
console.log(`覆盖率  DXB块:${hasDxb}  blurbCn:${hasBlurb}  founded:${hasFounded}  trackRecord:${hasTrack}  cn:${hasCn}  tier:${hasTier}`);
console.log(`DFP5 覆盖  带dfp5块:${hasDfp5}  Rated:${dfp5Rated}  NR:${dfp5Nr}`);
console.log(`catalog distinct developer 值(非空): ${catalogDevs.size}`);
if (missing.length) {
  console.log(`⚠️  catalog 出现但维表未命中(${missing.length}): ${JSON.stringify(missing)}`);
} else {
  console.log('✅ catalog 全部 developer 值均在维表命中');
}
