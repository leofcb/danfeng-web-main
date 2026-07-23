#!/usr/bin/env node
// ============================================================
// 落地页生成器（WEB-LP-V1.3）
// 用法：node danfeng-web/scripts/gen-landing.mjs <slug>
//   读 scripts/landing/<slug>.json（内容官按楼书+项目库填好的数据）
//   → 生成 deliverables/<slug>/index.html（相对图，双击预览）
//   → 生成 public/projects/<slug>/index.html（绝对图，随站点部署）
//   → 自动登记 lib/standalonePages.js 与 publish 脚本 ITEM 映射
// 静态外壳（CSS/Gallery JS）来自 scripts/landing/_styles.html + _gallery.html。
// 内容全部来自 JSON；开发商默认 Beyond（可在 JSON.developer 覆盖）。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));      // danfeng-web/scripts
const WEB = join(__dir, '..');                              // danfeng-web
const REPO = join(WEB, '..');                               // 项目根
const LAND = join(__dir, 'landing');

const slug = process.argv[2];
if (!slug) { console.error('用法: node scripts/gen-landing.mjs <slug>'); process.exit(1); }

const data = JSON.parse(readFileSync(join(LAND, `${slug}.json`), 'utf8'));
const STYLES = readFileSync(join(LAND, '_styles.html'), 'utf8').trimEnd();
let GALLERY_JS = readFileSync(join(LAND, '_gallery.html'), 'utf8').trimEnd();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const A = (name) => `assets/${name}.webp`;                  // 相对图路径（预览版）

