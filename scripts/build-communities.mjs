// ============================================================
// build-communities.mjs — 社区维表构建（190 社区，全板全量）
// ------------------------------------------------------------
// 输入：lib/data/raw-communities.json（Monday「Communities: All Dubai」
//        板 18420441803 全量只读导出，仅含 AI 可读列 + 子项户型价，
//        全板分页拉取。🔒 市场统计列从源头就不在 raw 里）。
// 输出：lib/data/communities.json（schema 与 developers.json 风格一致，
//        中文注释；空值省略键）。
//
// 键 = name，用于与 catalog.json 的 area / community 名对齐（见 lib/catalog.js
//   的 getCommunity 别名映射）。
//
// 🔴 护栏（板设计原则「AI-readable identity」vs「🔒 market」分区）：
//    绝不导出 🔒 列——Thin Market / Transactions(12M) / Transactions YoY /
//    Median PSF / Median PSF YoY / Upcoming Supply / Gross Yield /
//    Gross Yield YoY，以及 Sold %(Absorption Rate)（未打🔒但属市场统计，
//    与项目护栏「去化率」同类，一律不导）。这些禁列从源头即不在
//    raw-communities.json 中，脚本只消费白名单身份/画像列。
//
// 🟡 marketData 子块（待 LEO 确认对客展示）：
//    子项板 18420489632 的户型级参考价（Avg Sale / Avg Rent / ROI%，
//    来自 Bayut/PF 公开市场行情）作为 marketData.unitPrices 导出，
//    并打 marketData 标记。护栏对该子块暂放行（社区级公开行情 vs
//    项目级敏感底价，边界由 LEO 定夺）。
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'lib', 'data');

const RAW = JSON.parse(readFileSync(join(DATA, 'raw-communities.json'), 'utf8'));

// —— Monday 列 id → 语义（仅白名单 AI 可读身份/画像列）——
//   text_mm4x9xtk        Community ID（DXBC-####）
//   text_mm4xv30y        Community Name（英文规范名）
//   text_mm4x4fk2        CN Community Name（中文名）
//   long_text_mm4x1eas   Blurb CN（中文简述/画像）
//   text_mm4x2a40        Bayut Community Name
//   text_mm4x5hbp        PF Community Name
//   long_text_mm4y50za   Alias Community Name（别名/子社区，换行分隔）
//   text_mm4yh6e7        DXB Community Name（DXB/DLD join key）
//   dropdown_mm4xjxv     Name Matched（PF/Bayut/None）
//   text_mm4xwm7m        DLD Area（DLD 归属片区）
//   text_mm4x1g6w        Sub Area
//   text_mm4xmst9        Master Project（母盘）
//   text_mm4xyzsm        Slug
//   color_mm4x70qa       Classification（master_project / dld_area）
//   color_mm4xt7xz       Is Hot（Y/N，热度标记，非市场统计）
//   dropdown_mm4x2szx    Community Tags（Luxury/Waterfront…）
//   long_text_mm4xr0a2   Location & Distance（区位/通勤）
//   long_text_mm4xh57d   Amenities（配套）
//   long_text_mm4x3xv2   Lifestyle（生活方式/适合人群）
//   boolean_mm4ygnxz     Display（是否前端展示，"v"=勾选）
//
//   —— 子项（marketData.unitPrices，户型级参考价）——
//   color_mm4x1cav       Property Type（Apartment/Villa/Townhouse）
//   numeric_mm4xy7nf     Average Sales Price (AED)
//   numeric_mm4xyk5j     Average Rental Price (AED)
//   numeric_mm4xy3v5     Gross Yield / ROI %

// —— 空值归一：空串 / null / undefined → undefined（省略键）——
// 注意：部分 long_text 列以对象形式 {text: "..."|null} 导出，须解包，
//   否则 String(obj) 会误产出 "[object Object]"。
function str(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    v = 'text' in v ? v.text : '';
  }
  const s = v == null ? '' : String(v).trim();
  return s || undefined;
}
function num(v) {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}
// 逗号分隔的 dropdown → 去空去重数组（空则 undefined）
function tags(v) {
  const s = str(v);
  if (!s) return undefined;
  const arr = [...new Set(s.split(',').map((x) => x.trim()).filter(Boolean))];
  return arr.length ? arr : undefined;
}
// "v"（勾选）→ true；其余 → undefined（未勾选省略键）
function bool(v) {
  return str(v) ? true : undefined;
}

