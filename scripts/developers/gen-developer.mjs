#!/usr/bin/env node
// ============================================================
// 开发商页生成器（WEB-DEV-V1 · 评级前置定稿版）
// 用法：node danfeng-web/scripts/developers/gen-developer.mjs <slug>
//   读 scripts/developers/<slug>.json（内容官按开发商库 + 官网填好的数据）
//   → 生成 deliverables/developers/<slug>/index.html（相对图，双击预览）
//   → 生成 public/developers/<slug>/index.html（绝对图，随站点部署）
//   → 自动登记 lib/standalonePages.js 的 STANDALONE_DEVELOPER_SLUGS
// 静态外壳（CSS + reveal/nav JS）来自 scripts/developers/_dev-styles.html。
// 固定段顺序（锁版）：①Hero ②数据栏 ③评级速览(前置) ④品牌理念 ⑤品牌支柱
//   ⑥历史战绩TrackRecord(DXB战绩+五维拆解) ⑦代表作品 ⑧在售项目 ⑨CTA
// 弹性段（有数据才出）：milestone 发展里程 / communities 开发社区 / special 特别补充
// 护栏：绝不写具体现价/剩余套数/折扣/CRM/人工星评/Tier；资本增值标「历史」；d维用「合规」口径。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));        // danfeng-web/scripts/developers
const WEB = join(__dir, '..', '..');                          // danfeng-web
const REPO = join(WEB, '..');                                 // 项目根

const slug = process.argv[2];
if (!slug) { console.error('用法: node scripts/developers/gen-developer.mjs <slug>'); process.exit(1); }

const data = JSON.parse(readFileSync(join(__dir, `${slug}.json`), 'utf8'));
const STYLES = readFileSync(join(__dir, '_dev-styles.html'), 'utf8').trimEnd();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const A = (name) => `assets/${name}`;                         // 相对图路径（预览版），name 含扩展名
const has = (x) => Array.isArray(x) ? x.length > 0 : (x != null && x !== '' && (typeof x !== 'object' || Object.keys(x).length > 0));

// —— 导航锚点（固定顺序 + 弹性联名/历程）——
//    ①首页 ②评级 ③理念 ④支柱 [联名] [历程] ⑤战绩 ⑥作品 ⑦项目 ⑧社区(固定) ⑨咨询
const navItems = [['#top', '首页'], ['#rating', '评级'], ['#overview', '理念'], ['#pillars', '支柱']];
if (has(data.special)) navItems.push(['#special', '联名']);
if (has(data.milestone)) navItems.push(['#milestone', '历程']);
navItems.push(['#record', '战绩'], ['#portfolio', '作品'], ['#projects', '项目']);
if (has(data.communities)) navItems.push(['#communities', '社区']);
navItems.push(['#cta', '咨询']);
const navLinks = navItems.map(([h, t]) => `<a href="${h}">${t}</a>`).join('');

// —— 五维雷达图 SVG（内联自绘，不引图表库；null 值绘 0 并在条形标「暂无」）——
function radarSVG(dims) {
  const n = dims.length, cx = 110, cy = 112, R = 84;
  const ang = (i) => -Math.PI / 2 + i * 2 * Math.PI / n;
  const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const poly = (r) => dims.map((_, i) => pt(i, r).map(x => x.toFixed(1)).join(',')).join(' ');
  let rings = [0.25, 0.5, 0.75, 1].map(f => `<polygon points="${poly(R * f)}" fill="none" stroke="#e4dccd" stroke-width="1"/>`).join('');
  let spokes = '', labels = '';
  dims.forEach((d, i) => {
    const [x, y] = pt(i, R); spokes += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e4dccd"/>`;
    const [lx, ly] = pt(i, R + 15); labels += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="11" fill="#746d63">${esc(d.k)}</text>`;
  });
  const vpoly = dims.map((d, i) => pt(i, R * ((d.v == null ? 0 : Number(d.v)) / 100)).map(x => x.toFixed(1)).join(',')).join(' ');
  const dots = dims.map((d, i) => { const [x, y] = pt(i, R * ((d.v == null ? 0 : Number(d.v)) / 100)); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${d.v == null ? '#b7ad9c' : '#d81920'}"/>`; }).join('');
  return `<svg viewBox="0 0 220 224" class="radar" role="img" aria-label="DFP-5 五维雷达图">${rings}${spokes}<polygon points="${vpoly}" fill="rgba(216,25,32,.15)" stroke="#d81920" stroke-width="2"/>${dots}${labels}</svg>`;
}

