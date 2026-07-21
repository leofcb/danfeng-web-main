// ============================================================
// projectPageData.js — v5 项目落地页「数据装配器」（LEO 十段框架 · 2026-07-11 重排）
// ------------------------------------------------------------
// 按 LEO 定稿十段（编号即渲染顺序）逐段组装，数据源：
//   catalog(p) + content/projects/<slug>.json(rich) + developers.json +
//   communities.json + assets-manifest.json。产出纯数据对象，交 ProjectLandingV5
//   渲染（组件不做取数/降级判断，全部在此收敛，单一真相）。
//
// 十段落位：
//   1 首屏展示 hero ｜ 2 项目概况 facts+overview ｜ 3 核心亮点 highlights ｜
//   4 地段位置 location ｜ 5 产品细节 productDetails(弹性) ｜ 6 公共配套 amenities ｜
//   7 户型价格 unit(floors) ｜ 8 社区生活 community(片区卡+参考价带+互链) ｜
//   9 开发商简介 developer(DFP-5 带+互链) ｜ 10 CTA。
//
// 护栏铁律（见解剖 §4 + guardrail-check.mjs + v5-guardrail.mjs）：
//   · 全页唯一「项目」价格 = 开盘起价文本（护栏口径）；无现价/PSF/去化/已售/剩余。
//   · 社区参考价带走 communities.json marketData（LEO 已授权对外），强制带
//     「公开行情参考 · 非实时报价」badge + 来源 + 护栏句，且非项目级报价。
//   · 售态严格绑 catalog.status（saleState），绝不美化 Sold Out→在售/在建。
//   · DFP-5 / 开发商 chip / 社区名 / 社区 tag 全绑最新库值（解剖 7 冲突修复）。
//   · emoji 全部在组件侧转 SVG（本装配器只出文本/关键字，不出 emoji）。
//   · 图片走 assets-manifest 本地 webp（/img/…），无则回落 rich.hero（本地）。
// ============================================================
import {
  getDeveloper, getCommunity, getHeroImages, getAssets, askHref,
  developerSlug, communitySlug, projectSlug, gvBucket,
  isCurrentDfp5, blurbShort, firstLine,
} from '@/lib/catalog';
// 子项户型全量索引（第 1 棒锁版 · 929 slug / 2859 行）：rich.unitTypes 缺省时的回落源。
// key = projectSlug(p)，value = { name, unitTypes:[{type,sizeMinSqft,sizeMaxSqft,unitCount,startFromAED,startFromLabel}], unitNote }。
import SUBITEMS_INDEX from '@/lib/data/subitems-index.json';

const strip = (s) => String(s || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
const cjk = (s) => /[一-鿿]/.test(String(s || ''));
const zhPart = (s) => {
  if (!s) return '';
  const parts = String(s).split(/[·|]/).map((x) => x.trim());
  return parts.find(cjk) || '';
};
const fmtAED = (n) => (Number.isFinite(n) ? 'AED ' + Number(n).toLocaleString() : '—');
// 路线二 YouTube：仅放行 youtube.com / youtu.be / youtube-nocookie，提取 11 位视频 id。
// 其它域名（dropbox 等）一律返回 null → 「项目视频」块不渲染（build-catalog 侧已先过滤一层）。
function youTubeId(url) {
  const u = String(url || '').trim();
  if (!u) return null;
  let m = u.match(/^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)([A-Za-z0-9_-]{11})/i);
  if (!m) m = u.match(/^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : null;
}
// 去 emoji（护栏铁律：装配器出文本零 emoji）。社区 marketData 的户型名可能含人工旗标
// 符号（源自社区板人工标记，如「3 Beds」后缀一个旗标字符）；此清洗先过再出。
const EMOJI_G = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const deEmoji = (s) => String(s == null ? '' : s).replace(EMOJI_G, '').replace(/\s+/g, ' ').trim();
// 全树 emoji 终扫（护栏安全网）：源库自由文本字段（catalog.blurb/location、社区 blurbCn 的
// 警示/旗标/机器人等录入符号）可能夹带 emoji；返回前对整装配对象做一次深扫，剥离 emoji 并回收
// 其相邻孤立空格——**不触碰任何不含 emoji 的字符串**（保证零回归 + 护栏断言逐字相等）。
// 刻意不含箭头块（U+2190–21FF）：→ ↓ 为纯文本箭头，非 emoji，须放行。
const EMOJI_STRIP = /[ \t]*[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F0FF}\u{2600}-\u{27BF}\u{FE0F}]+[ \t]*/gu;
const stripEmojiStr = (s) => s.replace(EMOJI_STRIP, (m) => (/^[ \t]/.test(m) && /[ \t]$/.test(m) ? ' ' : ''));
function stripEmojiDeep(node) {
  if (typeof node === 'string') return stripEmojiStr(node);
  if (Array.isArray(node)) return node.map(stripEmojiDeep);
  if (node && typeof node === 'object') {
    const o = {};
    for (const k of Object.keys(node)) o[k] = stripEmojiDeep(node[k]);
    return o;
  }
  return node;
}