// —— 开发商维表（批量数据驱动开发商块，任何开发商自动出块；DXB 口径统一改 DLD）——
const DEVELOPERS = JSON.parse(readFileSync(join(WEB, 'lib', 'data', 'developers.json'), 'utf8'));
const DEV_OWN = { Government: '政府', Private: '私营', 'Public Listed': '上市企业', 'Local Family': '本地家族' };
const devSlugOf = (n) => String(n || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const numFmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('en-US') : null);
function buildDevBlock(name) {
  const dev = DEVELOPERS.find((d) => d.name === name);
  if (!dev) return BEYOND_DEV;                              // 维表未命中 → 兜底 Beyond 块
  const slug = devSlugOf(dev.name);
  const dxb = dev.dxb || {}, f = dev.dfp5 || {};
  const rated = f.status === 'Rated' && Number.isFinite(f.score);
  const own = DEV_OWN[dev.ownership] || '';
  const facts = [];
  if (Number.isFinite(dxb.salesValueBn)) facts.push(['今年销售额', `AED ${dxb.salesValueBn}B`]);
  if (Number.isFinite(dxb.rank)) facts.push(['今年销售额排名', `第 ${dxb.rank}`]);
  if (Number.isFinite(dxb.transactionsYtd)) facts.push(['今年成交量', `${numFmt(dxb.transactionsYtd)} 套`]);
  if (Number.isFinite(dxb.ucUnits)) facts.push(['在建规模', `${numFmt(dxb.ucUnits)} 套`]);
  if (Number.isFinite(dxb.ucProjects)) facts.push(['在建项目', `${dxb.ucProjects} 个`]);
  if (Number.isFinite(dxb.deliveredUnits)) facts.push(['已交付', `${numFmt(dxb.deliveredUnits)} 套`]);
  const factsHtml = facts.slice(0, 6).map(([k, v]) => `<div class="dev-fact"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join('');
  const score = rated
    ? `<div class="dev-score"><b>${(Math.round(f.score * 10) / 10).toFixed(1)}</b><span>${esc(f.version || 'DFP-5')} · ${f.leaves} 枫叶<br>置信度 ${esc(f.confidence || '—')} · 覆盖率 ${Number.isFinite(f.coverage) ? f.coverage : '—'}%</span></div>`
    : `<div class="dev-score"><b style="font-size:34px">未评级 NR</b><span>尚未纳入 DFP-5 覆盖<br>不代表负面评价</span></div>`;
  const heading = dev.cn ? `${esc(dev.name)} ${esc(dev.cn)}` : esc(dev.name);
  const sub = [own && `${own}`, dev.founded && `${dev.founded} 年成立`, dev.country].filter(Boolean).join(' · ');
  const asOf = dxb.asOf || f.ratedDate || '';
  return `<div class="developer-layout"><div class="developer-copy reveal"><div class="dev-heading"><img class="dev-logo" src="https://danfengproperties.com/img/developers/${slug}/logo.webp" alt="${esc(dev.name)} 开发商标志" onerror="this.style.display='none'"><div class="dev-name">${heading}${sub ? `<span>${esc(sub)}</span>` : ''}</div></div>${dev.blurbCn ? `<p>${esc(dev.blurbCn)}</p>` : ''}${score}<div class="dev-facts">${factsHtml}</div><p class="data-note">来源：丹枫开发商数据库、DLD 迪拜土地局。${asOf ? `数据截至 ${esc(asOf)}；` : ''}DFP-5 为丹枫内部研究评分，仅供参考，非信用评级、不构成投资建议。</p><a class="btn btn-dark" href="https://danfengproperties.com/developers/${slug}">查看 ${esc(dev.name)} 详情与完整评级</a></div></div>`;
}

// —— 开发商默认块（Beyond；JSON.developer 可整段覆盖 html 字段）——
const BEYOND_DEV = `<div class="developer-layout"><div class="developer-copy reveal"><div class="dev-heading"><img class="dev-logo" src="https://danfengproperties.com/img/developers/beyond/logo.webp" alt="BEYOND 开发商标志"><div class="dev-name">OMNIYAT GROUP 旗下高端地产品牌<span>AN OMNIYAT GROUP COMPANY</span></div></div><p>BEYOND 为 OMNIYAT GROUP 旗下高端地产品牌，2024 年成立，强调设计、自然与品质生活。集团背景有助于品牌、资源和产品组织，但不能替代对项目主体、施工进度与最终交付标准的核验。</p><div class="dev-score"><b>71.3</b><span>DFP-5 v3.1 · 4 枫叶<br>置信度 Medium · 覆盖率 70%</span></div><div class="dev-facts"><div class="dev-fact"><small>2026 年销售额</small><strong>AED 6.7B</strong></div><div class="dev-fact"><small>DLD 综合排名</small><strong>第 8</strong></div><div class="dev-fact"><small>近 12 月成交</small><strong>1,269 套</strong></div><div class="dev-fact"><small>在建规模</small><strong>6,824 套</strong></div><div class="dev-fact"><small>在建项目</small><strong>10 个</strong></div><div class="dev-fact"><small>已交付记录</small><strong>0 个</strong></div></div><p class="data-note">来源：丹枫开发商数据库、DLD 迪拜土地局。销售数据截至 2026-07-04；DFP-5 评级日期 2026-07-09。内部评级仅供研究参考。</p><a class="btn btn-dark" href="https://danfengproperties.com/developers/beyond">查看 BEYOND 详情与完整评级</a></div></div>`;

// —— 各区块构建 ——
const facts = () => data.facts.map(f => `<div class="fact"><small>${esc(f.k)}</small><strong>${esc(f.v)}</strong>${f.em ? `<em>${esc(f.em)}</em>` : ''}</div>`).join('');

const galleryThumbs = () => {
  const hasVid = !!(data.video && data.video.id);
  const vid = hasVid ? `<button class="thumb thumb-video active" type="button" data-type="video" data-title="官方项目影片"><img src="${A(data.gallery[0].src)}" alt="播放官方项目影片"><span>官方影片</span></button>` : '';
  const imgs = data.gallery.map((g, i) => `<button class="thumb${!hasVid && i === 0 ? ' active' : ''}" type="button" data-type="image" data-src="${A(g.src)}" data-title="${esc(g.title)}"><img src="${A(g.src)}" alt="${esc(g.title)}"><span>${esc(g.span || g.title)}</span></button>`).join('');
  return vid + imgs;
};

const metrics = () => data.overview.metrics.map(m => `<div class="metric"><b>${esc(m.n)}<span>${esc(m.u)}</span></b><p>${esc(m.p)}</p></div>`).join('');
const highlights = () => data.highlights.items.map(h => `<article class="highlight"><b>${esc(h.b)}</b><div><h3>${esc(h.h)}</h3><p>${esc(h.p)}</p></div></article>`).join('');
const distances = () => data.location.distances.map(d => `<div class="distance"><b>${esc(d.t)}</b><span>${esc(d.p)}</span></div>`).join('');
// 产品设计固定五主题（WEB-LP-V1.3 标准 · 顺序与命名锁定，内容按 data.product 五项对位）：
// 建筑设计 / 景观设计 / 室内设计 / 空间设计 / 材料设计。图片一律横版素材。
// 五主题按关键字归位（不依赖 JSON 顺序，修顺序错乱 + 兼容各种命名）：
const PRODUCT_THEMES = [
  { label: 'ARCHITECTURE · 建筑设计', kw: /建筑|architect|facade|立面|塔|冠顶|structure/i },
  { label: 'LANDSCAPE · 景观设计', kw: /景观|landscape|园林|绿|视野|view|花园|garden|公园|park|水岸|泳池|步道/i },
  { label: 'INTERIOR · 室内设计', kw: /室内|interior|起居|living|卧|bedroom|居所|采光/i },
  { label: 'SPACE · 空间设计', kw: /空间|space|格局|大堂|lobby|挑高|动线|办公|workspace|会所|影院|礼序/i },
  { label: 'MATERIALS · 材料设计', kw: /材料|material|材质|饰面|finish|石材|木作|精工/i },
];
const products = () => {
  const entries = Array.isArray(data.product) ? data.product : [];
  const used = new Array(entries.length).fill(false);
  const slots = PRODUCT_THEMES.map((theme) => {
    const idx = entries.findIndex((e, i) => !used[i] && theme.kw.test(`${e.tag || ''} ${e.h || ''} ${e.p || ''}`));
    let p = {};
    if (idx >= 0) { used[idx] = true; p = entries[idx]; }
    return { theme, p };
  });
  // 未命中的主题用剩余未用条目按序补足（保证五张齐全）
  const rem = entries.map((e, i) => i).filter((i) => !used[i]);
  for (const s of slots) { if (!s.p.h && !s.p.img && rem.length) s.p = entries[rem.shift()]; }
  return slots.map(({ theme, p }, i) => {
    const img = p.img || (data.gallery[i % data.gallery.length] || {}).src;
    return `<article class="product reveal"><div class="product-img"><img src="${A(img)}" alt="${esc(data.name)} ${esc(theme.label.split('·').pop().trim())}"></div><div class="panel"><div class="idx">${esc(theme.label)}</div><h3>${esc(p.h || '')}</h3><p>${esc(p.p || '')}</p></div></article>`;
  }).join('');
};
const amMosaic = () => data.amenities.mosaic.map(m => `<figure><img src="${A(m.img)}" alt="${esc(data.name)} ${esc(m.cap)}"><figcaption>${esc(m.cap)}</figcaption></figure>`).join('');
const amList = () => data.amenities.list.map(a => `<div class="amenity" data-icon="${a.icon}"><strong>${esc(a.t)}</strong></div>`).join('');
const amSecondary = () => data.amenities.secondary.map(s => `<figure><img src="${A(s.img)}" alt="${esc(data.name)} ${esc(s.cap)}"><figcaption>${esc(s.cap)}</figcaption></figure>`).join('');
const commTags = () => data.community.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');
const commFacts = () => data.community.facts.map(f => `<div class="community-fact"><b>${esc(f.b)}</b><span>${esc(f.s)}</span></div>`).join('');
const unitCards = () => data.units.cards.map(c => `<article class="unit-card"><b>${esc(c.b)}<span>${esc(c.span)}</span></b><h3>${esc(c.h)}</h3>${c.rows.map(r => `<div class="row"><span>${esc(r.k)}</span><span>${esc(r.v)}</span></div>`).join('')}</article>`).join('');
const payLegend = () => data.units.payment.legend.map(l => `<span>${esc(l)}</span>`).join('');
const unitIntro = () => data.units.intro.map(p => `<p>${esc(p)}</p>`).join('');
const ovParas = () => data.overview.paras.map(p => `<p>${esc(p)}</p>`).join('');

// —— gallery JS：注入项目名 + 地图 ——
GALLERY_JS = GALLERY_JS
  .replaceAll('TALEA', data.name)
  .replace('q=Talea+Beyond,+Dubai+Maritime+City,+Dubai', data.location.mapQuery);

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(data.name)} ${esc(data.cn)} | 丹枫置业</title>
  <meta name="description" content="${esc(data.seo.desc)}">
  <link rel="canonical" href="https://danfengproperties.com/projects/${slug}">
  <meta property="og:title" content="${esc(data.name)} ${esc(data.cn)} | 丹枫置业">
  <meta property="og:description" content="${esc(data.seo.ogDesc)}">
  <meta property="og:image" content="https://danfengproperties.com/projects/${slug}/hero-aerial.webp">
${STYLES}
</head>
<body>
  <nav aria-label="项目章节导航"><div class="wrap nav-inner"><a class="brand" href="https://danfengproperties.com/" aria-label="丹枫置业 Danfeng Properties"><img class="brand-logo" src="https://danfengproperties.com/logo-horizontal.webp" alt="丹枫置业 Danfeng Properties"></a><div class="nav-links"><a href="#top">首页</a><a href="#gallery">影像</a><a href="#overview">概况</a><a href="#highlights">亮点</a><a href="#location">地段</a><a href="#product">产品</a><a href="#community">社区</a><a href="#developer">开发商</a><a href="#unit">户型</a><a href="#cta">咨询</a></div><details class="site-menu"><summary aria-label="打开网站导航" title="网站导航"><span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span></summary><div class="site-menu-panel"><a href="https://danfengproperties.com/">智能投顾</a><a href="https://danfengproperties.com/projects">精选项目</a><a href="https://danfengproperties.com/developers">开发商榜</a><a href="https://danfengproperties.com/communities">热门社区</a></div></details></div></nav>
  <header class="hero" id="top"><div class="wrap hero-grid"><div><div class="kicker">${esc(data.hero.kicker)}</div><h1>${esc(data.name)}<span>${esc([data.cn, data.hero.span].filter(Boolean).join(' · '))}</span></h1><div class="hero-en">${esc(data.hero.en)}</div><p class="hero-copy">${esc(data.hero.copy)}</p><div class="actions"><a class="btn btn-red" href="#cta">获取资料</a><a class="btn btn-paper" href="#gallery">浏览项目</a></div></div></div></header>
  <div class="facts"><div class="wrap facts-row">${facts()}</div></div>

  <section class="sec media" id="video"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Project Film &amp; Gallery</div><h2 class="title">影片与图片，<br><em>在同一个 Gallery 中浏览</em></h2></div></div><div class="media-grid reveal"><div class="gallery" id="gallery"><div class="gallery-main">${data.video && data.video.id ? `<iframe class="gallery-video" id="galleryVideo" loading="lazy" src="https://www.youtube-nocookie.com/embed/${esc(data.video.id)}?rel=0&amp;modestbranding=1" title="${esc(data.name)} 官方项目影片" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` : ''}<img id="galleryMain" src="${A(data.gallery[0].src)}" alt="${esc(data.name)} 项目效果图"${data.video && data.video.id ? ' hidden' : ''}><strong class="gallery-title" id="galleryTitle">${data.video && data.video.id ? '官方项目影片' : esc(data.gallery[0].title)}</strong><button class="gallery-control gallery-prev" type="button" id="galleryPrev" aria-label="上一项">‹</button><button class="gallery-control gallery-next" type="button" id="galleryNext" aria-label="下一项">›</button></div><div class="gallery-strip" aria-label="项目影片与图片缩略图">${galleryThumbs()}</div></div></div></div></section>

  <section class="sec" id="overview"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Overview</div><h2 class="title">${esc(data.overview.title)}<br><em>${esc(data.overview.em)}</em></h2></div></div><div class="overview-grid"><div class="overview-photo reveal"><img src="${A(data.overview.photo)}" alt="${esc(data.name)} 概况"></div><div class="overview-copy reveal"><div class="copy">${ovParas()}</div><div class="metrics">${metrics()}</div></div></div></div></section>

  <section class="sec alt" id="highlights"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Highlights</div><h2 class="title">五个关键词，<br><em>快速读懂项目</em></h2></div></div><div class="highlight-layout"><div class="highlight-photo reveal"><img src="${A(data.highlights.photo)}" alt="${esc(data.name)} 亮点"></div><div class="highlights reveal">${highlights()}</div></div></div></section>

  <section class="sec" id="location"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Location</div><h2 class="title">${esc(data.location.title)}<br><em>${esc(data.location.em)}</em></h2></div></div><div class="location-layout"><div class="map-live reveal"><iframe loading="lazy" title="${esc(data.name)} Google 地图位置" src="https://www.google.com/maps?q=${esc(data.location.mapCity)}&amp;z=${data.location.mapZoom || 12}&amp;output=embed" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="caption" style="padding:0 14px 14px">Google 地图 · ${esc(data.location.mapCity)} 在 Dubai 的区位</div></div><div class="location-side reveal${data.location.officialMap ? ' has-map' : ''}">${data.location.officialMap ? `<div class="official-map"><img src="${A(data.location.officialMap)}" alt="${esc(data.name)} 开发商官方区位图"><div class="caption">${esc(data.location.officialCaption || '')}</div></div>` : ''}<div class="distances">${distances()}</div></div></div></div></section>

  <section class="sec alt" id="product"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Product Design</div><h2 class="title">从建筑、空间到材料，<br><em>按五个主题看产品</em></h2></div></div><div class="products">${products()}</div></div></section>

  <section class="sec" id="amenities"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Amenities</div><h2 class="title">${esc(data.amenities.title)}<br><em>${esc(data.amenities.em)}</em></h2></div></div><div class="amenity-mosaic reveal">${amMosaic()}</div><div class="amenity-secondary reveal">${amSecondary()}</div><div class="amenity-list amenity-list-wide reveal">${amList()}</div></div></section>

  <section class="sec alt" id="community"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Community</div><h2 class="title">社区解读，指向<br><em>${esc(data.community.area)}</em></h2></div></div><div class="community-band reveal"><div class="community-image"><img src="https://danfengproperties.com/img/communities/${esc(data.community.slug)}/hero-1.webp" alt="${esc(data.community.area)} 社区横版景观"></div><div class="community-copy"><div class="community-main"><div class="eyebrow">${esc(data.community.em)}</div><h3>${esc(data.community.h)}</h3><p>${esc(data.community.p)}</p><div class="tags">${commTags()}</div><a class="btn" href="https://danfengproperties.com/communities/${esc(data.community.slug)}">查看 ${esc(data.community.area)} 社区详情</a></div></div></div></div></section>

  <section class="sec" id="developer"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Developer</div><h2 class="title">开发商 · <em>${esc(data.developer?.name || 'BEYOND')}</em></h2></div></div>${data.developer?.html || buildDevBlock(data.developer?.name || 'Beyond')}</div></section>

  <section class="sec alt" id="unit"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Units &amp; Timeline</div><h2 class="title">户型、面积、价格与<br><em>施工计划</em></h2></div></div><div class="unit-intro"><div class="copy reveal">${unitIntro()}</div><div class="unit-photo reveal"><img src="${A(data.units.photo)}" alt="${esc(data.name)} 起居空间"></div></div><div class="unit-cards reveal">${unitCards()}</div><div class="unit-disclosure reveal">${data.units.disclosure}</div><div class="payment reveal"><div class="pay-card"><h3>Payment · 付款结构</h3><div class="pay-big">${esc(data.units.payment.big)}</div><div class="pay-legend">${payLegend()}</div><p class="note">丹枫项目库历史整理口径。比例、日期与节点以开发商正式付款计划为准。</p></div><div class="schedule"><h3>Construction · 施工计划</h3><div class="schedule-row"><small>计划开工</small><strong>${esc(data.units.schedule.start)}</strong></div><div class="schedule-row"><small>计划交付</small><strong>${esc(data.units.schedule.handover)}</strong></div><p class="note">${esc(data.units.schedule.note)}</p></div></div></div></section>

  <section class="sec cta" id="cta"><div class="wrap cta-grid"><div class="reveal"><div class="eyebrow">下一步 · Next Step</div><h2 class="title" style="margin:16px 0">两个步骤，<br><em>先判断再咨询</em></h2><p class="cta-copy">丹枫置业以项目级信息展示和 AI 初筛为起点，帮助你先判断项目、社区、开发商与自身预算目标是否匹配，再进入真人顾问确认阶段。</p></div><div class="paths reveal"><article class="path"><div class="path-label">01 · AI ADVISOR</div><h3>AI 智能投顾</h3><p>1分钟，AI为您快速匹配项目、生成专属报告。</p><div class="path-qr"><img src="${A('danfeng-website-qr').replace('.webp', '')}.png" alt="丹枫 AI 智能投顾二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="https://danfengproperties.com/?ask=${slug}#console">对话 AI</a></article><article class="path"><div class="path-label">02 · PRIVATE ADVISOR</div><h3>咨询私人投顾</h3><p>微信，获取项目资料，房源信息和投资建议。</p><div class="path-qr"><img src="assets/danfeng-wechat-qr.png" alt="丹枫微信真人顾问二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="https://u.wechat.com/MBHeTbPUEaA4Wzeda66CFBo?s=2">咨询顾问</a></article></div></div></section>
  <footer><div class="wrap"><div class="foot-grid">
    <div class="foot-brand"><img src="https://danfengproperties.com/logo-horizontal.webp" alt="丹枫置业 Danfeng Properties"><p>Danfeng Properties 丹枫置业 · AI 驱动的中东房产智能投顾平台，服务全球华人高净值投资者。</p></div>
    <div class="foot-col"><h5>导航</h5><a href="https://danfengproperties.com/#console">智能投顾</a><a href="https://danfengproperties.com/projects">精选项目</a><a href="https://danfengproperties.com/developers">开发商榜</a><a href="https://danfengproperties.com/communities">热门社区</a><a href="https://danfengproperties.com/#contact">联系我们</a></div>
    <div class="foot-col foot-contact"><h5>联系我们</h5><div class="ci"><span class="k">地址</span><span class="v">Lake Central Tower #1703, Business Bay, Dubai, UAE</span></div><div class="ci"><span class="k">电话</span><a class="v" href="tel:+971508630266">+971 50 863 0266</a></div><div class="ci"><span class="k">WhatsApp</span><a class="v wa" href="https://wa.me/971508630266" target="_blank" rel="noopener noreferrer">+971 50 863 0266</a></div></div>
  </div><div class="foot-bottom"><div>© 2026 Danfeng Properties 丹枫置业. All rights reserved.</div><div>免责声明：本页面基于开发商官网、官方楼书、Factsheet、丹枫项目库及公开第三方资料整理，仅用于项目展示和初步了解，不构成购买建议、收益承诺、法律或税务意见。图片及影片为艺术效果和概念展示；设计、景观、材料、配置、面积、价格、付款计划、销售状态和交付时间以开发商正式文件、监管登记及最终合同为准。数据来源：DLD 迪拜土地局。页面更新：${esc(data.footerDate)}。</div></div></div></footer>
${GALLERY_JS}
</body>
</html>
`;

// —— 写 deliverables（相对图）——
const delivDir = join(REPO, 'deliverables', slug);
mkdirSync(delivDir, { recursive: true });
writeFileSync(join(delivDir, 'index.html'), html);

// —— 写 public（绝对图）——
const pubDir = join(WEB, 'public', 'projects', slug);
mkdirSync(pubDir, { recursive: true });
const htmlAbs = html.replaceAll('"assets/', `"/projects/${slug}/assets/`);
writeFileSync(join(pubDir, 'index.html'), htmlAbs);

// —— 登记 standalonePages ——
const spPath = join(WEB, 'lib', 'standalonePages.js');
let sp = readFileSync(spPath, 'utf8');
if (!sp.includes(`'${slug}'`)) {
  sp = sp.replace(/(export const STANDALONE_PROJECT_SLUGS = \[)([^\]]*)(\];)/, (m, a, list, c) => `${a}${list.trimEnd()}${list.trim().endsWith(',') || list.trim() === '' ? '' : ','} '${slug}'${c}`);
  writeFileSync(spPath, sp);
}

// —— 登记 publish 脚本 ITEM（若提供 mondayItemId 且未登记）——
if (data.mondayItemId) {
  const pubShPath = join(__dir, 'publish-landing.sh');
  let psh = readFileSync(pubShPath, 'utf8');
  if (!new RegExp(`\\b${slug}\\)\\s+ITEM_ID=`).test(psh)) {
    psh = psh.replace(/(\n)([ \t]*\*\)\s+ITEM_ID="" ;;)/, `$1  ${slug})${' '.repeat(Math.max(1, 7 - slug.length))}ITEM_ID=${data.mondayItemId} ;;\n$2`);
    writeFileSync(pubShPath, psh);
  }
}

// —— 复制 assets 到 public（放最后 + 容错：沙箱 fuse 可能 EACCES，不影响登记）——
const assetsSrc = join(delivDir, 'assets');
let assetsCopied = false;
if (existsSync(assetsSrc)) {
  try { cpSync(assetsSrc, join(pubDir, 'assets'), { recursive: true, force: true }); assetsCopied = true; }
  catch (e) { console.warn(`  ⚠ assets 自动复制失败(${e.code})，请手动: cp -r deliverables/${slug}/assets danfeng-web/public/projects/${slug}/`); }
}

console.log(`✅ 生成完成: ${slug}${assetsCopied ? '' : '（assets 待手动复制）'}`);
console.log(`   deliverables/${slug}/index.html（预览）`);
console.log(`   public/projects/${slug}/index.html（部署）`);
console.log(`   已登记 standalonePages${data.mondayItemId ? ' + publish ITEM' : ''}`);
console.log(`   上线: MONDAY_TOKEN=xx bash danfeng-web/scripts/publish-landing.sh ${slug} upload`);