// —— ③ 评级面板（前置：速览结论 + 五维可视化 + 方法论）——
const rt = data.rating || {};
const ratingScore = data.rated
  ? `<b>${esc(rt.score)}</b><div class="rb-leaves">${'🍁'.repeat(rt.leaves || 0)}</div><div class="rb-chip">${esc(rt.version || 'DFP-5')}</div><small>置信度 ${esc(rt.confidence || '—')} · 覆盖率 ${esc(rt.coverage || '—')}<br>评级日期 ${esc(rt.ratedDate || '—')}</small>`
  : `<b class="nr">NR</b><div class="rb-chip">未评级</div><small>尚未纳入 DFP-5 评级覆盖<br>多因公开数据不足，非负面评价</small>`;
const ratingMetrics = (rt.metrics || []).map(m => `<div class="rb-metric"><small>${esc(m.k)}</small><strong>${esc(m.v)}</strong></div>`).join('');
const dimBars = (rt.dims || []).map(d => d.v == null
  ? `<div class="dim na"><small>${esc(d.label)}</small><div class="bar"></div><b>暂无</b></div>`
  : `<div class="dim"><small>${esc(d.label)}</small><div class="bar"><i style="width:${Math.max(0, Math.min(100, Number(d.v)))}%"></i></div><b>${esc(d.v)}</b></div>`).join('');
const naDim = (rt.dims || []).find(d => d.v == null && d.note);
const fivePanel = (data.rated && has(rt.dims)) ? `<div class="rp-five reveal"><div class="rp-radar">${radarSVG(rt.dims)}<div class="radar-cap">DFP-5 五维雷达 · 0–100</div></div><div><p class="dims-head">五维评级（0–100）</p><div class="dims">${dimBars}</div>${naDim ? `<p class="rp-foot">${esc(naDim.label)}：${esc(naDim.note)}，该维度暂不计分。</p>` : ''}<a class="methodology" href="${esc(rt.methodologyHref || 'https://danfengproperties.com/developers/methodology')}">DFP-5 方法论 · 如何计算 ›</a></div></div>` : '';
const ratingSection = `<section class="sec alt" id="rating"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">DFP-5 Rating · 评级速览</div><h2 class="title">丹枫独立评级，<em>先看结论</em></h2></div><div class="rating-panel reveal"><div class="rating-brief"><div class="rb-score">${ratingScore}</div><div class="rb-body"><p class="rb-verdict">${esc(rt.verdict)}</p><div class="rb-metrics">${ratingMetrics}</div><p class="data-note">${esc(rt.note)}</p></div></div>${fivePanel}</div></div></section>`;

// —— ④ 品牌理念 ——
const ov = data.overview || {};
const ovParas = (ov.paras || []).map(p => `<p>${esc(p)}</p>`).join('');
const ovMetrics = (ov.metrics || []).map(m => `<div class="metric"><b>${esc(m.n)}<span>${esc(m.u)}</span></b><p>${esc(m.p)}</p></div>`).join('');
const overviewSection = `<section class="sec" id="overview"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Brand Story · 品牌理念</div><h2 class="title">${esc(ov.title)}<em>${esc(ov.em)}</em></h2></div><div class="overview-grid"><div class="overview-photo reveal"><img src="${A(ov.photo)}" alt="${esc(data.name)} ${esc(data.cn)}大盘"></div><div class="overview-copy reveal"><div class="copy">${ovParas}</div><div class="metrics">${ovMetrics}</div></div></div></div></section>`;

// —— ⑤ 品牌支柱 ——
const pl = data.pillars || {};
const pillarItems = (pl.items || []).map(p => `<article class="highlight"><div><b>${esc(p.n)}</b><small>${esc(p.en)}</small></div><div><h3>${esc(p.h)}</h3><p>${esc(p.p)}</p></div></article>`).join('');
const pillarsSection = `<section class="sec alt" id="pillars"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Brand Pillars · 品牌支柱</div><h2 class="title">${esc(pl.title || '几个信条，')}<em>${esc(pl.em || '贯穿每一处社区')}</em></h2></div><div class="highlight-layout"><div class="highlight-photo reveal"><img src="${A(pl.photo)}" alt="${esc(data.name)} 品牌支柱"></div><div class="highlights reveal">${pillarItems}</div></div></div></section>`;