// 售态 → 对客标签（严格由 catalog.status 派生，售态护栏唯一口径）。
export function saleState(status) {
  const s = String(status || '');
  if (/sold/i.test(s)) return { kind: 'sold', label: '已售罄', tag: '售罄在册' };
  if (/coming|soon/i.test(s)) return { kind: 'coming', label: '即将开盘', tag: '即将开盘' };
  if (/available|selling|launch/i.test(s)) return { kind: 'available', label: '在售', tag: '在售发售' };
  return { kind: 'other', label: s || '待更新', tag: s || '待更新' };
}

const TAG_CN = {
  Popular: '热门', Luxury: '豪宅', Waterfront: '滨水', 'Family Friendly': '家庭友好',
  Family: '家庭', Business: '商务', Tourism: '旅游', Beachfront: '临海',
  Golf: '高尔夫', Investment: '投资', 'Off-Plan': '期房',
};
// tag → AmenityIcon 关键字（组件按关键字出 SVG，禁 emoji）。
const TAG_ICONKEY = {
  Waterfront: '滨水', Beachfront: '滨水', Luxury: '园景', 'Family Friendly': '儿童',
  Family: '儿童', Business: '办公', Popular: '园景', Tourism: '园景', Golf: '球场',
};
const TAG_TITLE = {
  Waterfront: '一线水岸 · 稀缺岸线', Beachfront: '临海岸线 · 稀缺资源',
  Luxury: '豪宅品质片区', 'Family Friendly': '家庭友好生活', Family: '家庭友好生活',
  Business: '商务通达枢纽', Popular: '成熟热门片区', Tourism: '旅游目的地', Golf: '高尔夫社区',
};

// 距离行解析（"• 10.5 km to Business Bay" / "…· 约 5 分钟" → {dm, dl}）。
function distRow(line) {
  const s = String(line).replace(/^[•\-\s]+/, '').trim();
  const mMin = s.match(/(\d+(?:\.\d+)?)\s*(?:mins?|分钟|min)/i);
  const mKm = s.match(/(\d+(?:\.\d+)?)\s*km/i);
  let dm; let token;
  if (mMin) { dm = `${mMin[1]} 分钟`; token = mMin[0]; }
  else if (mKm) { dm = `${mKm[1]} km`; token = mKm[0]; }
  else { const head = s.split(/[·,，]/)[0].trim(); return { dm: '邻近', dl: head || s }; }
  const dl = s.replace(token, '')
    .replace(/\b约\b/g, '').replace(/\bto\b/ig, '').replace(/[·|]/g, '')
    .replace(/^\s*[-–]\s*/, '').replace(/\s+/g, ' ').trim();
  return { dm, dl: dl || s };
}

// 配套多行串（catalog.amenities 的 "• …\n• …"）→ 数组。
function splitBullets(s) {
  return String(s || '').split('\n').map((x) => x.replace(/^[•\-\s]+/, '').trim()).filter(Boolean);
}

// 图片槽：manifest 本地 webp 优先，回落 rich.hero（本地）；缺则 null。
function buildImages(p, rich) {
  const man = getHeroImages(p); // [{src,alt}]
  if (man.length) return man;
  if (Array.isArray(rich?.hero) && rich.hero.length) {
    return rich.hero.map((h, i) => ({ src: h.src, alt: h.alt || `${p.name} 效果图 ${i + 1}`, caption: h.caption }));
  }
  return [];
}
const imgAt = (imgs, i) => (imgs.length ? imgs[i % imgs.length] : null);
// 分类图集（manifest detailImages/areaImages）→ [{src,alt}]，无则 []。alt 用项目名兜底。
const labelImgs = (arr, name, label) =>
  (Array.isArray(arr) ? arr : []).map((src, i) => ({ src, alt: `${name} ${label} ${i + 1}` }));