// —— marketData 子块：户型级参考价（待 LEO 确认对客展示）——
// 每个子项 = 一个户型行；至少一个价格/ROI 字段非空才收。
function buildMarketData(subitems) {
  if (!Array.isArray(subitems) || !subitems.length) return undefined;
  const unitPrices = [];
  for (const s of subitems) {
    const row = {};
    const set = (k, v) => { if (v !== undefined) row[k] = v; };
    set('type', str(s.name));                       // 户型（Studio/1 Bed/…）
    set('propertyType', str(s.color_mm4x1cav));     // Apartment/Villa/Townhouse
    set('salePrice', num(s.numeric_mm4xy7nf));      // Avg Sales Price (AED)
    set('rent', num(s.numeric_mm4xyk5j));           // Avg Rental Price (AED)
    set('roi', num(s.numeric_mm4xy3v5));            // Gross Yield / ROI %
    // 仅有户型名而无任何价格/ROI → 空壳行，跳过
    if (row.salePrice === undefined && row.rent === undefined && row.roi === undefined) continue;
    if (Object.keys(row).length) unitPrices.push(row);
  }
  if (!unitPrices.length) return undefined;
  // marketData 标记：整块打 source 与 note，供前端/护栏识别为市场参考子块
  return {
    source: 'Bayut/PF (public market reference)',
    note: 'Community-level unit reference prices; pending LEO client-display sign-off',
    unitPrices,
  };
}

const communities = RAW.map((r) => {
  const out = {};
  const set = (k, v) => { if (v !== undefined) out[k] = v; };

  set('name', str(r.name));                    // 键，须与 catalog area/community 对齐
  set('communityId', str(r.text_mm4x9xtk));    // DXBC-####
  set('cn', str(r.text_mm4x4fk2));             // 中文名
  set('enName', str(r.text_mm4xv30y));         // 英文规范名（若与 name 不同）
  set('classification', str(r.color_mm4x70qa));// master_project / dld_area
  set('isHot', str(r.color_mm4xt7xz) === 'Y' ? true : undefined); // 热门标记

  // —— 归属 / 区位块 ——
  const area = {};
  const setArea = (k, v) => { if (v !== undefined) area[k] = v; };
  setArea('dldArea', str(r.text_mm4xwm7m));    // DLD 归属片区
  setArea('subArea', str(r.text_mm4x1g6w));    // 子片区
  setArea('masterProject', str(r.text_mm4xmst9)); // 母盘
  setArea('slug', str(r.text_mm4xyzsm));       // slug
  if (Object.keys(area).length) out.area = area;

  // —— 画像块（对客可读文本 + 标签）——
  const profile = {};
  const setP = (k, v) => { if (v !== undefined) profile[k] = v; };
  setP('blurbCn', str(r.long_text_mm4x1eas));  // 中文简述/画像
  setP('tags', tags(r.dropdown_mm4x2szx));     // 社区标签
  setP('location', str(r.long_text_mm4xr0a2)); // 区位/通勤
  setP('amenities', str(r.long_text_mm4xh57d));// 配套
  setP('lifestyle', str(r.long_text_mm4x3xv2));// 生活方式/适合人群
  if (Object.keys(profile).length) out.profile = profile;

  // —— 名称匹配辅助块（别名/多平台名，供对齐用）——
  const names = {};
  const setN = (k, v) => { if (v !== undefined) names[k] = v; };
  setN('bayut', str(r.text_mm4x2a40));
  setN('pf', str(r.text_mm4x5hbp));
  setN('dxb', str(r.text_mm4yh6e7));
  setN('matched', tags(r.dropdown_mm4xjxv));
  // 别名：换行分隔 → 去「• 」前缀 → 数组
  {
    const raw = str(r.long_text_mm4y50za);
    if (raw) {
      const aliases = raw
        .split(/\r?\n/)
        .map((x) => x.replace(/^[•\-\s]+/, '').trim())
        .filter(Boolean);
      if (aliases.length) names.alias = aliases;
    }
  }
  if (Object.keys(names).length) out.names = names;

  // —— Display 前端展示旗标 ——
  set('display', bool(r.boolean_mm4ygnxz));

  // —— marketData 子块（待 LEO 确认对客展示）——
  const md = buildMarketData(r.subitems);
  if (md) out.marketData = md;

  return out;
});

writeFileSync(join(DATA, 'communities.json'), JSON.stringify(communities, null, 1));

// ============================================================
// 名称对齐校验：catalog 的 area（片区名，实为项目所在社区名）
// vs communities.json 的 name 键 —— 归一映射 + 未命中清单。
// ============================================================
let catalog = [];
try {
  catalog = JSON.parse(readFileSync(join(DATA, 'catalog.json'), 'utf8'));
} catch { /* catalog 缺失时跳过 */ }

