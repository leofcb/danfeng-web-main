#!/usr/bin/env node
// ============================================================
// 社区落地页生成器（WEB-COMM-V1）
// 用法：node danfeng-web/scripts/communities/gen-community.mjs <slug>
//   读 scripts/communities/<slug>.json（内容官按社区库 + 官方资料填好）
//   → 生成 deliverables/communities/<slug>/index.html（相对图，双击预览）
//   → 生成 public/communities/<slug>/index.html（绝对图，随站点部署）
//   → 自动登记 lib/standalonePages.js 的 STANDALONE_COMMUNITY_SLUGS
// 静态外壳（CSS + reveal/nav JS）来自 scripts/communities/_comm-styles.html。
// 10 段固定顺序：①Hero ②社区画像 ③社区大数据+子项目 ④位置交通(地图+距离)
//   ⑤社区配套 ⑥生活方式 ⑦活跃开发商 ⑧精选项目 ⑨相似社区 ⑩CTA
// 护栏：参考价/ROI 一律「公开行情参考(Bayut·PF·DXB)·非丹枫报价·历史行情参考·非预期收益承诺」；
//   绝不出 🔒 市场列(Median PSF/Sold%/Transactions/Gross Yield/Thin Market)；无图用象牙白艺术兜底。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));        // danfeng-web/scripts/communities
const WEB = join(__dir, '..', '..');                          // danfeng-web
const REPO = join(WEB, '..');                                 // 项目根

const slug = process.argv[2];
if (!slug) { console.error('用法: node scripts/communities/gen-community.mjs <slug>'); process.exit(1); }

const data = JSON.parse(readFileSync(join(__dir, `${slug}.json`), 'utf8'));
const STYLES = readFileSync(join(__dir, '_comm-styles.html'), 'utf8').trimEnd();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const A = (name) => `assets/${name}`;
const has = (x) => Array.isArray(x) ? x.length > 0 : (x != null && x !== '' && (typeof x !== 'object' || Object.keys(x).length > 0));

// —— 导航锚点 ——
const navItems = [['#top', '首页'], ['#profile', '画像'], ['#data', '数据'], ['#location', '位置'], ['#amenities', '配套'], ['#lifestyle', '生活'], ['#developers', '开发商'], ['#projects', '项目']];
if (has(data.similar)) navItems.push(['#similar', '相似']);
navItems.push(['#cta', '咨询']);
const navLinks = navItems.map(([h, t]) => `<a href="${h}">${t}</a>`).join('');

// ① Hero（img 支持绝对 URL / 本地 assets）
const imgURL = (x) => !x ? '' : (String(x).startsWith('http') || String(x).startsWith('/') ? x : A(x));
const h = data.hero || {};
const heroClass = h.img ? 'hero has-img' : 'hero';
const heroStyle = h.img ? ` style="--heroimg:url('${imgURL(h.img)}')"` : '';
const heroSection = `<header class="${heroClass}" id="top"${heroStyle}><div class="wrap hero-grid"><div>${data.isHot ? '<span class="hot">🔥 热门片区</span>' : ''}<div class="kicker">${esc(h.kicker || '社区 · Community')}</div><h1>${esc(data.name)}<em>${esc(data.cn)}</em></h1><div class="hero-en">${esc(h.en)}</div><p class="hero-copy">${esc(h.copy)}</p><div class="actions"><a class="btn btn-red" href="#cta">问 AI 这个片区适合我吗</a><a class="btn btn-paper" href="#projects">看在售项目</a></div></div></div></header>`;

// 数据栏
const factsBar = `<div class="facts"><div class="wrap facts-row">${(data.facts || []).map(f => `<div class="fact"><small>${esc(f.k)}</small><strong>${esc(f.v)}</strong>${f.em ? `<em>${esc(f.em)}</em>` : ''}</div>`).join('')}</div></div>`;

// ② 社区画像
const pf = data.profile || {};
const profileSection = `<section class="sec alt" id="profile"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Community Profile · 片区画像</div><h2 class="title">${esc(pf.title || '读懂 ' + data.name)}，<em>${esc(pf.em || '先看片区')}</em></h2></div><div class="profile-grid"><div class="copy reveal">${(pf.blurb || []).map(p => `<p>${esc(p)}</p>`).join('')}<div class="tags">${(pf.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div></div><div class="id-metrics reveal">${(pf.identity || []).map(m => `<div class="id-metric"><small>${esc(m.k)}</small><strong>${esc(m.v)}</strong></div>`).join('')}</div></div></div></section>`;