// —— 弹性：发展里程 Milestone（放 支柱 后 / 战绩 前）——
const milestoneSection = has(data.milestone) ? `<section class="sec" id="milestone"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Milestone · 发展里程</div><h2 class="title">品牌历程，<em>与关键节点</em></h2></div><div class="milestone reveal">${data.milestone.map(m => `<div class="ms"><b>${esc(m.year)}</b><h4>${esc(m.h)}</h4><p>${esc(m.p)}</p></div>`).join('')}</div></div></section>` : '';

// —— ⑥ 历史战绩 Track Record（DXB战绩 + 五维拆解 + 要点）——
const rc = data.record || {};
const rcFacts = (rc.facts || []).map(f => `<div class="dev-fact"><small>${esc(f.k)}</small><strong>${esc(f.v)}</strong></div>`).join('');
const rcDims = has(rc.dims) ? `<div class="dims reveal"><p class="dims-head">DFP-5 五维拆解（0–100）</p>${rc.dims.map(d => `<div class="dim"><small>${esc(d.k)}</small><div class="bar"><i style="width:${Math.max(0, Math.min(100, Number(d.v) || 0))}%"></i></div><b>${esc(d.v)}</b></div>`).join('')}</div>` : '';
const rcBullets = has(rc.bullets) ? `<ul class="tr-list reveal">${rc.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : '';
const rcBedMix = rc.bedMix ? `<p class="data-note" style="margin-top:18px">${esc(rc.bedMix)}</p>` : '';
const recordSection = `<section class="sec" id="record"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Track Record · 历史战绩</div><h2 class="title">迪拜市场战绩，<em>与开发规模</em></h2></div><div class="developer-copy reveal"><div class="dev-heading"><img class="dev-logo" src="${A(rc.logo)}" alt="${esc(data.name)} 标志"><div class="dev-name">${esc(rc.devName)}<span>${esc(rc.devSub)}</span></div></div><p>${esc(rc.intro)}</p><div class="dev-facts">${rcFacts}</div>${rcDims}${rcBullets}${rcBedMix}<p class="data-note">${esc(rc.note)}</p></div></div></section>`;

// —— ⑦ 代表作品 ——
const pf = data.portfolio || {};
const pfItems = (pf.items || []).map(p => `<article class="product"><div class="product-img"><img src="${A(p.img)}" alt="${esc(p.h)}"></div><div class="panel"><div class="idx">${esc(p.tag)}</div><h3>${esc(p.h)}</h3><div class="loc">${esc(p.loc)}</div><p>${esc(p.p)}</p></div></article>`).join('');
const portfolioSection = `<section class="sec alt" id="portfolio"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Portfolio · 代表作品</div><h2 class="title">${esc(pf.title)}<em>${esc(pf.em)}</em></h2></div><div class="products reveal">${pfItems}</div></div></section>`;

// —— ⑧ 在售项目（关联）——
const pj = data.projects || {};
const pjCards = (pj.cards || []).map(c => `<a class="proj-card" href="${esc(c.href)}"><div class="proj-ph"><img src="${A(c.img)}" alt="${esc(c.h)}"></div><div class="proj-bd"><span class="pill">${esc(c.pill)}</span><h3>${esc(c.h)}</h3><p>${esc(c.p)}</p><span class="go">查看项目 ›</span></div></a>`).join('');
const pjMore = pj.moreHref ? `<a class="proj-card" href="${esc(pj.moreHref)}" style="display:flex;align-items:center;justify-content:center;background:var(--ivory)"><div class="proj-bd" style="text-align:center"><h3 style="margin-top:0">更多在售项目</h3><p>浏览 ${esc(data.name)} 全部项目</p><span class="go">前往精选项目 ›</span></div></a>` : '';
const projectsSection = `<section class="sec" id="projects"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Live Projects · 在售项目</div><h2 class="title">${esc(pj.title || '进入 ' + data.name + ' ')}<em>${esc(pj.em || '在售项目落地页')}</em></h2></div><div class="proj-grid reveal">${pjCards}${pjMore}</div></div></section>`;

// —— 弹性：开发社区 Communities（关联，放 在售项目 后 / CTA 前）——
const commCards = (data.communities?.items || []).map(c => `<a class="proj-card" href="${esc(c.href)}"><div class="proj-ph"><img src="${A(c.img)}" alt="${esc(c.name)} 社区"></div><div class="proj-bd"><span class="pill">${esc(c.pill || '迪拜社区')}</span><h3>${esc(c.name)}</h3><p>${esc(c.sub)}</p><span class="go">查看社区 ›</span></div></a>`).join('');
const communitiesSection = has(data.communities) ? `<section class="sec alt" id="communities"><div class="wrap"><div class="section-head reveal"><div class="eyebrow">Communities · 开发社区</div><h2 class="title">${esc(data.communities.title || '主导开发的')}<em>${esc(data.communities.em || '迪拜社区')}</em></h2></div><div class="proj-grid reveal">${commCards}</div></div></section>` : '';

// —— 弹性：特别补充 Special（如 BEYOND × PSG）——
const specialSection = has(data.special) ? `<section class="sec psg" id="special"><div class="wrap psg-in reveal"><div><div class="eyebrow">${esc(data.special.eyebrow)}</div><h3>${data.special.h}</h3></div><p>${esc(data.special.p)}</p></div></section>` : '';

// —— ⑨ CTA ——
const ctaSection = `<section class="sec cta" id="cta"><div class="wrap cta-grid"><div class="reveal"><div class="eyebrow">下一步 · Next Step</div><h2 class="title" style="margin:16px 0;color:#fff">了解 ${esc(data.name)}，<br><em>先判断再咨询</em></h2><p class="cta-copy">丹枫置业以开发商研究与项目级信息展示为起点，帮助你先判断品牌、评级、片区与自身预算目标是否匹配，再进入真人顾问确认阶段。</p></div><div class="paths reveal"><article class="path"><div class="path-label">01 · AI ADVISOR</div><h3>AI 智能投顾</h3><p>1分钟，AI 为您快速匹配 ${esc(data.name)} 适配项目、生成专属投资报告。</p><div class="path-qr"><img src="${A('danfeng-website-qr.png')}" alt="丹枫 AI 智能投顾二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="https://danfengproperties.com/?ask=${slug}#console">对话 AI</a></article><article class="path"><div class="path-label">02 · PRIVATE ADVISOR</div><h3>咨询私人投顾</h3><p>微信，获取 ${esc(data.name)} 项目资料，房源信息和投资建议。</p><div class="path-qr"><img src="${A('danfeng-wechat-qr.png')}" alt="丹枫微信真人顾问二维码" loading="eager" decoding="sync"><span>扫码或长按识别</span></div><a href="${esc(data.wechatHref || 'https://u.wechat.com/MBHeTbPUEaA4Wzeda66CFBo?s=2')}">咨询顾问</a></article></div></div></section>`;

