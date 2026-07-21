// ============================================================
// ProjectLandingV5 — v5「象牙白版」项目落地页（视觉忠实移植 · 禁再创作）
// ------------------------------------------------------------
// 结构/CSS 逐段照搬 项目页模板_CreekWaters_v5.html，作用域根 .cwv5 + 前缀
// 化样式（projectLandingV5.styles.js）防污染全站。数据全部来自装配器
// buildProjectPageData（lib/projectPageData.js），组件只做「摆放」，不取数、
// 不降级、不臆造。emoji 一律换 SVG（AmenityIcon / 内联图标，护栏禁 emoji）。
// 服务端组件（可安全 import MapleLeaves→catalog，不进客户端包）；交互增强
// 拆到 <V5Enhance/>（'use client'，无 catalog 依赖）。
// ============================================================
import Link from 'next/link';
import { MapleLeaves } from '@/components/MapleRating';
import { V5_CSS, V5_SUPPLEMENT } from '@/components/projectLandingV5.styles';
import V5Enhance from '@/components/V5Enhance';
import { V5Nav, V5Cta, V5Footer, IconLock } from '@/components/V5Chrome';

// —— SVG 线性图标库（viewBox 0 0 24 24 · currentColor · 禁 emoji）——
function AmenityIcon({ label, cls = 'ai' }) {
  const t = String(label);
  const has = (re) => re.test(t);
  let d;
  if (has(/泳池|泳|pool|无边/i)) d = <><path d="M2 16c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0 2.8-1 4.2 0" /><path d="M2 20c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0 2.8-1 4.2 0" /><path d="M8 14V5a2 2 0 0 1 4 0M16 14V5a2 2 0 0 0-4 0" /></>;
  else if (has(/健身|gym|fitness/i)) d = <path d="M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11" />;
  else if (has(/瑜伽|yoga/i)) d = <><circle cx="12" cy="4.5" r="1.8" /><path d="M12 6.3v6M6 21l6-8 6 8M8 11h8" /></>;
  else if (has(/办公|office|联合办公|co-?work|商务|business/i)) d = <><path d="M4 21V8l8-5 8 5v13" /><path d="M9 21v-5h6v5M9 9h.5M14.5 9h.5M9 12.5h.5M14.5 12.5h.5" /></>;
  else if (has(/多功能|厅|hall|活动/i)) d = <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 8h.5M12 8h.5M16 8h.5M8 12h.5M12 12h.5M16 12h.5M8 16h.5M12 16h.5M16 16h.5" /></>;
  else if (has(/儿童|游乐|kid|child|play|家庭|family|splash/i)) d = <path d="M12 3l2.1 5.3L20 9l-4.3 3.6L17 19l-5-3-5 3 1.3-6.4L4 9l5.9-.7z" />;
  else if (has(/园|景|平台|deck|podium|garden|park|绿|观景|viewing|landscap|豪宅|luxury|热门|旅游/i)) d = <><path d="M12 3C9.2 6.5 8 9 8 11.5a4 4 0 0 0 8 0C16 9 14.8 6.5 12 3z" /><path d="M12 14v7" /></>;
  else if (has(/球|运动|padel|sport|court|网球/i)) d = <><circle cx="12" cy="12" r="9" /><path d="M4.5 7c4 2 11 2 15 0M4.5 17c4-2 11-2 15 0" /></>;
  else if (has(/烧烤|bbq|barbecue|烤/i)) d = <><path d="M12 3c3 3 4.4 6 4.4 8.8a4.4 4.4 0 0 1-8.8 0c0-1.4.5-2.7 1.5-3.9.3 1 1 1.6 1.8 2C10 8 10.5 5.5 12 3z" /></>;
  else if (has(/餐|零售|retail|dining|shop|restaurant|咖啡|cafe|酒店|hotel/i)) d = <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.6 0-2.2 2.2-2.2 4.2S15.4 11 17 11v10" />;
  else if (has(/码头|步道|滨水|marina|water|运河|河|creek|游艇|海滩|beach|沙滩|promenade|临海/i)) d = <><circle cx="12" cy="4.5" r="1.8" /><path d="M12 6.3V20M5 12a7 7 0 0 0 14 0M5 12h2.5M16.5 12H19" /></>;
  else if (has(/安保|security|保安|24|guard/i)) d = <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z" />;
  else if (has(/地铁|metro|巴士|bus|接驳|站|桥|bridge|连通/i)) d = <><rect x="6" y="4" width="12" height="12" rx="2" /><path d="M6 11h12M9 16l-1.5 3M15 16l1.5 3M9.5 8h.5M14 8h.5" /></>;
  else d = <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></>;
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

// imgframe（无图→纯色占位；有图→本地 webp + 可选 caption）
function Frame({ img, cap, contain = false, className = '' }) {
  return (
    <div className={`imgframe ${className}`}>
      {img ? <img src={img.src} alt={img.alt || ''} style={contain ? { objectFit: 'contain', padding: 12 } : undefined} /> : null}
      {img && cap ? <div className="imgcap">{cap}</div> : null}
    </div>
  );
}

export default function ProjectLandingV5({ data }) {
  const d = data;
  const { hero, facts, overview, highlights, location, productDetails, amenities, unit, community, developer } = d;

  return (
    <div className="cwv5">
      <style dangerouslySetInnerHTML={{ __html: V5_CSS + V5_SUPPLEMENT }} />

      {/* NAV（共享 v5 象牙白 chrome · 锚点全列十段新顺序：概况→亮点→地段→产品→公共配套→社区→开发商→户型价格） */}
      <V5Nav
        askHref={d.askHref}
        links={[
          { href: '#overview', label: '项目概况' },
          ...(highlights ? [{ href: '#highlights', label: '核心亮点' }] : []),
          ...(location ? [{ href: '#location', label: '地段位置' }] : []),
          ...(productDetails ? [{ href: '#product', label: '产品细节' }] : []),
          ...(amenities ? [{ href: '#amenities', label: '公共配套' }] : []),
          ...(community ? [{ href: '#community', label: '社区生活' }] : []),
          ...(developer ? [{ href: '#developer', label: '开发商' }] : []),
          { href: '#unit', label: '户型价格' },
        ]}
      />

      {/* HERO（收束版 · 左区：眉标+大标题+一句 tagline+CTA 双键 + CTA 下方紧凑四格；
          右图=横版 3:2 圆角，图上零悬浮标签；左右 align-items:center，四格令左栏底边≈图底对齐） */}
      <section className="hero"><div className="wrap"><div className="hero-inner">
        <div className="hero-left">
          <span className="hero-tag">{hero.tag}</span>
          <h1>{hero.h1}{hero.em ? <em>{hero.em}</em> : null}</h1>
          <div className="hero-en">{hero.en}</div>
          {hero.tagline ? <p className="hero-tagline">{hero.tagline}</p> : null}
          <div className="hero-cta-row">
            <a href={d.askHref} className="btn btn-red">智能投顾分析 · 生成报告 <span className="arrow">→</span></a>
            <a href="#overview" className="btn btn-ghost">了解项目 <span className="arrow">↓</span></a>
          </div>
          {/* 紧凑四格（2×2 · v5 眉标+数值语言 · 轻量无重底色）：预售状态/交付时间/起售价(护栏)/户型 ·
              起售价为全页首屏唯一出现处（下方 7 格信息带不再含起售价） */}
          <div className="hero-stats">
            {hero.stats.map((m, i) => (
              <div className={`hs${m.isPrice ? ' price' : ''}`} key={i}>
                <div className="hs-k">{m.k}</div>
                <div className="hs-v">{m.v}
                  {m.note ? <div className="hs-n"><IconLock cls="lk" />{m.note}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hero-right">
          <Frame img={hero.image} />
        </div>
      </div></div></section>

      {/* 全宽信息带（收束版 · 原 keyband + facts 两条并成一行 · 单行 7 格 / 移动端 2 列网格）：
          物业类型/面积区间/业权/黄金签证/付款结构/开发商(DFP-5+方法论链)/所在社区 ·
          与首屏左栏四格零重复，起售价只在左栏出现，本带绝不再现起售价 */}
      <div className="facts"><div className="wrap"><div className="facts-in facts-6">
        {facts.map((f, i) => (
          <div className="fact" key={i}>
            <div className="fk">{f.k}</div>
            <div className="fv">{f.v}{f.small ? <small>{f.small}</small> : null}</div>
            {f.lockn ? <div className="lockn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconLock cls="lk" />{f.lockn}</div> : null}
          </div>
        ))}
      </div></div></div>

      {/* OVERVIEW */}
      <section className="sec" id="overview"><div className="wrap">
        <div className="ov-inner">
          <div className="ov-text reveal">
            <div className="eyebrow">{overview.eyebrow}</div>
            <h2 className="h2">{overview.h2Line}<br /><em>{overview.h2Em}</em></h2>
            {overview.paras.map((t, i) => (
              <p key={i} style={i === 0 ? { marginTop: 22 } : undefined}>
                {i === 0 ? <span className="lead">{t}</span> : t}
              </p>
            ))}
          </div>
          <div className="ov-stats reveal">
            {overview.stats.map((s, i) => (
              <div className="ov-stat" key={i}>
                <div className="n">{s.n}{s.unit ? <span>{s.unit}</span> : null}</div>
                <div className="l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div></section>

      {/* 段 3 · 核心亮点 HIGHLIGHTS（v5 编号排版） */}
      {highlights && (
        <section className="sec alt" id="highlights"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">{highlights.eyebrow}</div>
            <h2 className="h2">{highlights.h2Line}<em>{highlights.h2Em}</em></h2>
          </div>
          <ol className="hl-grid reveal">
            {highlights.items.map((t, i) => (
              <li className="hl-item" key={i}>
                <span className="hl-num">{String(i + 1).padStart(2, '0')}</span>
                <p className="hl-text">{t}</p>
              </li>
            ))}
          </ol>
        </div></section>
      )}

      {/* 段 4 · 地段位置 LOCATION（免密钥 Google Maps 嵌入 + 距离表；有 area 素材则并列一带） */}
      {location && (
        <section className="sec" id="location"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">{location.eyebrow}</div>
            <h2 className="h2">{location.h2Line}<em>{location.h2Em}</em>{location.h2Tail}</h2>
          </div>
          <div className="loc-inner">
            <div className="loc-map reveal">
              <iframe
                className="loc-embed"
                src={location.mapEmbed}
                title={`${d.name} 位置地图 · ${location.mapQuery}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
                allowFullScreen
              />
              <div className="loc-embed-cap">{location.mapCap}</div>
            </div>
            <div className="reveal">
              <ul className="dist-list">
                {location.distances.map((r, i) => (
                  <li key={i}><span className="dm">{r.dm}</span><span className="dl">{r.dl}</span></li>
                ))}
              </ul>
              {location.conn && <p className="conn">{location.conn}</p>}
            </div>
          </div>
          {location.areaImg && (
            <div className="loc-band reveal"><Frame img={location.areaImg} cap={location.areaCap} /></div>
          )}
        </div></section>
      )}

      {/* 段 5 · 产品细节 PRODUCT DETAILS（弹性 · 楼书素材展开；无则整章省略） */}
      {productDetails && (
        <section className="sec alt" id="product"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">{productDetails.eyebrow}</div>
            <h2 className="h2">{productDetails.h2Line}<em>{productDetails.h2Em}</em></h2>
          </div>
          <div className="pdx-list">
            {productDetails.blocks.map((b, i) => (
              <div className={`pdx-block reveal${b.img ? '' : ' pdx-textonly'}${i % 2 ? ' pdx-rev' : ''}`} key={i}>
                {b.img && <Frame img={b.img} cap={b.img.caption} className="pdx-media" />}
                <div className="pdx-body">
                  <div className="pdx-idx">产品细节 · {String(i + 1).padStart(2, '0')}</div>
                  {b.title && <h3 className="pdx-title">{b.title}</h3>}
                  {b.body && <p className="pdx-text">{b.body}</p>}
                </div>
              </div>
            ))}
          </div>
        </div></section>
      )}

      {/* 段 6 · 公共配套 AMENITIES */}
      {amenities && (
        <section className="sec" id="amenities"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">{amenities.eyebrow}</div>
            <h2 className="h2">{amenities.h2Line}<em>{amenities.h2Em}</em></h2>
          </div>
          <div className="am-grid reveal">
            {amenities.items.map((a, i) => (
              <div className="am" key={i}><AmenityIcon label={a} cls="ai" /><span className="at">{a}</span></div>
            ))}
          </div>
          {amenities.band && <div className="am-band reveal"><Frame img={amenities.band} cap={amenities.bandCap} /></div>}
        </div></section>
      )}

      {/* 段 7 · 社区生活 COMMUNITY（片区卡 + 参考价带护栏 + 进入社区页互链） */}
      {community && (
        <section className="sec alt" id="community"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">{community.eyebrow}</div>
            <h2 className="h2">{community.h2Line}<br /><em>{community.h2Em}</em></h2>
            {community.blurb && <p>{community.blurb}</p>}
          </div>
          {community.cards.length > 0 && (
            <div className="mp-grid reveal">
              {community.cards.map((c, i) => (
                <div className="mp-card" key={i}>
                  <div className="ic"><AmenityIcon label={c.iconKey} cls="mpi" /></div>
                  <div className="mp-card-tag">{c.tag}</div>
                  <div className="mp-card-title">{c.title}</div>
                  <div className="mp-card-desc">{c.desc}</div>
                </div>
              ))}
            </div>
          )}
          {community.priceBand && (
            <div className="cm-price reveal">
              <div className="cm-price-h">{community.priceBand.title}
                <span className="cm-badge"><IconLock cls="lk" />{community.priceBand.badge}</span>
              </div>
              <table className="cm-table">
                <thead><tr><th>户型</th><th>物业</th><th>参考售价</th><th>参考年租</th><th>参考回报</th></tr></thead>
                <tbody>
                  {community.priceBand.rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.type}</td><td>{r.propertyType}</td>
                      <td className="lat">{r.sale}</td><td className="lat">{r.rent}</td><td className="lat">{r.roi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="cm-src">数据来源 · {community.priceBand.source}。{community.priceBand.note}</div>
            </div>
          )}
          <div className="link-grid reveal" style={{ gridTemplateColumns: '1fr' }}>
            <div className="linkcard">
              <div className="lc-top">
                <div><div className="lc-eye">所在社区 · Community</div><div className="lc-name">{community.link.name}</div>{community.link.cn && <div className="lc-cn">{community.link.cn}</div>}</div>
                {community.link.isHot && <span className="hot">热门片区</span>}
              </div>
              {community.link.tags.length > 0 && (
                <div className="lc-chips">
                  {community.link.tags.map((t, i) => <span className="lc-chip" key={i}>{t.en}{t.cn ? ` ${t.cn}` : ''}</span>)}
                </div>
              )}
              {community.link.blurb && <p className="lc-blurb">{community.link.blurb}</p>}
              <Link className="lc-link" href={community.link.href}>进入 {community.link.name} 社区详情页 <span className="arrow">→</span></Link>
            </div>
          </div>
        </div></section>
      )}

      {/* 段 8 · 开发商简介 DEVELOPER（DFP-5 评级带 + 进入开发商页互链） */}
      {developer && (
        <section className="sec" id="developer"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">{developer.eyebrow}</div>
            <h2 className="h2">{developer.h2}</h2>
            {developer.p && <p>{developer.p}</p>}
          </div>
          <div className="link-grid reveal" style={{ gridTemplateColumns: '1fr' }}>
            <div className="linkcard">
              <div className="lc-top">
                <div><div className="lc-eye">开发商 · Developer</div><div className="lc-name">{developer.name}</div>{developer.cn && <div className="lc-cn">{developer.cn}</div>}</div>
                {developer.rated && (
                  <div className="maple">
                    <MapleLeaves leaves={developer.leaves} size={15} />
                    <span className="tier">丹枫评级 · {developer.score}{developer.version ? ` · ${developer.version}` : ''}</span>
                  </div>
                )}
              </div>
              {developer.chips.length > 0 && (
                <div className="lc-chips">
                  {developer.chips.map((c, i) => <span className="lc-chip" key={i}>{c.k} <b>{c.v}</b></span>)}
                </div>
              )}
              {developer.blurb && <p className="lc-blurb">{developer.blurb}</p>}
              <Link className="lc-link" href={developer.href}>进入 {developer.name} 开发商详情页 <span className="arrow">→</span></Link>
            </div>
          </div>
        </div></section>
      )}

      {/* 段 9 · 户型价格 UNIT（价格压轴 · 户型卡 + 付款计划块 + 指导价格汇总行 → 随即 CTA） */}
      <section className="sec alt" id="unit"><div className="wrap">
        <div className="unit-hero">
          <div className="unit-text reveal">
            <div className="eyebrow">{unit.eyebrow}</div>
            <h2 className="h2">{unit.h2Line}<br /><em>{unit.h2Em}</em></h2>
            {unit.paras.map((t, i) => <p key={i} style={i === 0 ? { marginTop: 20 } : undefined}>{t}</p>)}
            <a href={d.askHref} className="btn btn-gold" style={{ marginTop: 8 }}>索取户型图与报价 <span className="arrow">→</span></a>
          </div>
          <Frame img={unit.heroImg} cap={unit.heroCap} className="reveal" />
        </div>
        {unit.floors.length > 0 && (
          <div className="floors reveal">
            {unit.floors.map((fl, i) => (
              <div className={`floor${fl.isPh ? ' ph' : ''}`} key={i}>
                <div className="floor-num">{fl.num}<span>{fl.unitLabel}</span></div>
                <div className="floor-name">{fl.name}</div>
                <ul className="floor-list">
                  {fl.rows.map((r, j) => <li key={j}><span>{r.k}</span><span>{r.v}</span></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {/* 付款计划块（并入本章） */}
        {unit.payment && (
          <div className="pay-block reveal">
            <div className="pay-head">付款计划{unit.payment.structure ? <span className="pay-struct">{unit.payment.structure}</span> : null}</div>
            <div className="pay-steps">
              {unit.payment.milestones.map((m, i) => (
                <div className="pay-step" key={i}>
                  {m.percent ? <div className="pay-pct">{m.percent}</div> : null}
                  <div className="pay-stage">{m.stage}</div>
                  {m.note ? <div className="pay-note">{m.note}</div> : null}
                </div>
              ))}
            </div>
            {unit.payment.note && <p className="conn" style={{ marginTop: 14 }}>{unit.payment.note}</p>}
          </div>
        )}
        {/* 收尾「指导价格」汇总行（护栏口径） */}
        {unit.priceSummary && (
          <div className="price-sum reveal">
            <div className="ps-k">{unit.priceSummary.label}</div>
            <div className="ps-v"><IconLock cls="lk" />{unit.priceSummary.value}</div>
            <div className="ps-n">{unit.priceSummary.note}</div>
          </div>
        )}
        {unit.note && <p className="conn" style={{ marginTop: 18 }}>{unit.note}</p>}
      </div></section>

      {/* 段 10 · CTA（共享深色块 · 双路径：智能投顾[AI 对话+报告] + 加微信[顾问]） */}
      <V5Cta
        askHref={d.askHref}
        heading="这个盘，究竟适不适合你？"
        intro="两条路径任选：让丹枫 AI 智能投顾在线对话分析你的需求并生成投资报告，或直接咨询持牌顾问（微信）获取真实报价与线下看房。透明、专业、不催单。"
      />

      {/* FOOTER（共享 v5 象牙白 chrome） */}
      <V5Footer
        disclaimer={
          <p style={{ marginTop: 10 }}>本页所有价格、户型、面积与配套信息均为项目结构性介绍，<b style={{ color: 'var(--ink-soft)' }}>不构成要约或实时报价</b>；具体可售房源、价格、面积与优惠以丹枫持牌顾问确认为准。项目图片与楼书内容版权归开发商所有，仅作项目介绍使用。AI 匹配结果仅供参考，不构成投资建议，投资有风险，决策需谨慎。</p>
        }
      />

      <V5Enhance />
    </div>
  );
}