// ③ 社区大数据（社区级市场数据，来源迪拜土地局 DLD；回报率用社区级毛收益，非户型ROI）
const d = data.data || {};
const yoyCls = (y) => y == null ? '' : (Number(y) > 0 ? ' up' : (Number(y) < 0 ? ' dn' : ''));
const yoyTxt = (y) => y == null ? '' : `<span class="yoy${yoyCls(y)}">同比 ${Number(y) > 0 ? '+' : ''}${esc(y)}${y && String(y).includes('pp') ? '' : '%'}</span>`;
const mstats = (d.market || []).map(m => `<div class="mstat"><div class="v"><b>${esc(m.v)}</b>${m.u ? `<span class="u">${esc(m.u)}</span>` : ''}${m.yoy != null ? `<span class="yoy${yoyCls(m.yoyDir != null ? m.yoyDir : m.yoy)}">${esc(m.yoy)}</span>` : ''}</div><small>${esc(m.k)}</small></div>`).join('');
const dataSection = `<section class="sec" id="data"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Market Data · 片区市场数据</div><h2 class="title">${esc(d.title || data.name + ' 市场概览')}，<em>${esc(d.em || '来自迪拜土地局')}</em></h2></div><div class="market-grid reveal">${mstats}</div><p class="market-src reveal">${esc(d.note)}</p></div></section>`;

// ④ 位置交通
const loc = data.location || {};
const distances = (loc.distances || []).map(x => `<div class="distance"><b>${esc(x.t)}</b><span>${esc(x.p)}</span></div>`).join('');
const locationSection = `<section class="sec alt" id="location"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Location · 位置交通</div><h2 class="title">地段与通达，<em>到核心区多久</em></h2></div><div class="location-layout"><div class="map-live reveal"><iframe loading="lazy" title="${esc(data.name)} 地图位置" src="https://www.google.com/maps?q=${esc(loc.mapQuery || data.name + ', Dubai')}&amp;z=${loc.mapZoom || 13}&amp;output=embed" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="caption" style="padding:12px 14px">Google 地图 · ${esc(data.name)} 在 Dubai 的区位</div></div><div class="reveal"><div class="distances">${distances}</div>${loc.transit ? `<p class="transit">${esc(loc.transit)}</p>` : ''}</div></div></div></section>`;

// ⑤ 社区配套（图文视觉卡，有 img 用图、无图用图标艺术兜底）
const amenityCards = (data.amenities || []).map(a => `<div class="acard"><div class="acard-img${a.img ? ' ph' : ''}">${a.img ? `<img src="${A(a.img)}" alt="${esc(a.h)}">` : `<span class="acard-ico">${esc(a.ico || '🏙')}</span>`}</div><div class="acard-bd"><h3>${esc(a.h)}</h3><div class="en">${esc(a.en)}</div><ul>${(a.items || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul></div></div>`).join('');
const amenitiesSection = has(data.amenities) ? `<section class="sec" id="amenities"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Amenities · 社区配套</div><h2 class="title">生活配套，<em>就在步行范围</em></h2></div><div class="amenity-grid reveal">${amenityCards}</div></div></section>` : '';

// ⑥ 生活方式（图文视觉卡）
const lifeItems = (data.lifestyle || []).map((l, i) => `<article class="lcard"><div class="lcard-img">${l.img ? `<img src="${A(l.img)}" alt="${esc(l.h || '生活方式')}">` : `<span class="n">${String(i + 1).padStart(2, '0')}</span>`}</div><div class="lcard-bd"><h3>${esc(l.h || '')}</h3><p>${esc(l.p)}</p></div></article>`).join('');
const lifestyleSection = has(data.lifestyle) ? `<section class="sec alt" id="lifestyle"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Lifestyle · 生活方式</div><h2 class="title">住在这里，<em>是一种怎样的日常</em></h2></div><div class="life-grid reveal">${lifeItems}</div></div></section>` : '';