function normKey(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// 主索引：name + 各平台名 + 别名 全部登记为同一社区的可命中键。
// —— 与 lib/catalog.js getCommunity 同步的「优先级去碰撞」（§7.3）——
//    第一轮先登记规范身份名（唯一），第二轮按营销富集度降序登记平台名/
//    别名，让 display/isHot/带价/带画像的营销版认领共享别名 key，避免纯
//    DLD 行政壳按数组序抢走 Damac Hills / Emaar Beachfront 等 key。
const byKey = new Map();
function register(key, c) {
  const k = normKey(key);
  if (k && !byKey.has(k)) byKey.set(k, c);
}
const richness = (c) =>
  (c.display ? 8 : 0) + (c.isHot ? 4 : 0) + (c.marketData ? 2 : 0)
  + (c.profile && c.profile.blurbCn ? 1 : 0);
for (const c of communities) {
  register(c.name, c);
  if (c.enName) register(c.enName, c);
}
for (const c of [...communities].sort((a, b) => richness(b) - richness(a))) {
  if (c.names) {
    register(c.names.bayut, c);
    register(c.names.pf, c);
    register(c.names.dxb, c);
    for (const a of c.names.alias || []) register(a, c);
  }
}

// 已知手工别名（catalog area 拼写变体 → 社区 name，仅收有把握的迪拜社区）。
// 说明：catalog 的 area 多为「项目所在微片区/母盘名」，DXB 板则用
//   DLD/DXB 规范社区名，二者语义并非一一对应；只有确属同一迪拜社区
//   的拼写/口径变体才在此登记，含糊或非迪拜（阿布扎比/RAK/沙迦/UAQ）
//   一律不硬配，如实进未命中清单。
const COMM_ALIAS = {
  // —— 拼写/口径变体（同一迪拜社区）——
  'dubaiharbor': 'Dubai Harbour',
  'palmjumeriah': 'Palm Jumeirah',
  'dubaidowntown': 'Downtown Dubai',
  'dmc': 'Dubai Maritime City',
  'bluewaters': 'Bluewaters Island',
  'dip': 'Dubai Investment Park First',
  'tradecenter': 'Trade Center First',
  'tradecentre': 'Trade Center First',
  'ummsuqeim': 'Um Suqaim Third',      // DLD 拼作 Um Suqaim
  'jbr': 'Jumeirah Beach Residence',
  'jvt': 'Jumeirah Village Triangle',
  'zabeel': "Za'abeel 1",
  'zabeel1': "Za'abeel 1",             // catalog area "Zabeel 1"（norm=zabeel1）
  'zaabeelsecond': "Za'abeel 2",
  'mbrcity': 'Hadaeq Sheikh Mohammed Bin Rashid', // MBR City 的 DLD 名
  'districtone': 'Hadaeq Sheikh Mohammed Bin Rashid', // District One 属 MBR City
  'expoliving': 'Expo City',
  // Jumeirah Islands / jumeriah island 板上无对应规范社区，不硬配。
};

function resolve(areaVal) {
  const k = normKey(areaVal);
  if (!k) return null;
  if (byKey.has(k)) return byKey.get(k);
  const alias = COMM_ALIAS[k];
  if (alias && byKey.has(normKey(alias))) return byKey.get(normKey(alias));
  return null;
}

// catalog 的社区名来自 area 字段（项目所在片区/社区）
const catalogAreas = new Set(catalog.map((p) => p.area).filter(Boolean));
const matched = [];
const missing = [];
for (const a of catalogAreas) {
  if (resolve(a)) matched.push(a);
  else missing.push(a);
}

// —— 覆盖率统计 ——
const total = communities.length;
const hasCn = communities.filter((c) => c.cn).length;
const hasBlurb = communities.filter((c) => c.profile && c.profile.blurbCn).length;
const hasTags = communities.filter((c) => c.profile && c.profile.tags).length;
const hasLoc = communities.filter((c) => c.profile && c.profile.location).length;
const hasAmen = communities.filter((c) => c.profile && c.profile.amenities).length;
const hasLife = communities.filter((c) => c.profile && c.profile.lifestyle).length;
const hasMd = communities.filter((c) => c.marketData).length;
const hasDisplay = communities.filter((c) => c.display).length;
const unitRows = communities.reduce((n, c) => n + (c.marketData ? c.marketData.unitPrices.length : 0), 0);

console.log('社区维表总数:', total);
console.log(`身份覆盖  cn:${hasCn}  communityId:${communities.filter((c)=>c.communityId).length}  display勾选:${hasDisplay}`);
console.log(`画像覆盖  blurbCn:${hasBlurb}  tags:${hasTags}  location:${hasLoc}  amenities:${hasAmen}  lifestyle:${hasLife}`);
console.log(`marketData 覆盖  带子块:${hasMd}  户型价行合计:${unitRows}`);
console.log(`\ncatalog distinct area(非空): ${catalogAreas.size}  命中: ${matched.length}  未命中: ${missing.length}`);
if (missing.length) {
  console.log(`命中率: ${((matched.length / catalogAreas.size) * 100).toFixed(1)}%`);
  console.log(`⚠️  未命中清单(${missing.length}): ${JSON.stringify(missing.sort())}`);
} else {
  console.log('✅ catalog 全部 area 值均在社区维表命中');
}
