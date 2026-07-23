// ============================================================
// 项目目录（仅含「AI 可读」字段，可安全进入浏览器与 AI 上下文）
// ------------------------------------------------------------
// 数据来源：monday.com「Projects: Off-Plan」(board 3916277144)，
// 全量导出的 571 个期房项目（全开发商，2.0 版数据库）。
// 生成脚本见 scripts/build-catalog.mjs；原始只读抽取见 lib/data/raw-board.json，
// 本目录由其转换为 lib/data/catalog.json（emaar-catalog.json 保留为迁移源）。
//
// 价格护栏：本文件**只含开盘起价（startHint / priceAED）**——
// 开盘均价、单价(PSF)、Units Sold、去化率等「市场/实时」字段一律
// 不导出、不进入前端包、不进入任何发往 AI 的上下文（仅顾问可见）。
// ============================================================

// 全量目录：Monday「Projects: Off-Plan」板 571 个项目（全开发商）。
// 由 scripts/build-catalog.mjs 从 lib/data/raw-board.json 生成，
// emaar-catalog.json 作为 cn/tags/blurb 人工字段的迁移源（保留不删）。
import CATALOG from './data/catalog.json';
// 开发商维表：Monday「Companies: Developers」板 6350528756 导出的 65 家。
// 由 scripts/build-developers.mjs 从 lib/data/raw-developers.json 生成。
// 仅含 AI 可读列（品牌/官网/DXB 表现/履历/简述），
// 不含任何商务 CRM 或内部评级字段（见 guardrail-check.mjs 开发商护栏）。
import DEVELOPERS_RAW from './data/developers.json';
// 社区维表：Monday「Communities: All Dubai」板 18420441803 导出的 190 社区。
// 由 scripts/build-communities.mjs 从 lib/data/raw-communities.json 生成。
// 仅含 AI 可读身份/画像列（社区名/中英文/ID/归属/画像/配套/标签）+
// marketData 子块（户型级公开参考价，待 LEO 确认对客展示）。
// 🔒 市场统计列（成交量/中位PSF/去化率/收益率等）从源头即不导出
// （见 guardrail-check.mjs 社区护栏）。
import COMMUNITIES_RAW from './data/communities.json';
// 素材台账：scripts/sync-assets.mjs 产出（本地缓存优先 + Monday 对账）。
// 只含站内本地路径（/img/… 与 /brochures/…）；禁外链/Dropbox（见 guardrail-check.mjs 断言）。
// projects 段已用（卡图 + 详情图集 + 楼书）；communities/developers 段为接口预留
// （素材列未建，渲染逻辑 TODO）。
import ASSETS_MANIFEST from './data/assets-manifest.json';

export const EMIRATES = {
  dubai: ['e1', 'Dubai · 迪拜'],
  abudhabi: ['e2', 'Abu Dhabi · 阿布扎比'],
  sharjah: ['e3', 'Sharjah · 沙迦'],
  rak: ['e4', 'RAK · 哈伊马角'],
  uaq: ['e1', 'UAQ · 乌姆盖万'],
};

export const PROJECTS = CATALOG;

// 供 AI 上下文 / Dify inputs 注入的目录文本（仅 AI 可读字段）。
// 571 条用于 Dify 知识库；如直连通用 LLM，可截断或改走检索。
export function catalogText() {
  return PROJECTS.map((p) => {
    const e = EMIRATES[p.emirate] || ['', p.emirate];
    return `- ${p.name}｜${e[1]}｜片区 ${p.area}｜开发商 ${p.developer}｜类型 ${p.types}｜户型 ${p.unitInfo}｜交付 ${p.handover}｜起价示意 ${p.startHint}｜黄金签证 ${p.gv}｜标签 ${p.tags}`;
  }).join('\n');
}

const _byName = new Map(PROJECTS.map((p) => [p.name.toLowerCase().trim(), p]));
export function findProject(name) {
  return _byName.get(String(name || '').toLowerCase().trim()) || null;
}

// ============================================================
// 数据时间戳（单一真相）——全站起价/结果计数徽标复用此常量。
// ============================================================
export const CATALOG_UPDATED = '2026-07';
// 交付档计算基准日（与 CATALOG_UPDATED 对齐，避免各处 new Date() 漂移）。
const TODAY = new Date('2026-07-01T00:00:00Z');