// ⑦ 活跃开发商（首页式图文卡：logo + DFP-5 评级 + 基础数据）
const devLogo = (dv) => dv.logo === false ? '' : (dv.logo || `https://danfengproperties.com/img/developers/${esc(dv.slug)}/logo.webp`);
const devCards = (data.developers || []).map(dv => {
  const lg = devLogo(dv);
  const logoHtml = lg ? `<img src="${esc(lg)}" alt="${esc(dv.name)} 标志">` : `<span class="dcard-mono">${esc(dv.name)}</span>`;
  const rating = dv.leaves ? `<div class="dcard-rating"><span class="lv">🍁 ${esc(dv.leaves)}</span><span class="sc">DFP-5 ${esc(dv.score)}</span></div>` : `<div class="dcard-rating nr">未评级 NR</div>`;
  const stats = `<div class="dcard-stats">${dv.rank ? `迪拜排名 <b>#${esc(dv.rank)}</b> · ` : ''}本区 <b>${esc(dv.count)}</b> 个在售项目</div>`;
  const inner = `<div class="dcard-logo">${logoHtml}</div><div class="n">${esc(dv.name)}</div>${dv.cn ? `<div class="cn">${esc(dv.cn)}</div>` : ''}${rating}${stats}<div class="go">查看开发商评级 ›</div>`;
  return dv.slug ? `<a class="dcard" href="https://danfengproperties.com/developers/${esc(dv.slug)}">${inner}</a>` : `<div class="dcard">${inner}</div>`;
}).join('');
const developersSection = has(data.developers) ? `<section class="sec" id="developers"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Active Developers · 活跃开发商</div><h2 class="title">谁在这里建，<em>点开看开发商评级</em></h2></div><div class="dev-grid reveal">${devCards}</div></div></section>` : '';

// ⑧ 精选项目（图文富数据卡，参考首页 ProjectCard）
const pj = data.projects || {};
const projCards = (pj.cards || []).map(c => {
  const so = /sold|售罄/i.test(c.status || '');
  const statusLabel = so ? '已售罄' : (/coming|即将/i.test(c.status || '') ? '即将开盘' : '在售');
  const media = c.img ? `<div class="pcard-media"><img src="${A(c.img)}" alt="${esc(c.name)}"></div>` : '';
  const price = c.price ? `<div class="pcard-price">${esc(c.price)} <em>${esc(c.priceNote || '示意 · 非实时报价')}</em></div>` : '';
  const meta = `<div class="pcard-meta"><div class="pcard-m"><span>🏠</span>${esc(c.types || '公寓')}${c.beds ? ' · ' + esc(c.beds) : ''}</div><div class="pcard-m"><span>📅</span>交付 ${esc(c.handover || '待定')}</div></div>`;
  const tags = has(c.tags) ? `<div class="pcard-tags">${c.tags.map(t => `<span class="pcard-tag">#${esc(t)}</span>`).join('')}</div>` : '';
  return `<a class="pcard" href="${esc(c.href)}">${media}<div class="pcard-bd"><div class="pcard-head"><span class="pcard-status ${so ? 'so' : ''}">${statusLabel}</span><span class="pcard-emi">${esc(c.pill)}</span></div><h3 class="pcard-name">${esc(c.name)}</h3>${c.cn ? `<div class="pcard-cn">${esc(c.cn)}</div>` : ''}<div class="pcard-loc">${esc(data.name)} · ${esc(c.pill)}</div>${meta}${price}${tags}<div class="pcard-cta"><span class="go">查看项目详情 ›</span></div></div></a>`;
}).join('');
const projMore = pj.moreHref ? `<a class="pcard more" href="${esc(pj.moreHref)}"><div class="pcard-bd"><h3 class="pcard-name" style="margin:0">更多在售项目</h3><p style="color:var(--muted);font-size:13px;margin:10px 0 14px">浏览 ${esc(data.name)} 全部${pj.moreCount ? ' ' + esc(pj.moreCount) + ' 个' : ''}项目</p><span class="go" style="color:var(--red);font-weight:800;font-size:12px">前往精选项目 ›</span></div></a>` : '';
const projectsSection = `<section class="sec alt" id="projects"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Featured Projects · 精选项目</div><h2 class="title">${esc(data.name)} <em>代表在售项目</em></h2></div><div class="pcard-grid reveal">${projCards}${projMore}</div></div></section>`;