// —— 组装页面（固定段顺序 + 弹性段插槽）——
const h = data.hero || {};
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${esc(data.name)} ${esc(data.cn)} · 开发商档案 | 丹枫置业</title>
  <meta name="description" content="${esc(data.seo?.desc)}">
  <link rel="canonical" href="https://danfengproperties.com/developers/${slug}">
  <meta property="og:title" content="${esc(data.name)} ${esc(data.cn)} · 开发商档案 | 丹枫置业">
  <meta property="og:description" content="${esc(data.seo?.ogDesc)}">
  <meta property="og:image" content="https://danfengproperties.com/developers/${slug}/assets/hero.webp">
${STYLES}
</head>
<body>
  <nav aria-label="开发商档案导航"><div class="wrap nav-inner"><a class="brand" href="https://danfengproperties.com/"><svg class="brandmark" viewBox="0 0 40 40" aria-hidden="true"><rect class="r" x="3" y="3" width="16" height="16"/><rect class="rd" x="21" y="3" width="16" height="16"/><rect class="r" x="3" y="21" width="16" height="16"/><rect class="g" x="21" y="21" width="16" height="16"/></svg><span>丹枫置业<small>DANFENG PROPERTIES</small></span></a><div class="nav-links">${navLinks}</div><details class="site-menu"><summary aria-label="打开网站导航" title="网站导航"><span class="menu-icon" aria-hidden="true"><span></span><span></span><span></span></span></summary><div class="site-menu-panel"><a href="https://danfengproperties.com/">智能投顾</a><a href="https://danfengproperties.com/projects">精选项目</a><a href="https://danfengproperties.com/developers">开发商榜</a><a href="https://danfengproperties.com/communities">热门社区</a></div></details></div></nav>

  <header class="hero" id="top"><div class="wrap hero-grid"><div><div class="kicker">${esc(h.kicker)}</div><h1>${esc(data.cn)}<span>${esc(h.span)}</span></h1><div class="hero-en">${esc(h.en)}</div><p class="hero-copy">${esc(h.copy)}</p><div class="actions"><a class="btn btn-red" href="#cta">获取项目清单</a><a class="btn btn-paper" href="#portfolio">浏览代表作品</a></div></div></div></header>

  <div class="facts"><div class="wrap facts-row">${(data.facts || []).map(f => `<div class="fact"><small>${esc(f.k)}</small><strong>${esc(f.v)}</strong>${f.em ? `<em>${esc(f.em)}</em>` : ''}</div>`).join('')}</div></div>

  ${ratingSection}

  ${overviewSection}

  ${pillarsSection}

  ${specialSection}

  ${milestoneSection}

  ${recordSection}

  ${portfolioSection}

  ${projectsSection}

  ${communitiesSection}

  ${ctaSection}

  <footer><div class="wrap foot"><div class="foot-brand"><svg class="brandmark" viewBox="0 0 40 40" aria-hidden="true"><rect class="r" x="3" y="3" width="16" height="16"/><rect class="rd" x="21" y="3" width="16" height="16"/><rect class="r" x="3" y="21" width="16" height="16"/><rect class="g" x="21" y="21" width="16" height="16"/></svg>DANFENG PROPERTIES</div><p class="disclaimer">免责声明：本页面基于开发商官网、官方资料、丹枫开发商数据库及公开资料（迪拜土地局 DLD）整理，仅用于开发商展示与初步了解，不构成购买建议、收益承诺、法律或税务意见。DFP-5 为丹枫独立研究评级，仅供参考，非信用违约评级。图片为开发商效果图与概念展示；项目数据、面积、价格、交付时间以开发商正式文件、监管登记及最终合同为准。页面更新：${esc(data.footerDate)}。</p></div></footer>

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

