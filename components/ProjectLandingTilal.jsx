// ============================================================
// ProjectLandingTilal — Tilal 暗调影院母版落地页（视觉忠实移植 · 禁再创作）
// ------------------------------------------------------------
// 结构/CSS 逐段照搬 codex-handoff/output/altan-3608-tilal-style.html，作用域根
// .tilal + 前缀化样式（projectLandingTilal.styles.js）防污染全站。数据全部来自
// 装配器 buildProjectPageData（lib/projectPageData.js），组件只做「摆放」，不取数、
// 不降级、不臆造。母版四处返修在参数化绑库中收敛：
//   ① overview 建筑形态臆造值 → 绑 overview.stats 装配器真值（含 399㎡ 片区体量）；
//   ② Hero 自撰营销引言 → 可选槽 hero.quote（rich.heroQuote 无值不渲染）；
//   ③ 社区参考价表被删两行 → 绑 community.priceBand.rows 全量渲染（装配器出全部行）；
//   ④ 旧拉丁字标 → Danfeng Properties（导航 + 页脚）。
// 母版原 IntersectionObserver 动效 → <TilalEnhance/>（'use client'，无 catalog 依赖）。
// emoji 一律 SVG（AmenityIcon / 内联图标，护栏禁 emoji）。
// ============================================================
import Link from 'next/link';
import TilalEnhance from '@/components/TilalEnhance';
import ProjectVideoEmbed from '@/components/ProjectVideoEmbed';
// 样式共享化（第3棒 · LEO 2026-07-12 批）：TILAL_CSS 不再内联注入（原每页 SSR 输出
// 携带约 24KB <style dangerouslySetInnerHTML> 全文，1705 页累计巨量重复）。改为
// app/projects/[slug]/layout.jsx 路由段级 import './tilal.css'，样式随路由段静态
// 产物加载一次，视觉零变化。components/projectLandingTilal.styles.js 的 TILAL_CSS
// 导出保留（与 tilal.css 逐字节一致），仅供 v5-guardrail 静态扫描比对源。

const pad2 = (i) => String(i + 1).padStart(2, '0');

// —— 品牌 marker（母版象征方块 · 红/金四格）——
function BrandMark() {
  return (
    <svg className="brandmark" viewBox="0 0 40 40" aria-hidden="true">
      <rect className="r" x="3" y="3" width="16" height="16" />
      <rect className="rd" x="21" y="3" width="16" height="16" />
      <rect className="r" x="3" y="21" width="16" height="16" />
      <rect className="g" x="21" y="21" width="16" height="16" />
    </svg>
  );
}

// —— 配套 SVG 线性图标（关键字匹配 · currentColor · 禁 emoji · 母版原方案的 React 安全实现）——
function AmenityIcon({ label }) {
  const t = String(label);
  const has = (re) => re.test(t);
  let d;
  if (has(/泳池|泳|pool|无边/i)) d = <><path d="M2 18c3-3 6-3 10 0s7 3 10 0" /><path d="M2 13c3-3 6-3 10 0s7 3 10 0" /></>;
  else if (has(/健身|gym|fitness/i)) d = <><path d="M6 20V10" /><path d="M18 20V10" /><path d="M4 10h16" /><path d="M8 6h8" /></>;
  else if (has(/瑜伽|yoga/i)) d = <><circle cx="12" cy="7" r="3" /><path d="M12 10v7" /><path d="M8 14h8" /><path d="M8 21l4-4 4 4" /></>;
  else if (has(/办公|office|联合办公|co-?work|商务|business/i)) d = <><path d="M4 6h16v12H4z" /><path d="M8 10h8" /><path d="M8 14h5" /></>;
  else if (has(/多功能|厅|hall|活动/i)) d = <><rect x="4" y="4" width="16" height="16" /><path d="M4 10h16" /></>;
  else if (has(/儿童|游乐|kid|child|play|家庭|family/i)) d = <><path d="M5 20c2-5 12-5 14 0" /><circle cx="12" cy="7" r="4" /></>;
  else if (has(/园|景|平台|deck|podium|garden|park|绿|观景/i)) d = <><path d="M4 18h16" /><path d="M6 18V8l6-4 6 4v10" /></>;
  else if (has(/球|运动|padel|sport|court|网球/i)) d = <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18" /></>;
  else if (has(/烧烤|bbq|barbecue|烤/i)) d = <><path d="M7 21V11" /><path d="M17 21V11" /><path d="M5 11h14" /><path d="M8 7h8" /></>;
  else if (has(/餐|零售|retail|dining|shop|restaurant|咖啡|cafe|酒店|hotel/i)) d = <><path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 0 1 6 0" /></>;
  else if (has(/码头|步道|滨水|marina|water|运河|河|creek|游艇|海滩|beach|promenade/i)) d = <><path d="M3 19c4-4 7-4 11 0 2 2 4 2 7 0" /><path d="M7 15l5-9 5 9" /></>;
  else if (has(/安保|security|保安|24|guard/i)) d = <><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></>;
  else if (has(/地铁|metro|巴士|bus|接驳|站|桥|bridge|连通/i)) d = <><rect x="6" y="4" width="12" height="12" rx="2" /><path d="M6 11h12M9 16l-1.5 3M15 16l1.5 3" /></>;
  else d = <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></>;
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{d}</svg>;
}