// ov-stat 社区量级：从 communityFacts 找「X 百万㎡ / X 万㎡」→ {num, unit}。
function scaleStat(rich) {
  const facts = rich?.communityFacts || [];
  for (const f of facts) {
    const m = String(f).match(/(\d+(?:\.\d+)?)\s*(百万㎡|万㎡|㎡|平方公里|km²)/);
    if (m) return { num: m[1], unit: m[2], l: String(f).replace(/[•\-\s]*/, '').trim() };
  }
  return null;
}

// ============================================================
// 主装配器
// ============================================================
export function buildProjectPageData(p, rich = {}) {
  // —— 户型弹性回落（全量跑第 2 棒 · LEO 2026-07-12）——
  // rich.unitTypes 缺失/空 → 回落子项索引 subitems-index.json[slug]（同构结构直接注入，
  // 使 929 个有子项户型的项目自动点亮户型章）；两者皆无者 floors 为空 → 户型卡按弹性规则
  // 整块省略（组件侧 floors.length>0 才渲染，不留空壳），指导价格护栏行仍在场。
  if (!(Array.isArray(rich.unitTypes) && rich.unitTypes.length)) {
    const _sub = SUBITEMS_INDEX[projectSlug(p)];
    if (_sub && Array.isArray(_sub.unitTypes) && _sub.unitTypes.length) {
      rich = { ...rich, unitTypes: _sub.unitTypes, unitNote: rich.unitNote || _sub.unitNote || '' };
    }
  }
  const dev = getDeveloper(p.developer);
  const community = getCommunity(p.area);
  const state = saleState(p.status);
  const imgs = buildImages(p, rich);
  // 分类素材（管线 2026-07-11 升级）：产品细节走 detailImages、地段/社区走 areaImages；
  // 无分类素材时回落既有图集定位（imgAt），保持零回归。
  const rawAssets = getAssets(projectSlug(p)) || {};
  const detailImgs = labelImgs(rawAssets.detailImages, p.name, '产品细节');
  const areaImgs = labelImgs(rawAssets.areaImages, p.name, '片区周边');
  // —— 路线一：自托管氛围短片（manifest heroVideo，站内本地 /video/ 路径）——
  //   无视频数据（现状 1705 页）→ heroVideo=null → 首屏维持图片渲染，零回归。
  const heroVideo = (rawAssets.heroVideo && typeof rawAssets.heroVideo.src === 'string' && rawAssets.heroVideo.src)
    ? { src: rawAssets.heroVideo.src, ...(rawAssets.heroVideo.poster ? { poster: rawAssets.heroVideo.poster } : {}) }
    : null;
  const gb = gvBucket(p.gv);
  const typesLabel = strip(p.types) || '住宅';
  const handover = strip(rich.handover) || strip(p.handover) || '待定';
  const startText = strip(p.startHint) || '价格请咨询顾问';
  const communityCn = community?.cn || p.area;
  const communityName = community?.name || p.area;
  const sub = rich.subCommunity || null;

  // —— 中文名降级（解剖 §3 / decision④：cn 缺→显英文，em 副标省略，不硬造译名）——
  const cnName = rich.cn || p.cn || '';
  const h1 = cnName || p.name;
  const hasCn = !!cnName;
  const heroEm = hasCn ? zhPart(rich.tagline) : '';

  // —— 共享派生（开发商名 / DFP-5 / 付款结构 · 多章复用，单处收敛）——
  const devName = dev ? `${dev.name}${dev.cn ? ` ${dev.cn}` : ''}` : p.developer;
  // —— 首屏「一句 tagline」（标题下一行 · 结构性一句；不复用概况 lead，不与眉标/英文名/em 重复）——
  const heroTagline = strip(rich.heroTagline)
    || `${devName} 出品 · 坐落 ${communityName} 的${typesLabel}`;
  const rated = !!(dev && isCurrentDfp5(dev));
  const dfp5Score = rated ? (Math.round(Number(dev.dfp5.score) * 10) / 10).toFixed(1) : null;
  const payStruct = (rich.payment && rich.payment.structure)
    || (String(p.payment).match(/\d+\s*[%％/／]\s*\d+\s*[%％/／]?\s*\d*/) || [''])[0].replace(/[%％]/g, '').replace(/\s/g, '')
    || '';

  // —— 户型「居室区间」+「面积区间」（首屏关键信息面板 + 户型章复用）——
  const bedNums = (rich.unitTypes || [])
    .map((u) => Number((String(u.type).match(/\d+/) || [])[0])).filter((n) => Number.isFinite(n) && n > 0);
  const bedRange = bedNums.length
    ? (Math.min(...bedNums) === Math.max(...bedNums) ? `${bedNums[0]} 居` : `${Math.min(...bedNums)}–${Math.max(...bedNums)} 居`)
    : String((p.unitInfo || typesLabel).split('；')[0] || typesLabel);
  const allSizes = (rich.unitTypes || [])
    .flatMap((u) => [Number(u.sizeMinSqft), Number(u.sizeMaxSqft)]).filter((n) => Number.isFinite(n) && n > 0);
  const sizeSpan = allSizes.length
    ? `约 ${Math.min(...allSizes).toLocaleString()}–${Math.max(...allSizes).toLocaleString()} sq.ft.`
    : (((p.unitInfo || '').match(/约?\s*[\d,]+\s*[–\-]\s*[\d,]+\s*sq\.?ft\.?/i) || [''])[0] || '咨询顾问');

  // —— 导语（rich.intro 优先，缺则程序化模板句）——
  const genIntro = `${devName} 出品，`
    + `坐落于 ${communityName} 的${typesLabel}项目；${firstLine(p.location)}。`
    + `采用${strip(p.payment) || '分期'}付款结构，预计 ${handover} 交付，永久产权。`;
  const lead = rich.intro || p.blurb || genIntro;

  // ============================================================
  // 段 1 · 首屏展示 HERO
  // ============================================================
  const hero = {
    tag: [state.tag, communityCn, sub].filter(Boolean).join(' · '),
    h1,
    em: heroEm,
    en: `${p.name} · ${sub || communityName}`,
    // 首屏左区：眉标+大标题+一句 tagline+CTA + CTA 下方紧凑四格（收束版）。
    tagline: heroTagline,
    // 可选富内容引言槽（Tilal 母版右栏 quote）：仅当 rich.heroQuote 有值才渲染，
    // 无值则组件省略该行（返修②：禁自撰营销引言，改为可选数据槽位）。
    quote: strip(rich.heroQuote) || '',
    // 「首屏左栏四格」（2×2 · 轻量无重底色 · 与右图 3:2 底边对齐目标）：
    // 预售状态 / 交付时间 / 起售价(红字 + 护栏「起价约 · 非实时报价」) / 户型。
    // 起售价为全页首屏唯一出现位置（下方 7 格信息带不再含起售价，杜绝字段重复）。
    stats: [
      { k: '预售状态', v: state.label },
      { k: '交付时间', v: handover },
      { k: '起售价', v: startText.replace(/（[^）]*）/g, '').trim() || '价格请咨询顾问', isPrice: true, note: '起价约 · 非实时报价' },
      { k: '户型', v: bedRange },
    ],
    image: imgAt(imgs, 0),
    // 路线一：仅当有本地短片时挂 heroVideo（组件首屏改 <video> 背景，尊重 reduced-motion 降级 poster）；
    // 无则不出此键 → 装配对象与改前逐字节等价（零回归硬要求）。
    ...(heroVideo ? { heroVideo } : {}),
  };

  // ============================================================
  // 段 2 · 项目概况（关键事实条 FACTS + 概览导语 OVERVIEW）
  // ============================================================
  const gvFact = gb === 'fit'
    ? { v: '适配', small: '起价已达门槛' }
    : gb === 'below'
      ? { v: '门槛以下', small: '重身份建议看大户型' }
      : { v: /可达/.test(p.gv || '') ? '部分可达' : '待核', small: '需选较大户型' };
  // 全宽信息带（收束版：单行 6 格 / 移动端 2 列）：
  // 物业类型 / 面积区间 / 业权 / 黄金签证 / 开发商(DFP-5+方法论链) / 所在社区。
  // 付款结构不入带（LEO 2026-07-11：户型价格章已含付款计划，避免重复）。
  // 与首屏左栏四格零重复——起售价、预售状态、交付时间、户型只在左栏，本带绝不再现起售价。
  const facts = [
    { k: '物业类型', v: typesLabel, small: '外籍可购 · 自住/投资' },
    { k: '面积区间', v: sizeSpan, small: '建筑面积 · 示意' },
    { k: '业权', v: 'Freehold', small: '永久产权 · 外籍可购' },
    { k: '黄金签证', v: gvFact.v, small: gvFact.small },
    { k: '开发商', v: devName, small: rated ? `丹枫 DFP-5 ${dfp5Score}` : '丹枫在库开发商', lockn: rated ? '评级方法论见开发商页' : '' },
    { k: '所在社区', v: communityName, small: sub || communityCn || '迪拜' },
  ];

  const stats = [];
  if (dev && dev.dxb && Number.isFinite(dev.dxb.rank)) {
    const rankCn = dev.dxb.rank === 1 ? '第一' : `第 ${dev.dxb.rank}`;
    stats.push({ n: `#${dev.dxb.rank}`, unit: '', l: `${dev.name} · 迪拜销售额${rankCn}开发商（as of ${dev.dxb.asOf || '2026'}）` });
  }
  const sc = scaleStat(rich);
  if (sc) stats.push({ n: sc.num, unit: sc.unit, l: `${communityName} 片区体量` });
  const nearest = (rich.location?.distances || splitBullets(p.location))
    .map(distRow).filter((d) => /分钟/.test(d.dm))
    .sort((a, b) => parseFloat(a.dm) - parseFloat(b.dm))[0];
  if (nearest) stats.push({ n: parseFloat(nearest.dm), unit: '分钟', l: `直抵 ${nearest.dl}` });
  if (payStruct) stats.push({ n: payStruct, unit: '', l: '低门槛付款结构（结构示意）' });

  const p2 = `项目提供 ${p.unitInfo || typesLabel}，`
    + `采用${strip(p.payment) || '分期'}付款结构，${handover} 交付；`
    + `业权 Freehold 永久产权，外籍可购，`
    + `${gb === 'fit' ? '起价已达黄金签证门槛' : '较大户型可覆盖黄金签证配置门槛'}（以具体户型与总价为准）。`;
  const overview = {
    eyebrow: '项 目 概 况',
    h2Line: communityCn,
    h2Em: `${typesLabel}生活的结构性定位`,
    paras: [lead, p2],
    stats: stats.slice(0, 4),
  };

  // ============================================================
  // 段 3 · 核心亮点 HIGHLIGHTS（JSON highlights 优先；程序化兜底 3–5 条研究腔）
  // ============================================================
  const sizeRangeHL = ((p.unitInfo || '').match(/约?\s*[\d,]+\s*[–\-]\s*[\d,]+\s*sq\.?ft\.?/i) || [''])[0] || sizeSpan;
  // 程序化兜底 highlights（LEO 点③：仅无 JSON highlights 的项目走此兜底；有实采 highlights 的项目直接实写）
  const genHl = [
    `${devName} 出品，坐落于 ${communityName}${sub ? ` · ${sub}` : ''} 核心地段，稀缺性由片区结构而非营销叙事支撑。`,
    `提供 ${(p.unitInfo || typesLabel)}${sizeRangeHL ? `，建筑面积${sizeRangeHL}` : ''}，兼顾自住与资产配置。`,
    nearest ? `${nearest.dm}直抵 ${nearest.dl}，形成机场—CBD—自然多向通达的区位结构。` : `${firstLine(p.location) || communityName}，区位通达全城。`,
    `采用${payStruct || strip(p.payment) || '分期'}付款结构，${handover} 交付；Freehold 永久产权，外籍可购。`,
    `${gb === 'fit' ? '起价已达黄金签证配置门槛' : '较大户型可覆盖黄金签证配置门槛'}${rated ? `；开发商丹枫 DFP-5 评级 ${dfp5Score}（${dev.dfp5.version || ''}）` : ''}。`,
  ].filter(Boolean);
  const richHl = Array.isArray(rich.highlights) ? rich.highlights.filter(Boolean) : [];
  const hlSource = richHl.length ? 'json' : 'generated';
  const hlItems = (richHl.length ? richHl : genHl).slice(0, 5);
  const highlights = hlItems.length >= 3 ? {
    eyebrow: '核 心 亮 点',
    h2Line: '这一标的，',
    h2Em: '几个结构性理由',
    source: hlSource,
    items: hlItems,
  } : (hlItems.length ? { eyebrow: '核 心 亮 点', h2Line: '这一标的，', h2Em: '要点速览', source: hlSource, items: hlItems } : null);

  // ============================================================
  // 段 4 · 地段位置 LOCATION（前移 · 距离表）
  // ============================================================
  const locLines = (rich.location?.distances && rich.location.distances.length)
    ? rich.location.distances : splitBullets(p.location);
  const distances = locLines.map(distRow);
  const conn = (rich.location?.connectivity || []).join('；')
    || (community?.profile?.location ? splitBullets(community.profile.location).slice(-2).join('；') : '');
  // 免密钥地图嵌入（LEO 点④）：Google Maps 经典 output=embed 形态，无需 API key；query = 项目名 + 社区 + Dubai。
  const mapQuery = `${p.name} ${communityName} Dubai`;
  const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=13&hl=zh-CN&output=embed`;
  const location = distances.length ? {
    eyebrow: '地 段 位 置',
    h2Line: '迪拜',
    h2Em: '核心通勤半径',
    h2Tail: '之内',
    mapEmbed,
    mapQuery,
    mapCap: `地图数据 · Google Maps · 位置示意（以官方红线图为准）`,
    // 仅当 manifest 有 area 类素材图时并列展示；不回落 hero，避免拿效果图冒充区位图。
    areaImg: areaImgs[0] || null,
    areaCap: `${p.name} 片区 / 周边示意 · 图片来自开发商官方素材`,
    distances,
    conn,
  } : null;

  // ============================================================
  // 段 5 · 产品细节 PRODUCT DETAILS（弹性；rich.productDetails 有则渲染，无则整章省略）
  //   每块 {title, body, image?}；image 缺省 → 回落图集本地图；image:null → 纯文本块。
  //   兜底：无 productDetails 但有 legacy finishes → 合成块（内容官迁移过渡期）。
  // ============================================================
  let pdBlocksRaw = Array.isArray(rich.productDetails) ? rich.productDetails : [];
  if (!pdBlocksRaw.length && Array.isArray(rich.finishes) && rich.finishes.length) {
    pdBlocksRaw = rich.finishes.map((f) => ({ title: f.title, body: f.desc }));
  }
  const productDetails = pdBlocksRaw.length ? {
    eyebrow: '产 品 细 节',
    h2Line: '从建筑到收口，',
    h2Em: '楼书级的产品解读',
    blocks: pdBlocksRaw.map((b, i) => {
      let img = null;
      if (b.image === null || b.image === false || b.noImage) img = null;
      else if (b.image && typeof b.image === 'object' && b.image.src) img = { src: b.image.src, alt: b.image.alt || `${p.name} 产品细节 ${i + 1}`, caption: b.image.caption || '' };
      else if (typeof b.image === 'string' && b.image) img = { src: b.image, alt: `${p.name} 产品细节 ${i + 1}`, caption: '' };
      else img = detailImgs[i] || imgAt(imgs, 2 + i);
      return { title: b.title || '', body: b.body || b.desc || '', img };
    }).filter((b) => b.title || b.body),
  } : null;

  // ============================================================
  // 段 6 · 公共配套 AMENITIES
  // ============================================================
  const amItems = (rich.amenities && rich.amenities.length ? rich.amenities : splitBullets(p.amenities));
  const amenities = amItems.length ? {
    eyebrow: '公 共 配 套',
    h2Line: '每一项体验，',
    h2Em: '都在公共层展开',
    items: amItems,
    band: imgAt(imgs, 4),
    bandCap: `${p.name} 配套实景 / 效果 · 图片来自开发商官方素材`,
  } : null;

  // ============================================================
  // 段 7 · 户型价格 UNIT（户型卡：面积 / 套数 / 起价示意护栏）
  // ============================================================
  const sizeRange = ((p.unitInfo || '').match(/约\s*[\d,]+[–\-][\d,]+\s*sq\.?ft\.?/i) || [''])[0];
  const unitP1 = `户型涵盖 ${(p.unitInfo || typesLabel).split('；')[0]}${sizeRange ? `，建筑面积${sizeRange}` : ''}。`
    + `${(rich.unitTypes || []).some((u) => Number(u.unitCount) === 1 || /5|penthouse|复式/i.test(u.type)) ? '顶层大平层/复式坐拥 360° 全景，' : ''}兼顾自住与资产配置。`;
  const unitP2 = `业权 Freehold 永久产权，外籍可购；较大户型可满足黄金签证门槛（以具体户型与总价为准）。`;
  const floors = (rich.unitTypes || []).map((u) => {
    const bed = (String(u.type).match(/\d+/) || ['—'])[0];
    const isPh = Number(bed) >= 5 || /penthouse|复式|顶层/i.test(u.type);
    // 面积区间：subitems 回落项可能出现 sizeMinSqft=null（子项板未录面积）→ 弹性降级为「面积待更新」，
    // 杜绝 "null ft²" 文本泄漏；有限值时格式与既有 v5 页零回归（原样数字，不加千分位）。
    const smin = Number(u.sizeMinSqft);
    const smax = Number(u.sizeMaxSqft);
    const size = (Number.isFinite(smin) && smin > 0)
      ? `${smin}${Number.isFinite(smax) && smax > 0 && smax !== smin ? `–${smax}` : ''} ft²`
      : '面积待更新';
    const price = (u.startFromLabel || (u.startFromAED ? `AED ${Number(u.startFromAED).toLocaleString()} 起` : '咨询顾问'))
      .replace(/（[^）]*）/g, '').trim();
    const rows = [{ k: '面积', v: size }];
    if (Number.isFinite(Number(u.unitCount)) && Number(u.unitCount) > 0) rows.push({ k: '套数', v: `${u.unitCount} 套（示意）` });
    rows.push({ k: '起价', v: price });
    return { num: isPh ? 'PH' : bed, unitLabel: isPh ? '顶层' : '居', name: u.type, isPh, rows };
  });
  // 付款计划并入户型价格章（LEO 点⑥）：milestones 来自 rich.payment（示意口径）。
  const payMilestones = (rich.payment && Array.isArray(rich.payment.milestones)) ? rich.payment.milestones.filter(Boolean) : [];
  const unitPayment = payMilestones.length ? {
    structure: (rich.payment && rich.payment.structure) || payStruct || '',
    milestones: payMilestones.map((m) => ({ percent: m.percent || '', stage: m.stage || '', note: m.note || '' })),
    note: (rich.payment && rich.payment.note) || '',
  } : null;
  // 收尾「指导价格」汇总行（护栏口径）：取全盘最低开盘起价，非某一房源实时报价。
  const startVals = (rich.unitTypes || []).map((u) => Number(u.startFromAED)).filter((n) => Number.isFinite(n) && n > 0);
  const priceSummary = {
    label: startVals.length ? '指导价格 · 全盘起价' : '指导价格',
    value: startVals.length ? `${fmtAED(Math.min(...startVals))} 起` : (startText.replace(/（[^）]*）/g, '').trim() || '价格请咨询顾问'),
    note: '开盘起价示意 · 非实时报价；具体可售房源、实时价格与优惠以丹枫持牌顾问确认为准。',
  };
  const unit = {
    eyebrow: '户 型 与 价 格',
    h2Line: '面积 · 套数 · 起价示意',
    h2Em: '一址多选的典藏',
    paras: [rich.unitNote && !rich.intro ? rich.unitNote : unitP1, unitP2],
    heroImg: imgAt(imgs, 2),
    heroCap: `${p.name} 户型示意 · 图片来自开发商官方素材`,
    floors,
    payment: unitPayment,
    priceSummary,
    note: rich.unitNote || '',
  };

  // ============================================================
  // 段 8 · 社区生活 COMMUNITY（片区画像卡 + 社区参考价带护栏 + 进入社区页互链）
  //   现 S4 片区 + S8 社区互链合并成此章；参考价走 marketData（LEO 已授权对外）。
  // ============================================================
  let communitySec = null;
  if (community) {
    const pf = community.profile || {};
    let cards = [];
    let cblurb = '';
    if (pf.blurbCn) {
      const sents = pf.blurbCn.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
      cblurb = sents[0] || blurbShort(pf.blurbCn, 60);
      const tags = (pf.tags || []).slice(0, 4);
      cards = tags.map((t, i) => ({
        iconKey: TAG_ICONKEY[t] || '园景',
        tag: TAG_CN[t] || t,
        title: TAG_TITLE[t] || `${TAG_CN[t] || t}片区`,
        desc: sents[i] || sents[0] || blurbShort(pf.blurbCn, 60),
      }));
    }
    const md = community.marketData;
    const rows = md && Array.isArray(md.unitPrices)
      ? md.unitPrices.filter((u) => u.salePrice || u.rent || u.roi).slice(0, 5).map((u) => ({
        type: deEmoji(u.type) || '—',
        propertyType: deEmoji(u.propertyType) || '—',
        sale: fmtAED(u.salePrice),
        rent: u.rent ? fmtAED(u.rent) + '/年' : '—',
        roi: Number.isFinite(u.roi) ? u.roi + '%' : '—',
      }))
      : [];
    const priceBand = rows.length ? {
      title: '社区级户型参考价',
      badge: '公开行情参考 · 非实时报价',
      rows,
      source: md.source || 'Bayut / PF 公开行情',
      note: '社区级公开参考价，非某一具体房源报价、非收益承诺；具体户型实时价格与可售房态以丹枫持牌顾问及开发商正式文件为准。',
    } : null;
    communitySec = {
      eyebrow: '社 区 生 活',
      h2Line: communityCn,
      h2Em: '片区总规与社区生活',
      blurb: cblurb,
      cards,
      wide: cards.length ? (areaImgs[1] || areaImgs[0] || imgAt(imgs, 1)) : null,
      wideCap: `${communityName} 片区实景 / 效果 · 图片来自开发商官方素材`,
      priceBand,
      link: {
        name: community.name,
        cn: `${community.cn || ''}${community.communityId ? ` · ${community.communityId}` : ''}`,
        isHot: !!community.isHot,
        tags: (pf.tags || []).slice(0, 4).map((t) => ({ en: t, cn: TAG_CN[t] || '' })),
        blurb: pf.blurbCn || '',
        href: `/communities/${communitySlug(community)}`,
      },
    };
  }

  // ============================================================
  // 段 9 · 开发商简介 DEVELOPER（DFP-5 评级带 + 品牌一句话 + 进入开发商页互链）
  //   全绑最新库值（解剖 7 冲突修复）。
  // ============================================================
  let developerSec = null;
  if (dev) {
    const rated = isCurrentDfp5(dev);
    const dxb = dev.dxb || {};
    const chips = [];
    if (Number.isFinite(dxb.rank)) chips.push({ k: '迪拜销售额', v: `#${dxb.rank}` });
    if (Number.isFinite(dxb.deliveredUnits)) chips.push({ k: '累计交付', v: `${Number(dxb.deliveredUnits).toLocaleString()} 套` });
    if (Number.isFinite(dxb.ucProjects)) chips.push({ k: '在建', v: `${dxb.ucProjects} 盘` });
    if (Number.isFinite(dxb.absorptionPct)) chips.push({ k: '吸纳率', v: `${dxb.absorptionPct}%` });
    developerSec = {
      eyebrow: '开 发 商 简 介',
      h2: `谁在开发 · ${dev.name}`,
      p: '项目、开发商与社区在丹枫平台互联互通——进入开发商详情页，交叉查看同开发商其它作品与 DFP-5 评级方法论。',
      name: dev.name,
      cn: dev.cn ? `${dev.cn}${dev.founded ? ` · ${dev.founded} 年成立` : ''}` : '',
      rated,
      leaves: rated ? Number(dev.dfp5.leaves) : null,
      score: rated ? (Math.round(Number(dev.dfp5.score) * 10) / 10).toFixed(1) : null,
      version: rated ? dev.dfp5.version : null,
      chips,
      blurb: dev.blurbCn || '',
      href: `/developers/${developerSlug(dev)}`,
    };
  }

  // ============================================================
  // 段（弹性）· 项目视频 VIDEO（路线二 · catalog.videoUrl 仅 youtube 域 → 懒加载嵌入）
  //   落位：开发商简介之后、户型价格之前（版式判断）。无 videoUrl → 整块省略无空壳。
  // ============================================================
  const ytId = youTubeId(p.videoUrl);
  const video = ytId ? {
    eyebrow: '项 目 视 频',
    h2Line: '影像中的',
    h2Em: '项目实景',
    youtubeId: ytId,
    // 懒加载：组件默认渲染 YouTube 封面图（img.youtube.com/vi/<id>/…）+ 播放按钮，
    // 点击才注入 youtube-nocookie 隐私增强嵌入（性能 + 隐私）。
    embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&autoplay=1`,
    watchUrl: `https://www.youtube.com/watch?v=${ytId}`,
    note: '视频由开发商 / 官方渠道于 YouTube 发布，经隐私增强模式嵌入；点击后按需加载。',
  } : null;

  const _assembled = {
    slug: projectSlug(p),
    name: p.name,
    askHref: askHref(p),
    state,
    // 十段（编号即渲染顺序；弹性段可为 null → 组件整章省略）
    hero,             // 1 首屏展示
    facts, overview,  // 2 项目概况
    highlights,       // 3 核心亮点
    location,         // 4 地段位置
    productDetails,   // 5 产品细节（弹性）
    amenities,        // 6 公共配套
    unit,             // 7 户型价格
    community: communitySec,  // 8 社区生活
    developer: developerSec,  // 9 开发商简介
    // 弹性块：项目视频（仅当 catalog.videoUrl 为 youtube 域时在场）；无 → 不出此键（零回归）。
    ...(video ? { video } : {}),
    updated: rich.meta?.updated || '2026-07',
    // 审计：售态断言用（渲染态 vs catalog 源）。
    _statusSource: p.status || '',
  };
  // 返回前全树剥离 emoji（护栏安全网 · 不改动无 emoji 字符串）。
  return stripEmojiDeep(_assembled);
}