// —— 写 deliverables（相对图，双击预览）——
const delivDir = join(REPO, 'deliverables', 'developers', slug);
mkdirSync(delivDir, { recursive: true });
writeFileSync(join(delivDir, 'index.html'), html);

// —— 写 public（绝对图，随站点部署）——
const pubDir = join(WEB, 'public', 'developers', slug);
mkdirSync(pubDir, { recursive: true });
const htmlAbs = html.replaceAll('"assets/', `"/developers/${slug}/assets/`);
writeFileSync(join(pubDir, 'index.html'), htmlAbs);

// —— 登记 standalonePages（STANDALONE_DEVELOPER_SLUGS，缺则创建）——
const spPath = join(WEB, 'lib', 'standalonePages.js');
let sp = readFileSync(spPath, 'utf8');
if (!/STANDALONE_DEVELOPER_SLUGS/.test(sp)) {
  sp += `\n// 采用 WEB-DEV-V1 独立 HTML 母版、静态托管于 public/developers/<slug>/index.html 的开发商 slug。\n// 从 Next SSG [slug] 路由排除，并由 next.config beforeFiles 重写到静态 index.html。\nexport const STANDALONE_DEVELOPER_SLUGS = ['${slug}'];\n`;
  writeFileSync(spPath, sp);
} else if (!new RegExp(`STANDALONE_DEVELOPER_SLUGS[^\\]]*'${slug}'`).test(sp)) {
  sp = sp.replace(/(export const STANDALONE_DEVELOPER_SLUGS = \[)([^\]]*)(\];)/, (m, a, list, c) => `${a}${list.trimEnd()}${list.trim().endsWith(',') || list.trim() === '' ? '' : ','} '${slug}'${c}`);
  writeFileSync(spPath, sp);
}

// —— 复制 assets 到 public（放最后 + 容错：沙箱 fuse 可能 EACCES，不影响登记）——
const assetsSrc = join(delivDir, 'assets');
let assetsCopied = false;
if (existsSync(assetsSrc)) {
  try { cpSync(assetsSrc, join(pubDir, 'assets'), { recursive: true, force: true }); assetsCopied = true; }
  catch (e) { console.warn(`  ⚠ assets 自动复制失败(${e.code})，请手动: cp -r deliverables/developers/${slug}/assets danfeng-web/public/developers/${slug}/`); }
}

console.log(`✅ 开发商页生成完成: ${slug}${assetsCopied ? '' : '（assets 待手动复制）'}`);
console.log(`   deliverables/developers/${slug}/index.html（预览）`);
console.log(`   public/developers/${slug}/index.html（部署）`);
console.log(`   已登记 standalonePages.STANDALONE_DEVELOPER_SLUGS`);
console.log(`   接入：确保 next.config.mjs 重写 + app/developers/[slug]/page.jsx 排除守卫（一次性，见 README）`);
console.log(`   上线：本机 npm run build && vercel --prod`);