// ⑨ 相似社区（图文卡，参考首页 CommunityCard；有 img 显图，无图渐变兜底）
const similarCards = (data.similar || []).map(s => {
  const media = s.img ? `<div class="scard-img"><img src="${s.img.startsWith('http') ? esc(s.img) : A(s.img)}" alt="${esc(s.cn)} 社区"></div>` : '';
  return `<a class="scard" href="${esc(s.href)}">${media}<div class="scard-bd"><div class="n">${esc(s.cn)}</div><div class="cn">${esc(s.en)}</div><p>${esc(s.blurb || '')}</p><span class="go">查看社区详情 ›</span></div></a>`;
}).join('');
const similarSection = has(data.similar) ? `<section class="sec" id="similar"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Similar · 相似社区</div><h2 class="title">调性相近的，<em>其他片区</em></h2></div><div class="simgrid reveal">${similarCards}</div></div></section>` : '';

// ⑩ CTA
const ctaSection = `<section class="sec cta" id="cta"><div class="wrap cta-grid"><div class="reveal"><div class="eyebrow">下一步 · Next Step</div><h2 class="title" style="margin:16px 0;color:#fff">这个片区，<br><em>究竟适不适合你</em></h2><p class="cta-copy">丹枫置业以片区画像与公开行情参考为起点，帮你先判断地段、调性、预算与目标是否匹配，再进入真人顾问确认实盘与真实报价。透明、专业、不催单。</p></div><div class="paths reveal"><article class="path"><div class="path-label">01 · AI ADVISOR</div><h3>AI 智能投顾</h3><p>1分钟，AI 结合 ${esc(data.name)} 画像与公开行情，判断该片区是否适合你、生成专属报告。</p><div class="path-qr"><img src="${A('danfeng-website-qr.png')}" alt="丹枫 AI 智能投顾二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="https://danfengproperties.com/?ask=${slug}#console">对话 AI</a></article><article class="path"><div class="path-label">02 · PRIVATE ADVISOR</div><h3>咨询私人投顾</h3><p>微信，获取 ${esc(data.name)} 片区实盘、真实房态与投资建议。</p><div class="path-qr"><img src="${A('danfeng-wechat-qr.png')}" alt="丹枫微信真人顾问二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="${esc(data.wechatHref || 'https://u.wechat.com/MBHeTbPUEaA4Wzeda66CFBo?s=2')}">咨询顾问</a></article></div></div></section>`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(data.name)} ${esc(data.cn)} · 社区画像与在售项目 | 丹枫置业</title>
  <meta name="description" content="${esc(data.seo?.desc)}">
  <link rel="canonical" href="https://danfengproperties.com/communities/${slug}">
  <meta property="og:title" content="${esc(data.name)} ${esc(data.cn)} · 社区画像与在售项目 | 丹枫置业">
  <meta property="og:description" content="${esc(data.seo?.ogDesc)}">