export default function ProjectLandingTilal({ data }) {
  const d = data;
  const { hero, facts, overview, highlights, location, productDetails, amenities, unit, community, developer, video } = d;
  // 首屏背景：有本地短片时以 poster 作静态兜底底图（reduced-motion 降级 / 视频加载前），
  // 否则维持现状（图片轮播首图）；无图无视频 → none（原样）。零回归：无 heroVideo 时 image 逻辑不变。
  const heroImg = hero.image ? `url("${hero.image.src}")`
    : (hero.heroVideo && hero.heroVideo.poster ? `url("${hero.heroVideo.poster}")` : 'none');
  const ctaImg = (amenities?.band?.src || hero.image?.src);
  const ctaImgVal = ctaImg ? `url("${ctaImg}")` : 'none';

  // 导航锚点（全列十段 · 弹性段缺失则该锚点省略）
  const navLinks = [
    { href: '#overview', label: '概况' },
    ...(highlights ? [{ href: '#highlights', label: '亮点' }] : []),
    ...(location ? [{ href: '#location', label: '地段' }] : []),
    ...(productDetails ? [{ href: '#product', label: '产品' }] : []),
    ...(amenities ? [{ href: '#amenities', label: '配套' }] : []),
    ...(community ? [{ href: '#community', label: '社区' }] : []),
    ...(developer ? [{ href: '#developer', label: '开发商' }] : []),
    ...(video ? [{ href: '#video', label: '视频' }] : []),
    { href: '#unit', label: '户型' },
  ];

  return (
    <div className="tilal">
      {/* NAV（母版暗调顶栏 · 品牌名返修④ Danfeng Properties） */}
      <nav className="nav">
        <div className="wrap nav-in">
          <Link href="/" className="brand" aria-label="Danfeng Properties 丹枫置业">
            <BrandMark />
            <span><strong>Danfeng Properties</strong><span>丹枫置业 · 中东房产智能投顾</span></span>
          </Link>
          <div className="nav-links">
            {navLinks.map((l, i) => <a href={l.href} key={i}>{l.label}</a>)}
          </div>
          <a className="nav-cta" href="#cta">咨询项目</a>
        </div>
      </nav>

      {/* HERO（母版满屏暗底 · 左区文案 + 右侧引言/数据面板） */}
      <header className="hero" style={{ '--hero-img': heroImg }}>
        {/* 路线一：有本地氛围短片时首屏背景改原生 <video>（静音循环自动播放 · poster 兜底）；
            尊重 prefers-reduced-motion（CSS 中降级隐藏 video，回落 --hero-img=poster 静态图）。
            无 heroVideo → 不渲染，首屏维持现状图片背景（零回归）。 */}
        {hero.heroVideo ? (
          <>
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={hero.heroVideo.poster || undefined}
              aria-hidden="true"
            >
              <source src={hero.heroVideo.src} type="video/mp4" />
            </video>
            <div className="hero-video-scrim" aria-hidden="true" />
          </>
        ) : null}
        <div className="wrap hero-grid">
          <div>
            <div className="hero-tag">{hero.tag}</div>
            <h1>{hero.h1}{hero.em ? <em>{hero.em}</em> : null}</h1>
            <div className="hero-en">{hero.en}</div>
            {hero.tagline ? <p className="tagline">{hero.tagline}</p> : null}
            <div className="hero-actions">
              <a className="btn btn-red" href={d.askHref}>让 AI 顾问初筛 <span className="arrow" /></a>
              <a className="btn btn-ghost" href="#unit">查看户型口径 <span className="arrow" /></a>
            </div>
          </div>
          <aside className="hero-panel">
            {/* 返修②：仅当装配器 hero.quote 有值才渲染，杜绝自撰营销引言 */}
            {hero.quote ? <p className="quote">{hero.quote}</p> : null}
            <div className="hero-stats" aria-label="项目核心信息">
              {hero.stats.map((m, i) => (
                <div className={`hstat${m.isPrice ? ' price' : ''}`} key={i}>
                  <small>{m.k}</small>
                  <strong {...(i === 0 ? { 'data-slot': 'state.label' } : {})}>{m.v}</strong>
                  {/* 白版 bug 修复（LEO 2026-07-12）：原用通用 .note（含 background:ivory + padding），
                      与全局 .tilal .note 类名撞车渲染成白底块；改专属 .hstat-note + SVG 锁标（禁 emoji）。 */}
                  {m.note ? (
                    <span className="hstat-note">
                      <svg className="lock-ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                      {m.note}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>
        </div>
        <div className="scroll">向下浏览</div>
      </header>

      {/* 全宽事实带（6 格 · 绑 facts） */}
      <div className="fact-band">
        <div className="wrap facts">
          {facts.map((f, i) => (
            <div className="fact" key={i}>
              <small>{f.k}</small>
              <strong>{f.v}</strong>
              {f.small ? <span>{f.small}</span> : null}
            </div>
          ))}
        </div>
      </div>

      {/* OVERVIEW（返修①：metric-grid 绑 overview.stats 装配器真值，杜绝建筑形态臆造值） */}
      <section className="sec" id="overview">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">{overview.eyebrow}</div>
            <h2 className="section-title">{overview.h2Line}<br /><em>{overview.h2Em}</em></h2>
          </div>
          <div className="overview-grid">
            <div className="copy reveal">
              {overview.paras.map((t, i) => <p key={i}>{t}</p>)}
            </div>
            <div className="metric-grid reveal">
              {overview.stats.map((s, i) => (
                <div className="metric" key={i}>
                  <div><span className="n">{s.n}</span>{s.unit ? <span className="unit">{s.unit}</span> : null}</div>
                  <div className="l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      {highlights && (
        <section className="sec alt" id="highlights">
          <div className="wrap">
            <div className="section-head reveal">
              <div className="eyebrow">{highlights.eyebrow}</div>
              <h2 className="section-title">{highlights.h2Line}<br /><em>{highlights.h2Em}</em></h2>
            </div>
            <div className="highlights reveal">
              {highlights.items.map((t, i) => (
                <article className="highlight" key={i}><b>{pad2(i)}</b><p>{t}</p></article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LOCATION（免密钥 Google Maps 嵌入 + 距离表；有 area 素材并列一带） */}
      {location && (
        <section className="sec" id="location">
          <div className="wrap">
            <div className="section-head reveal">
              <div className="eyebrow">{location.eyebrow}</div>
              <h2 className="section-title">{location.h2Line}<br /><em>{location.h2Em}</em>{location.h2Tail || ''}</h2>
            </div>
            <div className="loc-grid">
              <div className="map reveal">
                <iframe
                  src={location.mapEmbed}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`${d.name} · ${location.mapQuery}`}
                />
                <div className="caption">{location.mapCap}</div>
              </div>
              <div className="reveal">
                <div className="distance-card">
                  <h3>从项目到城市核心</h3>
                  {location.conn ? <p className="conn">{location.conn}</p> : null}
                  {location.distances.map((r, i) => (
                    <div className="distance" key={i}><strong>{r.dm}</strong><span>{r.dl}</span></div>
                  ))}
                </div>
                {location.areaImg && (
                  <div className="area-img">
                    <img src={location.areaImg.src} alt={location.areaImg.alt || ''} loading="lazy" />
                    <div className="caption">{location.areaCap}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PRODUCT DETAILS（弹性 · 无则整章省略） */}
      {productDetails && (
        <section className="sec alt" id="product">
          <div className="wrap">
            <div className="section-head reveal">
              <div className="eyebrow">{productDetails.eyebrow}</div>
              <h2 className="section-title">{productDetails.h2Line}<br /><em>{productDetails.h2Em}</em></h2>
            </div>
            <div className="product-stack">
              {productDetails.blocks.map((b, i) => (
                <article className="product reveal" key={i}>
                  {b.img && (
                    <div className="product-media">
                      <img src={b.img.src} alt={b.img.alt || ''} loading="lazy" />
                      {b.img.caption ? <div className="caption">{b.img.caption}</div> : null}
                    </div>
                  )}
                  <div className="product-body">
                    <div className="idx">Detail {pad2(i)}</div>
                    {b.title ? <h3>{b.title}</h3> : null}
                    {b.body ? <p>{b.body}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* AMENITIES（母版暗色反白区） */}
      {amenities && (
        <section className="sec amenity-section" id="amenities">
          <div className="wrap">
            <div className="section-head reveal">
              <div className="eyebrow">{amenities.eyebrow}</div>
              <h2 className="section-title">{amenities.h2Line}<br /><em>{amenities.h2Em}</em></h2>
            </div>
            <div className="amenity-grid reveal">
              {amenities.items.map((a, i) => (
                <div className="amenity" key={i}><AmenityIcon label={a} /><strong>{a}</strong></div>
              ))}
            </div>
            {amenities.band && (
              <div className="amenity-band reveal">
                <img src={amenities.band.src} alt={amenities.band.alt || ''} loading="lazy" />
                <div className="caption">{amenities.bandCap}</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* COMMUNITY（返修③：参考价表绑 priceBand.rows 全量渲染） */}
      {community && (
        <section className="sec" id="community">
          <div className="wrap">
            <div className="section-head reveal">
              <div className="eyebrow">{community.eyebrow}</div>
              <h2 className="section-title">{community.h2Line}<br /><em>{community.h2Em}</em></h2>
            </div>
            {community.cards.length > 0 && (
              <div className="community-grid reveal">
                {community.cards.map((c, i) => (
                  <article className="community-card" key={i}>
                    <span className="pill">{c.tag}</span>
                    <h3>{c.title}</h3>
                    <p>{c.desc}</p>
                  </article>
                ))}
              </div>
            )}
            {community.wide && (
              <div className="wide reveal">
                <img src={community.wide.src} alt={community.wide.alt || ''} loading="lazy" />
                <div className="caption">{community.wideCap}</div>
              </div>
            )}
            {community.priceBand && (
              <div className="market-band reveal">
                <div className="market-head">
                  <h3>{community.priceBand.title}</h3>
                  <span className="badge">{community.priceBand.badge}</span>
                </div>
                <table>
                  <thead><tr><th>Type</th><th>Property</th><th>参考售价</th><th>参考年租</th><th>参考回报</th></tr></thead>
                  <tbody>
                    {community.priceBand.rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.type}</td><td>{r.propertyType}</td>
                        <td>{r.sale}</td><td>{r.rent}</td><td>{r.roi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="note">来源：{community.priceBand.source}。{community.priceBand.note}</div>
              </div>
            )}
            <div className="link-card reveal">
              <div>
                <h3>{community.link.name}</h3>
                {community.link.cn ? <p>{community.link.cn}</p> : null}
                {community.link.tags.length > 0 && (
                  <div className="chips">
                    {community.link.tags.map((t, i) => <span className="chip" key={i}>{t.en}{t.cn ? ` ${t.cn}` : ''}</span>)}
                  </div>
                )}
              </div>
              <Link className="btn btn-ghost" href={community.link.href}>查看社区页 <span className="arrow" /></Link>
            </div>
          </div>
        </section>
      )}

      {/* DEVELOPER（DFP-5 评级带 + 互链） */}
      {developer && (
        <section className="sec alt" id="developer">
          <div className="wrap">
            <div className="section-head reveal">
              <div className="eyebrow">{developer.eyebrow}</div>
              <h2 className="section-title">{developer.h2}</h2>
            </div>
            <div className="developer-card reveal">
              <div>
                <div className="dev-name">{developer.name}{developer.cn ? <><br /><span style={{ color: 'var(--gold)' }}>{developer.cn}</span></> : null}</div>
                {developer.rated && (
                  <div className="rating">{developer.version ? `${developer.version} · ` : ''}{developer.score}</div>
                )}
                {developer.p ? <p>{developer.p}</p> : null}
                <Link className="btn btn-ghost" href={developer.href} style={{ marginTop: 22 }}>查看开发商页 <span className="arrow" /></Link>
              </div>
              <div>
                {developer.chips.length > 0 && (
                  <div className="dev-metrics">
                    {developer.chips.map((c, i) => (
                      <div className="dev-metric" key={i}><small>{c.k}</small><strong>{c.v}</strong></div>
                    ))}
                  </div>
                )}
                {developer.blurb ? <p>{developer.blurb}</p> : null}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 项目视频（路线二 · 弹性块 · 懒加载 YouTube 门面）：仅当装配器 video 有值才渲染，无则整块省略无空壳 */}
      {video && (
        <section className="sec alt video-section" id="video">
          <div className="wrap">
            <div className="section-head reveal">
              <div className="eyebrow">{video.eyebrow}</div>
              <h2 className="section-title">{video.h2Line}<br /><em>{video.h2Em}</em></h2>
            </div>
            <div className="reveal">
              <ProjectVideoEmbed video={video} />
              {video.note ? <div className="caption">{video.note}</div> : null}
            </div>
          </div>
        </section>
      )}

      {/* UNIT & PRICE（户型卡 + 付款计划 + 指导价格汇总行 · 护栏口径） */}
      <section className="sec" id="unit">
        <div className="wrap">
          <div className="section-head reveal">
            <div className="eyebrow">{unit.eyebrow}</div>
            <h2 className="section-title">{unit.h2Line}<br /><em>{unit.h2Em}</em></h2>
          </div>
          <div className="unit-grid">
            <div className="unit-copy reveal">
              {unit.paras.map((t, i) => <p key={i}>{t}</p>)}
            </div>
            {unit.heroImg && (
              <div className="unit-img reveal">
                <img src={unit.heroImg.src} alt={unit.heroImg.alt || ''} loading="lazy" />
                <div className="caption">{unit.heroCap}</div>
              </div>
            )}
          </div>
          {unit.floors.length > 0 && (
            <div className="floor-grid reveal">
              {unit.floors.map((fl, i) => (
                <article className="floor" key={i}>
                  <div className="floor-num">{fl.num}<span>{fl.unitLabel}</span></div>
                  <h3>{fl.name}</h3>
                  {fl.rows.map((r, j) => (
                    <div className="floor-row" key={j}><span>{r.k}</span><span>{r.v}</span></div>
                  ))}
                </article>
              ))}
            </div>
          )}
          {unit.payment && (
            <div className="payment-grid reveal">
              <div className="pay-card">
                <h3>付款结构</h3>
                {unit.payment.structure ? <div className="pay-big">{unit.payment.structure}</div> : null}
                {unit.payment.note ? <p className="pay-note">{unit.payment.note}</p> : null}
              </div>
              <div className="steps">
                <h3>付款节点</h3>
                {unit.payment.milestones.map((m, i) => (
                  <div className="step" key={i}>
                    {m.percent ? <strong>{m.percent}</strong> : null}
                    <div>{m.stage ? <b>{m.stage}</b> : null}{m.note ? <span>{m.note}</span> : null}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {unit.priceSummary && (
            <div className="price-summary reveal">
              <div><small>{unit.priceSummary.label}</small><strong>{unit.priceSummary.value}</strong></div>
              <p>{unit.priceSummary.note}</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA（母版深色块 · 双路径：AI 智能投顾 + 微信顾问 · 无海外 IM 路径） */}
      <section className="sec cta" id="cta" style={{ '--cta-img': ctaImgVal }}>
        <div className="wrap cta-grid">
          <div className="reveal">
            <div className="eyebrow">下 一 步</div>
            <h2>两条路径，<br /><em>先判断是否适合</em></h2>
            <p>丹枫置业以项目级信息展示与 AI 初筛为主，帮助你先判断项目、社区、开发商与自身预算目标是否匹配，再进入人工顾问确认阶段。</p>
          </div>
          <div className="paths reveal">
            <article className="path primary">
              <svg className="icon" viewBox="0 0 24 24"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7z" /><path d="M9 12l2 2 4-4" /></svg>
              <h3>AI 智能投顾</h3>
              <p>输入预算、持有周期、身份需求与风险偏好，先获得项目级匹配建议与报告方向。</p>
              <a href={d.askHref}>开始 AI 初筛</a>
            </article>
            <article className="path">
              <svg className="icon" viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>
              <h3>微信顾问</h3>
              <p>如需楼书、付款计划、合同节点与实地带看安排，可添加丹枫持牌顾问进一步确认。</p>
              <div className="qrbox"><div className="qr" aria-hidden="true" /><small>微信二维码占位<br />交付前替换为正式客服码</small></div>
              <a href="#cta">预约人工咨询</a>
            </article>
          </div>
        </div>
      </section>

      {/* FOOTER（品牌名返修④ Danfeng Properties） */}
      <footer>
        <div className="wrap foot">
          <div className="foot-brand">
            <BrandMark />
            <b>Danfeng Properties</b>
          </div>
          <p className="disclaimer">免责声明：本页面内容基于开发商公开资料、项目楼书及丹枫项目库信息整理，仅供项目展示与初步了解，不构成任何购买建议、收益承诺或法律承诺。面积、配置、交付时间、付款计划及价格口径以开发商正式文件和最终合同为准。页面更新：{d.updated}。</p>
        </div>
      </footer>

      <TilalEnhance />
    </div>
  );
}
