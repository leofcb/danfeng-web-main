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

// —— 开发商默认块（Beyond；JSON.developer 可整段覆盖 html 字段）——
const BEYOND_DEV = `<div class="developer-layout"><div class="developer-copy reveal"><div class="dev-heading"><img class="dev-logo" src="https://danfengproperties.com/img/developers/beyond/logo.webp" alt="BEYOND 开发商标志"><div class="dev-name">OMNIYAT GROUP 旗下高端地产品牌<span>AN OMNIYAT GROUP COMPANY</span></div></div><p>BEYOND 为 OMNIYAT GROUP 旗下高端地产品牌，2024 年成立，强调设计、自然与品质生活。集团背景有助于品牌、资源和产品组织，但不能替代对项目主体、施工进度与最终交付标准的核验。</p><div class="dev-score"><b>71.3</b><span>DFP-5 v3.1 · 4 枫叶<br>置信度 Medium · 覆盖率 70%</span></div><div class="dev-facts"><div class="dev-fact"><small>2026 年销售额</small><strong>AED 6.7B</strong></div><div class="dev-fact"><small>DXB 综合排名</small><strong>第 8</strong></div><div class="dev-fact"><small>近 12 月成交</small><strong>1,269 套</strong></div><div class="dev-fact"><small>在建规模</small><strong>6,824 套</strong></div><div class="dev-fact"><small>在建项目</small><strong>10 个</strong></div><div class="dev-fact"><small>已交付记录</small><strong>0 个</strong></div></div><p class="data-note">来源：丹枫开发商数据库、迪拜土地局（DLD）。销售数据截至 2026-07-04；DFP-5 评级日期 2026-07-09。内部评级仅供研究参考。</p><a class="btn btn-dark" href="https://danfengproperties.com/developers/beyond">查看 BEYOND 详情与完整评级</a></div></div>`;

// —— 各区块构建 ——
const facts = () => data.facts.map(f => `<div class="fact"><small>${esc(f.k)}</small><strong>${esc(f.v)}</strong>${f.em ? `<em>${esc(f.em)}</em>` : ''}</div>`).join('');

const galleryThumbs = () => {
  const vid = `<button class="thumb thumb-video active" type="button" data-type="video" data-title="官方项目影片"><img src="${A(data.gallery[0].src)}" alt="播放官方项目影片"><span>官方影片</span></button>`;
  const imgs = data.gallery.map(g => `<button class="thumb" type="button" data-type="image" data-src="${A(g.src)}" data-title="${esc(g.title)}"><img src="${A(g.src)}" alt="${esc(g.title)}"><span>${esc(g.span || g.title)}</span></button>`).join('');
  return vid + imgs;
};