// ============================================================
// 【首席官可翻案配置 · 两处】（设计规格 附录 B）
// ------------------------------------------------------------
// ① 子枫联动落点（附录 B-1）：'route' = 方案 A —— 卡片按钮跳首页
//    /#console?ask=<slug>，首页 AdvisorProvider 读参数预填并自动发问。
//    如改方案 B（页内浮动 Console），需另实现（本期未做）。
export const SUBFENG_LINK_MODE = 'route';
// 卡片级「让子枫分析这个项目」链接（query 在前、#console 片段在后，
// 首页 AdvisorProvider 读 location.search 的 ask，浏览器同时滚到对话区）。
export function askHref(p) {
  return `/?ask=${encodeURIComponent(projectSlug(p))}#console`;
}
// 页面级「描述需求让子枫筛」链接（不带具体项目，走标准画像匹配流）。
export const ADVISOR_HREF = '/?ask=advise#console';

// ② 默认列表范围（附录 B-2）：默认「在售 + 即将开盘 + 迪拜」；
//    售罄 / 非迪拜收进「更多筛选」开关（默认关）。翻案只改这两个布尔。
export const DEFAULT_SCOPE = {
  onlyDubai: true,       // true = 默认仅迪拜；false = 全酋长国
  includeSoldOut: true,  // 含售罄（全部项目展示，售罄仅标注状态）— LEO 2026-07
};
// 判定某项目是否落在「默认范围」内（列表页首屏口径）。
export function inDefaultScope(p) {
  if (DEFAULT_SCOPE.onlyDubai && p.emirate !== 'dubai') return false;
  if (!DEFAULT_SCOPE.includeSoldOut && /sold/i.test(p.status || '')) return false;
  return true;
}

// ============================================================
// 归一函数（筛选 / 排序 / SEO 共用，单一真相；设计规格 §2.3 / §3 / §7）
// ============================================================

// 物业类型归一：原始 types 是组合串 → 可勾选桶数组（一项可属多桶）。
export function normType(types) {
  const s = String(types || '');
  const out = [];
  if (/公寓|酒店公寓/.test(s)) out.push('公寓');
  if (/别墅/.test(s)) out.push('别墅');
  if (/联排/.test(s)) out.push('联排');
  if (/写字楼/.test(s)) out.push('写字楼');
  if (/酒店公寓/.test(s)) out.push('酒店公寓'); // 同时进公寓桶，作细分标签
  return out;
}

// 黄金签证分桶：fit=适配 / below=门槛以下 / pending=待核。
export function gvBucket(gv) {
  const g = String(gv || '');
  if (/适配/.test(g)) return 'fit';
  if (/以下|门槛以下/.test(g)) return 'below';
  return 'pending';
}

// 交付档分桶：near(≤1年) / mid(1–3年) / far(3年+) / delivered(已交付) / tbd(待定)。
export function handoverBucket(p) {
  const hd = p && p.handoverDate;
  if (!hd || /待定/.test((p && p.handover) || '')) return 'tbd';
  const d = new Date(hd);
  if (isNaN(d.getTime())) return 'tbd';
  const months = (d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
  if (months <= 0) return 'delivered';
  if (months <= 12) return 'near';
  if (months <= 36) return 'mid';
  return 'far';
}

// 起价档分桶：b1<200万 / b2 200–300 / b3 300–500 / b4 500–1000 / b5 1000–3000 / b6 3000万+ / null 无价。
export function priceBand(priceAED) {
  const n = Number(priceAED);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 2_000_000) return 'b1';
  if (n < 3_000_000) return 'b2';
  if (n < 5_000_000) return 'b3';
  if (n < 10_000_000) return 'b4';
  if (n < 30_000_000) return 'b5';
  return 'b6';
}

// ============================================================
// 精选排序引擎（设计规格 §3.1 featuredScore）
// ------------------------------------------------------------
// 在售的、评级高开发商的、热门社区的、快交付的、资料全的，排前面。
// 归一到 0–100（各因子 0–1 × 权重，权重和 = 100）。
// ============================================================
function featuredScore(p) {
  // 可售性 W=30
  const st = /available/i.test(p.status || '') ? 1
    : /coming/i.test(p.status || '') ? 0.6 : 0;
  // 开发商 DFP-5 背书 W=25（未评/旧版残留待重算 0.35 中性）
  const dev = getDeveloper(p.developer);
  const dv = dev && isCurrentDfp5(dev)
    ? Number(dev.dfp5.score) / 100 : 0.35;
  // 社区热度 W=15
  const c = getCommunity(p.area);
  const cm = !c ? 0.2 : c.isHot ? 1 : c.display ? 0.6 : 0.4;
  // 交付临近度 W=12
  const hb = handoverBucket(p);
  const hv = hb === 'near' ? 1 : hb === 'mid' ? 0.8 : hb === 'far' ? 0.5
    : hb === 'delivered' ? 0.3 : 0.2;
  // 资料完整度 W=10（封顶 1）
  let dt = 0;
  if (p.priceAED) dt += 0.4;
  if (p.unitInfo) dt += 0.2;
  if (p.landingUrl) dt += 0.2;
  if (p.blurb || p.tags) dt += 0.2;
  dt = Math.min(1, dt);
  // 黄金签证适配 W=8
  const gb = gvBucket(p.gv);
  const gv = gb === 'fit' ? 1 : gb === 'below' ? 0.3 : 0.5;
  return 30 * st + 25 * dv + 15 * cm + 12 * hv + 10 * dt + 8 * gv;
}