${STYLES}
</head>
<body>
  <nav aria-label="社区页导航"><div class="wrap nav-inner"><a class="brand" href="https://danfengproperties.com/"><svg class="brandmark" viewBox="0 0 40 40" aria-hidden="true"><rect class="r" x="3" y="3" width="16" height="16"/><rect class="rd" x="21" y="3" width="16" height="16"/><rect class="r" x="3" y="21" width="16" height="16"/><rect class="g" x="21" y="21" width="16" height="16"/></svg><span>丹枫置业<small>DANFENG PROPERTIES</small></span></a><div class="nav-links">${navLinks}</div><details class="site-menu"><summary aria-label="打开网站导航" title="网站导航"><span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span></summary><div class="site-menu-panel"><a href="https://danfengproperties.com/">智能投顾</a><a href="https://danfengproperties.com/projects">精选项目</a><a href="https://danfengproperties.com/developers">开发商榜</a><a href="https://danfengproperties.com/communities">热门社区</a></div></details></div></nav>

  ${heroSection}
  ${factsBar}

  ${profileSection}

  ${dataSection}

  ${locationSection}

  ${amenitiesSection}

  ${lifestyleSection}

  ${developersSection}

  ${projectsSection}

  ${similarSection}

  ${ctaSection}

  <footer><div class="wrap foot"><div class="foot-brand"><svg class="brandmark" viewBox="0 0 40 40" aria-hidden="true"><rect class="r" x="3" y="3" width="16" height="16"/><rect class="rd" x="21" y="3" width="16" height="16"/><rect class="r" x="3" y="21" width="16" height="16"/><rect class="g" x="21" y="21" width="16" height="16"/></svg>DANFENG PROPERTIES</div><p class="disclaimer">免责声明：本页社区画像、配套与生活方式基于公开资料与丹枫研究整理；社区市场数据来源迪拜土地局（DLD），为片区级历史行情参考、非收益承诺；项目起价为开盘示意、非实时报价；具体房源、实时价格与房态由丹枫持牌顾问及开发商正式文件确认。页面更新：${esc(data.footerDate)}。</p></div></footer>

  <script>
    const ro=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');ro.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>ro.observe(el));
    const nl=[...document.querySelectorAll('.nav-links a')];
    const ns=nl.map(l=>document.querySelector(l.getAttribute('href'))).filter(Boolean);
    const no=new IntersectionObserver(es=>{es.forEach(e=>{if(!e.isIntersecting)return;nl.forEach(l=>l.classList.toggle('active',l.getAttribute('href')===\`#\${e.target.id}\`))})},{rootMargin:'-20% 0px -68% 0px'});
    ns.forEach(s=>no.observe(s));
  </script>
</body>
</html>
`;

// 写 deliverables（相对图）
const delivDir = join(REPO, 'deliverables', 'communities', slug);
mkdirSync(delivDir, { recursive: true });
writeFileSync(join(delivDir, 'index.html'), html);

// 写 public（绝对图）
const pubDir = join(WEB, 'public', 'communities', slug);
mkdirSync(pubDir, { recursive: true });
const htmlAbs = html.replaceAll('"assets/', `"/communities/${slug}/assets/`).replaceAll("url('assets/", `url('/communities/${slug}/assets/`);
writeFileSync(join(pubDir, 'index.html'), htmlAbs);

// 登记 standalonePages（STANDALONE_COMMUNITY_SLUGS，缺则创建）
const spPath = join(WEB, 'lib', 'standalonePages.js');
let sp = readFileSync(spPath, 'utf8');
if (!/STANDALONE_COMMUNITY_SLUGS/.test(sp)) {
  sp += `\n// 采用 WEB-COMM-V1 独立 HTML 母版、静态托管于 public/communities/<slug>/index.html 的社区 slug。\n// 从 Next SSG [slug] 路由排除，并由 next.config beforeFiles 重写到静态 index.html。\nexport const STANDALONE_COMMUNITY_SLUGS = ['${slug}'];\n`;
  writeFileSync(spPath, sp);
} else if (!new RegExp(`STANDALONE_COMMUNITY_SLUGS[^\\]]*'${slug}'`).test(sp)) {
  sp = sp.replace(/(export const STANDALONE_COMMUNITY_SLUGS = \[)([^\]]*)(\];)/, (m, a, list, c) => `${a}${list.trimEnd()}${list.trim().endsWith(',') || list.trim() === '' ? '' : ','} '${slug}'${c}`);
  writeFileSync(spPath, sp);
}

// 复制 assets 到 public（容错）
const assetsSrc = join(delivDir, 'assets');
let assetsCopied = false;
if (existsSync(assetsSrc)) {
  try { cpSync(assetsSrc, join(pubDir, 'assets'), { recursive: true, force: true }); assetsCopied = true; }
  catch (e) { console.warn(`  ⚠ assets 复制失败(${e.code})，手动: cp -r deliverables/communities/${slug}/assets danfeng-web/public/communities/${slug}/`); }
}

console.log(`✅ 社区页生成完成: ${slug}${assetsCopied ? '' : '（assets 待手动复制/或无 assets）'}`);
console.log(`   deliverables/communities/${slug}/index.html（预览）`);
console.log(`   public/communities/${slug}/index.html（部署）`);
console.log(`   已登记 standalonePages.STANDALONE_COMMUNITY_SLUGS`);
console.log(`   接入：next.config.mjs 重写 + app/communities/[slug]/page.jsx 排除守卫（一次性，见 README）`);
console.log(`   上线：本机 npm run build && vercel --prod`);