const metrics = () => data.overview.metrics.map(m => `<div class="metric"><b>${esc(m.n)}<span>${esc(m.u)}</span></b><p>${esc(m.p)}</p></div>`).join('');
const highlights = () => data.highlights.items.map(h => `<article class="highlight"><b>${esc(h.b)}</b><div><h3>${esc(h.h)}</h3><p>${esc(h.p)}</p></div></article>`).join('');
const distances = () => data.location.distances.map(d => `<div class="distance"><b>${esc(d.t)}</b><span>${esc(d.p)}</span></div>`).join('');
const products = () => data.product.map(p => `<article class="product reveal"><div class="product-img"><img src="${A(p.img)}" alt="${esc(data.name)} ${esc(p.tag.split('·').pop().trim())}"></div><div class="panel"><div class="idx">${esc(p.tag)}</div><h3>${esc(p.h)}</h3><p>${esc(p.p)}</p></div></article>`).join('');
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
  <nav aria-label="项目章节导航"><div class="wrap nav-inner"><a class="brand" href="https://danfengproperties.com/"><svg class="brandmark" viewBox="0 0 40 40" aria-hidden="true"><rect class="r" x="3" y="3" width="16" height="16"/><rect class="rd" x="21" y="3" width="16" height="16"/><rect class="r" x="3" y="21" width="16" height="16"/><rect class="g" x="21" y="21" width="16" height="16"/></svg><span>丹枫置业<small>DANFENG PROPERTIES</small></span></a><div class="nav-links"><a href="#top">首页</a><a href="#gallery">影像</a><a href="#overview">概况</a><a href="#highlights">亮点</a><a href="#location">地段</a><a href="#product">产品</a><a href="#community">社区</a><a href="#developer">开发商</a><a href="#unit">户型</a><a href="#cta">咨询</a></div><details class="site-menu"><summary aria-label="打开网站导航" title="网站导航"><span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span></summary><div class="site-menu-panel"><a href="https://danfengproperties.com/">智能投顾</a><a href="https://danfengproperties.com/projects">精选项目</a><a href="https://danfengproperties.com/developers">开发商榜</a><a href="https://danfengproperties.com/communities">热门社区</a></div></details></div></nav>
  <header class="hero" id="top"><div class="wrap hero-grid"><div><div class="kicker">${esc(data.hero.kicker)}</div><h1>${esc(data.cn)}<span>${esc(data.hero.span)}</span></h1><div class="hero-en">${esc(data.hero.en)}</div><p class="hero-copy">${esc(data.hero.copy)}</p><div class="actions"><a class="btn btn-red" href="#cta">获取资料</a><a class="btn btn-paper" href="#gallery">浏览项目</a></div></div></div></header>
  <div class="facts"><div class="wrap facts-row">${facts()}</div></div>

  <section class="sec media" id="video"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Project Film &amp; Gallery</div><h2 class="title">影片与图片，<br><em>在同一个 Gallery 中浏览</em></h2></div></div><div class="media-grid reveal"><div class="gallery" id="gallery"><div class="gallery-main"><iframe class="gallery-video" id="galleryVideo" loading="lazy" src="https://www.youtube-nocookie.com/embed/${esc(data.video.id)}?rel=0&amp;modestbranding=1" title="${esc(data.name)} 官方项目影片" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe><img id="galleryMain" src="${A(data.gallery[0].src)}" alt="${esc(data.name)} 项目效果图" hidden><strong class="gallery-title" id="galleryTitle">官方项目影片</strong><button class="gallery-control gallery-prev" type="button" id="galleryPrev" aria-label="上一项">‹</button><button class="gallery-control gallery-next" type="button" id="galleryNext" aria-label="下一项">›</button></div><div class="gallery-strip" aria-label="项目影片与图片缩略图">${galleryThumbs()}</div></div></div></div></section>

  <section class="sec" id="overview"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Overview</div><h2 class="title">${esc(data.overview.title)}<br><em>${esc(data.overview.em)}</em></h2></div></div><div class="overview-grid"><div class="overview-photo reveal"><img src="${A(data.overview.photo)}" alt="${esc(data.name)} 概况"></div><div class="overview-copy reveal"><div class="copy">${ovParas()}</div><div class="metrics">${metrics()}</div></div></div></div></section>

  <section class="sec alt" id="highlights"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Highlights</div><h2 class="title">五个关键词，<br><em>快速读懂项目</em></h2></div></div><div class="highlight-layout"><div class="highlight-photo reveal"><img src="${A(data.highlights.photo)}" alt="${esc(data.name)} 亮点"></div><div class="highlights reveal">${highlights()}</div></div></div></section>

  <section class="sec" id="location"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Location</div><h2 class="title">${esc(data.location.title)}<br><em>${esc(data.location.em)}</em></h2></div></div><div class="location-layout"><div class="map-live reveal"><iframe loading="lazy" title="${esc(data.name)} Google 地图位置" src="https://www.google.com/maps?q=${esc(data.location.mapCity)}&amp;z=${data.location.mapZoom || 12}&amp;output=embed" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="caption" style="padding:0 14px 14px">Google 地图 · ${esc(data.location.mapCity)} 在 Dubai 的区位</div></div><div class="location-side reveal"><div class="official-map"><img src="${A('location-map')}" alt="${esc(data.name)} 开发商官方区位图"><div class="caption">${esc(data.location.officialCaption)}</div></div><div class="distances">${distances()}</div></div></div></div></section>

  <section class="sec alt" id="product"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Product Design</div><h2 class="title">从建筑、空间到材料，<br><em>按五个主题看产品</em></h2></div></div><div class="products">${products()}</div></div></section>

  <section class="sec" id="amenities"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Amenities</div><h2 class="title">${esc(data.amenities.title)}<br><em>${esc(data.amenities.em)}</em></h2></div></div><div class="amenity-layout"><div class="amenity-mosaic reveal">${amMosaic()}</div><div class="amenity-list reveal">${amList()}</div></div><div class="amenity-secondary reveal">${amSecondary()}</div></div></section>

  <section class="sec alt" id="community"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Community</div><h2 class="title">社区解读，指向<br><em>${esc(data.community.area)}</em></h2></div></div><div class="community-band reveal"><div class="community-image"><img src="https://danfengproperties.com/img/communities/${esc(data.community.slug)}/hero-1.webp" alt="${esc(data.community.area)} 社区横版景观"></div><div class="community-copy"><div class="community-main"><div class="eyebrow">${esc(data.community.em)}</div><h3>${esc(data.community.h)}</h3><p>${esc(data.community.p)}</p><div class="tags">${commTags()}</div><a class="btn" href="https://danfengproperties.com/communities/${esc(data.community.slug)}">查看 ${esc(data.community.area)} 社区详情</a></div></div><div class="community-facts">${commFacts()}</div></div></div></section>

  <section class="sec" id="developer"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Developer</div><h2 class="title">开发商 · <em>${esc(data.developer?.name || 'BEYOND')}</em></h2></div></div>${data.developer?.html || BEYOND_DEV}</div></section>

  <section class="sec alt" id="unit"><div class="wrap"><div class="section-head reveal"><div><div class="eyebrow">Units &amp; Timeline</div><h2 class="title">户型、面积、价格与<br><em>施工计划</em></h2></div></div><div class="unit-intro"><div class="copy reveal">${unitIntro()}</div><div class="unit-photo reveal"><img src="${A(data.units.photo)}" alt="${esc(data.name)} 起居空间"></div></div><div class="unit-cards reveal">${unitCards()}</div><div class="unit-disclosure reveal">${data.units.disclosure}</div><div class="payment reveal"><div class="pay-card"><h3>Payment · 付款结构</h3><div class="pay-big">${esc(data.units.payment.big)}</div><div class="pay-legend">${payLegend()}</div><p class="note">丹枫项目库历史整理口径。比例、日期与节点以开发商正式付款计划为准。</p></div><div class="schedule"><h3>Construction · 施工计划</h3><div class="schedule-row"><small>计划开工</small><strong>${esc(data.units.schedule.start)}</strong></div><div class="schedule-row"><small>计划交付</small><strong>${esc(data.units.schedule.handover)}</strong></div><p class="note">${esc(data.units.schedule.note)}</p></div></div></div></section>

  <section class="sec cta" id="cta"><div class="wrap cta-grid"><div class="reveal"><div class="eyebrow">下一步 · Next Step</div><h2 class="title" style="margin:16px 0">两个步骤，<br><em>先判断再咨询</em></h2><p class="cta-copy">丹枫置业以项目级信息展示和 AI 初筛为起点，帮助你先判断项目、社区、开发商与自身预算目标是否匹配，再进入真人顾问确认阶段。</p></div><div class="paths reveal"><article class="path"><div class="path-label">01 · AI ADVISOR</div><h3>AI 智能投顾</h3><p>1分钟，AI为您快速匹配房产项目、生成专属投资报告。</p><div class="path-qr"><img src="${A('danfeng-website-qr').replace('.webp', '')}.png" alt="丹枫 AI 智能投顾二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="https://danfengproperties.com/?ask=${slug}#console">对话 AI</a></article><article class="path"><div class="path-label">02 · PRIVATE ADVISOR</div><h3>咨询私人投顾</h3><p>微信，获取项目资料，房源信息和投资建议。</p><div class="path-qr"><img src="assets/danfeng-wechat-qr.png" alt="丹枫微信真人顾问二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="https://u.wechat.com/MBHeTbPUEaA4Wzeda66CFBo?s=2">咨询顾问</a></article></div></div></section>
  <footer><div class="wrap foot"><div class="foot-brand"><svg class="brandmark" viewBox="0 0 40 40" aria-hidden="true"><rect class="r" x="3" y="3" width="16" height="16"/><rect class="rd" x="21" y="3" width="16" height="16"/><rect class="r" x="3" y="21" width="16" height="16"/><rect class="g" x="21" y="21" width="16" height="16"/></svg>DANFENG PROPERTIES</div><p class="disclaimer">免责声明：本页面基于开发商官网、官方楼书、Factsheet、丹枫项目库及公开第三方资料整理，仅用于项目展示和初步了解，不构成购买建议、收益承诺、法律或税务意见。图片及影片为艺术效果和概念展示；设计、景观、材料、配置、面积、价格、付款计划、销售状态和交付时间以开发商正式文件、监管登记及最终合同为准。页面更新：${esc(data.footerDate)}。</p></div></footer>
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