const _price = (p) => {
  const n = Number(p.priceAED);
  return Number.isFinite(n) && n > 0 ? n : null;
};
// 起价升序比较（无价沉底）。
const _byPriceAsc = (a, b) => {
  const x = _price(a), y = _price(b);
  if (x == null && y == null) return 0;
  if (x == null) return 1;
  if (y == null) return -1;
  return x - y;
};
// 交付排序键：未交付离今最近在前，已交付其后，待定沉底。
const _hdKey = (p) => {
  if (!p.handoverDate || /待定/.test(p.handover || '')) return null;
  const d = new Date(p.handoverDate).getTime();
  if (isNaN(d)) return null;
  return d >= TODAY.getTime() ? d : d + 4e15; // 已交付推到未交付之后
};

// 主排序：sort ∈ featured|handover|price-asc|price-desc。纯函数、无 API。
export function rankProjects(list, sort = 'featured') {
  const arr = Array.isArray(list) ? [...list] : [];
  if (sort === 'price-asc') return arr.sort(_byPriceAsc);
  if (sort === 'price-desc') return arr.sort((a, b) => {
    const x = _price(a), y = _price(b);
    if (x == null && y == null) return 0;
    if (x == null) return 1; // 无价沉底
    if (y == null) return -1;
    return y - x;
  });
  if (sort === 'handover') {
    return arr.sort((a, b) => {
      const x = _hdKey(a), y = _hdKey(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return x - y;
    });
  }
  // featured（默认）：featuredScore 降序，同分 priceAED 升序兜底。
  return arr.sort((a, b) => {
    const d = featuredScore(b) - featuredScore(a);
    if (Math.abs(d) > 1e-9) return d;
    return _byPriceAsc(a, b);
  });
}

// 相似项目（详情页 §6 ⑦）：同社区 > 同开发商 > 同价档，精选排序取 Top N。
export function similarProjects(p, limit = 4) {
  if (!p) return [];
  const band = priceBand(p.priceAED);
  const pool = PROJECTS.filter((q) => q.name !== p.name && (
    q.area === p.area || q.developer === p.developer || (band && priceBand(q.priceAED) === band)
  ));
  const score = (q) => (q.area === p.area ? 4 : 0)
    + (q.developer === p.developer ? 2 : 0)
    + (band && priceBand(q.priceAED) === band ? 1 : 0);
  const ranked = rankProjects(pool, 'featured');
  return ranked.map((q) => [q, score(q)]).sort((a, b) => b[1] - a[1]).slice(0, limit).map((x) => x[0]);
}

// ============================================================
// slug 与反查（设计规格 §7.1）
// ============================================================
export function slugify(name) {
  return String(name || '')
    .toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}
// 生成去重 slug 映射（重名极少，碰撞加序号后缀）。
const _bySlug = new Map();
for (const p of PROJECTS) {
  let s = slugify(p.name);
  if (_bySlug.has(s)) {
    let i = 2;
    while (_bySlug.has(`${s}-${i}`)) i++;
    s = `${s}-${i}`;
  }
  p.__slug = s;
  _bySlug.set(s, p);
}
export function projectSlug(p) { return (p && p.__slug) || slugify(p && p.name); }
export function findProjectBySlug(slug) {
  return _bySlug.get(String(slug || '').toLowerCase().trim()) || null;
}

// ============================================================
// 素材台账读取（assets-manifest.json）——卡图 / 详情图集 / 楼书。
// ------------------------------------------------------------
// getAssets(slug) → { heroImages:[本地路径…], cardImage, brochure? } | null。
// 无素材（管线未跑或该盘无图）→ null，前端自动回落无图态（现状不变）。
// 只返回站内本地路径；管线侧已保证不写外链/Dropbox（见 guardrail-check.mjs）。
// ============================================================
export const ASSETS_UPDATED = (ASSETS_MANIFEST && ASSETS_MANIFEST.generatedAt) || null;
export function getAssets(slug) {
  const key = String(slug || '').toLowerCase().trim();
  return (ASSETS_MANIFEST && ASSETS_MANIFEST.projects && ASSETS_MANIFEST.projects[key]) || null;
}
// 便捷：直接取详情图集（[{src,alt}]），无图 → []。alt 用项目名兜底。
export function getHeroImages(p) {
  const a = getAssets(projectSlug(p));
  if (!a || !Array.isArray(a.heroImages) || !a.heroImages.length) return [];
  const name = (p && p.name) || '';
  return a.heroImages.map((src, i) => ({ src, alt: `${name} 效果图 ${i + 1}` }));
}
// 社区/开发商素材（sync-assets.mjs 三类扩展，2026-07-11）——无素材恒返回 null，前端优雅回退。
export function getCommunityAssets(slug) {
  const key = String(slug || '').toLowerCase().trim();
  return (ASSETS_MANIFEST && ASSETS_MANIFEST.communities && ASSETS_MANIFEST.communities[key]) || null;
}
export function getDeveloperAssets(slug) {
  const key = String(slug || '').toLowerCase().trim();
  return (ASSETS_MANIFEST && ASSETS_MANIFEST.developers && ASSETS_MANIFEST.developers[key]) || null;
}
// 便捷：开发商 logo 本地路径（有则返回 /img/…，无则 null → 前端不显徽标位）。
export function getDeveloperLogo(d) {
  if (!d) return null;
  const a = getDeveloperAssets(developerSlug(d));
  return (a && a.logo) || null;
}
// 便捷：社区卡图（cardImage 优先，兜底首张 hero）；无图 → null。
export function getCommunityCardImage(c) {
  if (!c) return null;
  const a = getCommunityAssets(communitySlug(c));
  return (a && (a.cardImage || (Array.isArray(a.heroImages) && a.heroImages[0]))) || null;
}
// 便捷：社区详情图集（[{src,alt}]），无图 → []。alt 用社区名兜底。
export function getCommunityHeroImages(c) {
  if (!c) return [];
  const a = getCommunityAssets(communitySlug(c));
  if (!a || !Array.isArray(a.heroImages) || !a.heroImages.length) return [];
  const name = (c && c.name) || '';
  return a.heroImages.map((src, i) => ({ src, alt: `${name} 社区实景 ${i + 1}` }));
}

// 首页「精选期房」橱窗：统一走 rankProjects 引擎，按片区去重取 Top N。
// 口径 = 有起价 + 在售/即将（与列表默认范围一致，避免橱窗出现售罄）。
export function featuredProjects(limit = 8) {
  const scoped = PROJECTS.filter((p) => p.priceAED && /available|coming/i.test(p.status || ''));
  const ranked = rankProjects(scoped, 'featured');
  const seen = new Set();
  const out = [];
  for (const p of ranked) {
    if (seen.has(p.area)) continue;
    seen.add(p.area);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

export const PROJECT_COUNT = PROJECTS.length;

// ============================================================
// 开发商维表（65 家）——键 = name，与 catalog 的 developer 字段对齐。
// ============================================================
export const DEVELOPERS = DEVELOPERS_RAW;

// ============================================================
// DFP-5 版本判定（首席官裁决 2026-07-09：前端只认当前版本分数）。
// ------------------------------------------------------------
// developers.json 里极少数 status="Rated" 记录仍带旧模型 version
// （如 "DFP-5 v2.1 (run3c)"），尚未按当前模型重新打分——分数口径与
// 当前榜单不可比，绝不可混入排名/Top N（曾导致 Diamond 用旧分挤进
// v3.1 Top5）。这类记录也不是「数据不足」的真 NR，是「待重算」的
// 中性态，前端话术须用「评分更新中」区分（不显示旧分/旧叶，不标 NR）。
// 全站唯一取数口径：排名/榜单/Top N 一律用 isCurrentDfp5；
// 「Rated 但非当前版」用 isStaleDfp5 判定显示态。
// ============================================================
export const CURRENT_DFP5_VERSION = 'v3.1';

// 是否为当前版本的有效评分（接收 dfp5 子对象本身，MapleRating 等仅
// 拿到 dfp5 的调用点用这个）。
export function isCurrentDfp5Score(dfp5) {
  if (!dfp5 || dfp5.status !== 'Rated') return false;
  if (!Number.isFinite(Number(dfp5.score))) return false;
  return String(dfp5.version || '').includes(CURRENT_DFP5_VERSION);
}
// 是否为当前版本的有效 Rated 开发商（接收开发商维表条目 d，取 d.dfp5）。
// 全站排名/榜单/Top N 唯一口径。
export function isCurrentDfp5(d) {
  return isCurrentDfp5Score(d && d.dfp5);
}
// 是否为「旧版本残留」——status=Rated 且有分数，但 version 非当前版。
// 前端显示「评分更新中」（中性灰），区别于真正 NR 的「数据不足」。
export function isStaleDfp5(d) {
  const dfp5 = d && d.dfp5;
  if (!dfp5 || dfp5.status !== 'Rated') return false;
  if (!Number.isFinite(Number(dfp5.score))) return false;
  return !String(dfp5.version || '').includes(CURRENT_DFP5_VERSION);
}

// 归一映射表：catalog developer 值的已知变体 → 维表 name 键。
// 当前 catalog 的 developer 值与板名逐字一致，此表为未来变体预留
// （如 "DAMAC" vs "Damac"、"Wasl Properties" vs "wasl"）。
const DEV_ALIAS = {
  damac: 'Damac',
  'wasl': 'Wasl Properties',
  'wasl properties': 'Wasl Properties',
  deyaar: 'DEYAAR',
  leos: 'LEOS',
  octa: 'OCTA',
};
const _devByKey = new Map(
  DEVELOPERS.map((d) => [String(d.name || '').toLowerCase().trim(), d])
);

// 按开发商名取维表条目（含归一/别名映射），未命中返回 null。
export function getDeveloper(name) {
  const k = String(name || '').toLowerCase().trim();
  if (!k) return null;
  if (_devByKey.has(k)) return _devByKey.get(k);
  const alias = DEV_ALIAS[k];
  if (alias) {
    const ak = String(alias).toLowerCase().trim();
    if (_devByKey.has(ak)) return _devByKey.get(ak);
  }
  return null;
}

export const DEVELOPER_COUNT = DEVELOPERS.length;

// 首页「开发商」榜单：按 DFP-5 综合分降序取前 N（仅当前版 Rated）。
export function topDevelopers(limit = 8) {
  return DEVELOPERS
    .filter(isCurrentDfp5)
    .sort((a, b) => Number(b.dfp5.score) - Number(a.dfp5.score))
    .slice(0, limit);
}
// 已评级家数（前端唯一口径 = 当前版本；旧版残留不计入，见 isCurrentDfp5 头注）。
export const RATED_DEVELOPER_COUNT = DEVELOPERS.filter(isCurrentDfp5).length;

// ============================================================
// 开发商 slug 与反查（/developers/<slug> · 设计规格 §2 / §6）
// slug = slugify(name)，与项目 slug 同一算法；碰撞加序号后缀。
// ============================================================
const _devBySlug = new Map();
for (const d of DEVELOPERS) {
  let s = slugify(d.name);
  if (_devBySlug.has(s)) {
    let i = 2;
    while (_devBySlug.has(`${s}-${i}`)) i++;
    s = `${s}-${i}`;
  }
  d.__slug = s;
  _devBySlug.set(s, d);
}
export function developerSlug(d) { return (d && d.__slug) || slugify(d && d.name); }
export function findDeveloperBySlug(slug) {
  return _devBySlug.get(String(slug || '').toLowerCase().trim()) || null;
}

// 开发商级「让子枫分析」链接（区别于项目级 askHref）：
// /?ask=dev:<slug>#console → 首页 AdvisorProvider 读 dev: 前缀预填开发商问题。
export function askDeveloperHref(d) {
  return `/?ask=dev:${encodeURIComponent(developerSlug(d))}#console`;
}

// 聚合某开发商在 catalog 中的在售项目（经 getDeveloper 归一，名对齐维表）。
export function projectsByDeveloper(dev) {
  if (!dev || !dev.name) return [];
  return PROJECTS.filter((p) => {
    const d = getDeveloper(p.developer);
    return d && d.name === dev.name;
  });
}

// 该开发商项目聚合出的活跃社区（distinct area，带社区维表命中）。
export function activeCommunitiesByDeveloper(dev) {
  const seen = new Map();
  for (const p of projectsByDeveloper(dev)) {
    const area = p.area;
    if (!area || seen.has(area)) continue;
    seen.set(area, { area, community: getCommunity(area) });
  }
  return [...seen.values()];
}

// 评级榜：仅当前版本 Rated，按 DFP-5 综合分降序（列表页默认视图 · §1.2）。
export function ratedDevelopers() {
  return DEVELOPERS
    .filter(isCurrentDfp5)
    .sort((a, b) => Number(b.dfp5.score) - Number(a.dfp5.score));
}

// ============================================================
// 社区维表（190 社区）——键 = name，与 catalog 的 area 字段对齐。
// 别名映射与 getCommunity 逻辑须与 build-communities.mjs 保持一致。
// ============================================================
export const COMMUNITIES = COMMUNITIES_RAW;

function _normComm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// 手工别名（catalog area 变体 → 社区 name），与 build-communities.mjs 同步。
const COMM_ALIAS = {
  dubaiharbor: 'Dubai Harbour',
  palmjumeriah: 'Palm Jumeirah',
  dubaidowntown: 'Downtown Dubai',
  dmc: 'Dubai Maritime City',
  bluewaters: 'Bluewaters Island',
  dip: 'Dubai Investment Park First',
  tradecenter: 'Trade Center First',
  tradecentre: 'Trade Center First',
  ummsuqeim: 'Um Suqaim Third',
  jbr: 'Jumeirah Beach Residence',
  jvt: 'Jumeirah Village Triangle',
  zabeel: "Za'abeel 1",
  zabeel1: "Za'abeel 1",       // catalog area "Zabeel 1"（norm=zabeel1）
  zaabeelsecond: "Za'abeel 2",
  mbrcity: 'Hadaeq Sheikh Mohammed Bin Rashid',
  districtone: 'Hadaeq Sheikh Mohammed Bin Rashid',
  expoliving: 'Expo City',
};

// —— 关键修复（设计规格 §7.3）：多键索引的「优先级去碰撞」——
// 问题：同一社区在板上常有两条记录 —— 一条对客营销版（display/isHot/画像/
//   参考价齐全，如「Damac Hills」DXBC-0048），一条纯 DLD 行政壳（如
//   「Al Hebiah Third」DXBC-0014，display=false）。两条都把 "Damac Hills"
//   登记为别名；旧逻辑「首个登记者胜」按数组序让 DLD 壳抢到了 key，导致
//   项目 area="Damac Hills" 全归到 display=false 的壳里，营销版反查 0 项目
//   ——即精选卡上的「假无项目」（Emaar Beachfront / Sobha Hartland /
//   Town Square / Damac Hills 等）。
// 修法：① 第一轮先登记所有社区的「规范名 name/enName」（身份键，唯一，
//   营销版凭自己的 name 抢下同名 key）；② 第二轮再登记各平台名/别名，
//   且按「营销富集度」降序，让 display/isHot/带价/带画像的条目优先认领
//   共享别名 key。此改动与 build-communities.mjs 的 register 逻辑同步。
const _commByKey = new Map();
const _commRich = (c) =>
  (c.display ? 8 : 0) + (c.isHot ? 4 : 0) + (c.marketData ? 2 : 0)
  + (c.profile && c.profile.blurbCn ? 1 : 0);
(function () {
  const reg = (key, c) => {
    const k = _normComm(key);
    if (k && !_commByKey.has(k)) _commByKey.set(k, c);
  };
  // 第一轮：规范身份名（name / enName）——每社区凭自身身份键优先占位。
  for (const c of COMMUNITIES) {
    reg(c.name, c);
    if (c.enName) reg(c.enName, c);
  }
  // 第二轮：平台名 + 别名，按营销富集度降序，共享 key 归营销版。
  for (const c of [...COMMUNITIES].sort((a, b) => _commRich(b) - _commRich(a))) {
    if (c.names) {
      reg(c.names.bayut, c);
      reg(c.names.pf, c);
      reg(c.names.dxb, c);
      for (const a of c.names.alias || []) reg(a, c);
    }
  }
})();

// communityId → 社区 直接索引（?commId= 过滤 / 反查用）。
const _commById = new Map(COMMUNITIES.map((c) => [c.communityId, c]));
export function getCommunityById(cid) {
  return _commById.get(String(cid || '').trim()) || null;
}

// 按社区名/片区名取维表条目（含归一/别名映射），未命中返回 null。
export function getCommunity(name) {
  const k = _normComm(name);
  if (!k) return null;
  if (_commByKey.has(k)) return _commByKey.get(k);
  const alias = COMM_ALIAS[k];
  if (alias) {
    const ak = _normComm(alias);
    if (_commByKey.has(ak)) return _commByKey.get(ak);
  }
  return null;
}

export const COMMUNITY_COUNT = COMMUNITIES.length;

// 首页「热门社区」橱窗：isHot 优先，其次 display，取前 N（须有画像）。
export function hotCommunities(limit = 6) {
  const withProfile = COMMUNITIES.filter((c) => c.profile && c.profile.blurbCn);
  const hot = withProfile.filter((c) => c.isHot);
  const disp = withProfile.filter((c) => !c.isHot && c.display);
  return [...hot, ...disp].slice(0, limit);
}

// ============================================================
// 社区页 helper 收官（设计规格 §7.5）——全部收敛进本文件，前端不造轮子。
// 时间戳复用 CATALOG_UPDATED 单一真相。
// ============================================================
export const COMMUNITY_UPDATED = CATALOG_UPDATED;

// 精选集（display 勾选）——列表默认视图（附录 B-1 = 精选 120）。
export function displayCommunities() {
  return COMMUNITIES.filter((c) => c.display);
}
export const DISPLAY_COMMUNITY_COUNT = COMMUNITIES.filter((c) => c.display).length;
export const COMMUNITY_WITH_MARKET_COUNT = COMMUNITIES.filter((c) => c.marketData).length;

// location 首行（最贴近的交通/距离要点）——卡片精选展示，全站共用。
export function firstLine(s) {
  if (!s) return '';
  return String(s).split('\n').map((x) => x.replace(/^[•\-\s]+/, '').trim()).filter(Boolean)[0] || '';
}

// blurbCn 首句截断（讲人话的一句话画像，卡片用；~46 字上限）。
export function blurbShort(s, max = 46) {
  if (!s) return '';
  const first = String(s).split(/[。！？\n]/).map((x) => x.trim()).filter(Boolean)[0] || '';
  return first.length > max ? first.slice(0, max) + '…' : first;
}

// 社区起价参考（min salePrice，护栏 §2.2）——无价返回 null（整行不显）。
export function communityMinPrice(c) {
  if (!c || !c.marketData || !Array.isArray(c.marketData.unitPrices)) return null;
  const ps = c.marketData.unitPrices.map((u) => u.salePrice).filter((n) => Number.isFinite(n) && n > 0);
  return ps.length ? Math.min(...ps) : null;
}

// ROI 参考区间的 robust 聚合（设计规格 §2.3，防误导）：
// 剔除「仅 rent 无 salePrice」的行（studio 常态、roi 虚高），对剩余 roi 取
// P25–P75 区间（样本 <4 取 min–max），四舍五入到整数百分点。无 ROI → null。
export function communityRoiRange(c) {
  if (!c || !c.marketData || !Array.isArray(c.marketData.unitPrices)) return null;
  const rois = c.marketData.unitPrices
    .filter((u) => Number.isFinite(u.salePrice) && u.salePrice > 0 && Number.isFinite(u.roi) && u.roi > 0)
    .map((u) => u.roi)
    .sort((a, b) => a - b);
  if (!rois.length) return null;
  let lo, hi;
  if (rois.length < 4) {
    lo = rois[0]; hi = rois[rois.length - 1];
  } else {
    const q = (p) => {
      const idx = (rois.length - 1) * p;
      const b = Math.floor(idx);
      const r = idx - b;
      return rois[b + 1] !== undefined ? rois[b] + (rois[b + 1] - rois[b]) * r : rois[b];
    };
    lo = q(0.25); hi = q(0.75);
  }
  return { lo: Math.round(lo), hi: Math.round(hi) };
}

// ————————————————————————————————————————————————
// 社区 → 项目 反查（设计规格 §7.3）：以 communityId 为锚，天然合并多 area
// 变体（DAMAC Hills / Sobha Hartland II 等）。getCommunity 归一后 communityId
// 相等即归入某社区。索引一次构建，projectsByCommunity / projectsByCommunityId
// 与 ProjectsClient 的 ?commId= 过滤同源。
// ————————————————————————————————————————————————
const _projByCid = new Map();
for (const p of PROJECTS) {
  const c = getCommunity(p.area);
  if (!c) continue;
  if (!_projByCid.has(c.communityId)) _projByCid.set(c.communityId, []);
  _projByCid.get(c.communityId).push(p);
}
export function projectsByCommunityId(cid) {
  return _projByCid.get(String(cid || '').trim()) || [];
}
export function projectsByCommunity(c) {
  return c ? (_projByCid.get(c.communityId) || []) : [];
}

// 该社区在售项目聚合出的活跃开发商（distinct developer，getDeveloper 归一 +
// DFP-5），按项目数降序。设计规格 §6.2 ⑤ / §7.3。
export function activeDevelopersByCommunity(c) {
  const seen = new Map();
  for (const p of projectsByCommunity(c)) {
    const d = getDeveloper(p.developer);
    const key = d ? d.name : p.developer;
    if (!key) continue;
    if (!seen.has(key)) seen.set(key, { name: key, developer: d, count: 0 });
    seen.get(key).count += 1;
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

// 相似社区（详情页 §6.2 ⑥）：同 tags 重合 + 同价档 + 同 ROI 档，偏好精选/热门。
export function similarCommunities(c, limit = 4) {
  if (!c) return [];
  const tags = new Set((c.profile && c.profile.tags) || []);
  const price = communityMinPrice(c);
  const pb = price ? priceBand(price) : null;
  const roi = communityRoiRange(c);
  const roiMid = roi ? (roi.lo + roi.hi) / 2 : null;
  const pool = COMMUNITIES.filter((x) => x.communityId !== c.communityId && x.profile && x.profile.blurbCn);
  const score = (x) => {
    let s = 0;
    for (const t of (x.profile && x.profile.tags) || []) if (tags.has(t)) s += 2;
    const xp = communityMinPrice(x);
    if (pb && xp && priceBand(xp) === pb) s += 2;
    const xr = communityRoiRange(x);
    if (roiMid != null && xr && Math.abs((xr.lo + xr.hi) / 2 - roiMid) <= 1.5) s += 2;
    if (x.display) s += 1;
    if (x.isHot) s += 0.5;
    return s;
  };
  return pool.map((x) => [x, score(x)]).filter((a) => a[1] > 0)
    .sort((a, b) => b[1] - a[1]).slice(0, limit).map((a) => a[0]);
}

// 社区精选排序引擎（设计规格 §3.3，抽为 rankCommunities）。
// sort ∈ featured | roi-desc | proj-desc | price-asc。纯函数、无 API。
function _commFeatured(c) {
  return (c.isHot ? 1000 : 0) + (c.display ? 500 : 0)
    + (c.profile && c.profile.blurbCn ? 100 : 0) + (c.marketData ? 50 : 0)
    + projectsByCommunity(c).length;
}
export function rankCommunities(list, sort = 'featured') {
  const arr = Array.isArray(list) ? [...list] : [];
  if (sort === 'proj-desc') {
    return arr.sort((a, b) => projectsByCommunity(b).length - projectsByCommunity(a).length);
  }
  if (sort === 'price-asc') {
    return arr.sort((a, b) => {
      const x = communityMinPrice(a), y = communityMinPrice(b);
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return x - y;
    });
  }
  if (sort === 'roi-desc') {
    return arr.sort((a, b) => {
      const x = communityRoiRange(a), y = communityRoiRange(b);
      const xh = x ? x.hi : null, yh = y ? y.hi : null;
      if (xh == null && yh == null) return 0;
      if (xh == null) return 1;
      if (yh == null) return -1;
      return yh - xh;
    });
  }
  return arr.sort((a, b) => _commFeatured(b) - _commFeatured(a));
}

// ————————————————————————————————————————————————
// 社区 slug 与反查（设计规格 §6.1）。
// ⚠️ 实测偏离：设计规格设想「直接复用 area.slug（社区自带）」，但实测
//   area.slug 实为 **DLD 行政片区 slug**，被多社区共享（如 Dubai Hills
//   Estate 与 Hadaeq SMBR 同为 hadaeq-...；Emaar Beachfront 落到 marsa-dubai），
//   直接用会让营销社区拿到「行政壳」或 -N 后缀的脏 slug。故改用
//   **slugify(c.name)** 作主键（实测 201 家零碰撞、语义干净：dubai-hills-estate /
//   emaar-beachfront / damac-hills），area.slug 仅在极端空名时兜底；碰撞加序号。
// ————————————————————————————————————————————————
const _commBySlug = new Map();
for (const c of COMMUNITIES) {
  let s = slugify(c.name) || (c.area && c.area.slug ? String(c.area.slug).toLowerCase().trim() : 'community');
  if (_commBySlug.has(s)) {
    let i = 2;
    while (_commBySlug.has(`${s}-${i}`)) i++;
    s = `${s}-${i}`;
  }
  c.__slug = s;
  _commBySlug.set(s, c);
}
export function communitySlug(c) { return (c && c.__slug) || slugify(c && c.name); }
export function findCommunityBySlug(slug) {
  return _commBySlug.get(String(slug || '').toLowerCase().trim()) || null;
}

// 社区级「让子枫分析这个片区」链接（§5.1 / §7.4，comm: 前缀）。
export function askCommunityHref(c) {
  return `/?ask=comm:${encodeURIComponent(communitySlug(c))}#console`;
}
// 页面级「说需求让子枫推片区」（§5.2）。
export const ADVISOR_COMM_HREF = '/?ask=advise-comm#console';

// ============================================================
// 列表页搜索（客户端全文，纯前端 · /projects /developers /communities 共用）
// ------------------------------------------------------------
// 规则：大小写不敏感、去空格（含中英文间空格），substring 匹配（不做拼音）。
// 中英双语——各页字段清单见下方 matchXxxQuery。
// ============================================================
function _normQ(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '');
}
// 通用：fields 可含字符串或字符串数组（数组会展开逐项匹配，如社区别名）。
export function matchQuery(fields, q) {
  const nq = _normQ(q);
  if (!nq) return true;
  for (const f of fields) {
    if (Array.isArray(f)) { if (f.some((x) => _normQ(x).includes(nq))) return true; }
    else if (_normQ(f).includes(nq)) return true;
  }
  return false;
}
// 项目页：项目名 / 中文名 / 社区(area) / 开发商。
export function matchProjectQuery(p, q) {
  return matchQuery([p.name, p.cn, p.area, p.developer], q);
}
// 开发商页：开发商名 / 中文名。
export function matchDeveloperQuery(d, q) {
  return matchQuery([d.name, d.cn], q);
}
// 社区页：社区名 / 中文名 / 别名 / 各平台名(Bayut·PF·DXB)。
export function matchCommunityQuery(c, q) {
  const n = c.names || {};
  return matchQuery([c.name, c.cn, n.alias, n.bayut, n.pf, n.dxb], q);
}
