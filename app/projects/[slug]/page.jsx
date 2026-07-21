// ============================================================
// /projects/<slug> — 项目详情页（骨架 · 设计规格 §6）+ 富内容渐进增强
// 服务端渲染 + SSG（generateStaticParams 预生成全量 slug）。
// 渐进增强：存在 content/projects/<slug>.json 时渲染「富内容版」
//   （hero 图集 / 导语 / 卖点 / 户型表 / 付款计划 / 区位配套景观 /
//    楼书下载 / 视频位），并在下方保留社区画像 + 开发商 DFP-5 背书；
//   无 JSON 的项目保持原骨架页不变（无图亦成立）。
// 起价一律护栏；零市场敏感字段（沿用 catalog 只读 AI 可读字段）。
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  PROJECTS, findProjectBySlug, projectSlug, similarProjects, gvBucket,
  EMIRATES, getDeveloper, getCommunity, CATALOG_UPDATED, askHref,
  communitySlug, developerSlug, isCurrentDfp5, getAssets, getHeroImages,
} from '@/lib/catalog';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ProjectCard from '@/components/ProjectCard';
import MapleRating from '@/components/MapleRating';
import CommunityProfile from '@/components/CommunityProfile';
import DeveloperRatingCard from '@/components/DeveloperRatingCard';
import ProjectHeroGallery from '@/components/ProjectHeroGallery';
import ProjectLandingV5 from '@/components/ProjectLandingV5'; // 退居备份：v5 象牙白版（保留代码，暂不作为默认渲染路径）
import ProjectLandingTilal from '@/components/ProjectLandingTilal'; // 正式视觉母版：Tilal 暗调影院版（LEO 2026-07-12 定案）
import { buildProjectPageData } from '@/lib/projectPageData';
import { SHOW_EXTERNAL_DEV_LINKS, SHOW_BROCHURE } from '@/lib/flags';
import { STANDALONE_PROJECT_SLUGS } from '@/lib/standalonePages';

const strip = (s) => String(s || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
const GV_LABEL = { fit: '适配', below: '门槛以下', pending: '待核' };

// —— 区位距离字符串解析（"名称 · 约 5 分钟" → { label, mins }）——
const distMins = (s) => { const m = String(s).match(/(\d+)\s*分钟/); return m ? parseInt(m[1], 10) : null; };
const distLabel = (s) => String(s).split('·')[0].replace(/\s+$/, '').trim();

// —— SVG 线性图标库（viewBox 0 0 24 24 · stroke currentColor · 禁 emoji）——
// 依配套名称关键字匹配；未命中回落 check-circle。全部复用到 700 页。
function AmenityIcon({ label }) {
  const t = String(label);
  const has = (re) => re.test(t);
  let d;
  if (has(/泳池|泳|pool/i)) d = <><path d="M2 16c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0 2.8-1 4.2 0" /><path d="M2 20c1.4 1 2.8 1 4.2 0s2.8-1 4.2 0 2.8 1 4.2 0 2.8-1 4.2 0" /><path d="M8 14V5a2 2 0 0 1 4 0M16 14V5a2 2 0 0 0-4 0" /></>;
  else if (has(/健身|gym|fitness/i)) d = <path d="M6.5 6.5v11M17.5 6.5v11M4 9v6M20 9v6M6.5 12h11" />;
  else if (has(/瑜伽|yoga/i)) d = <><circle cx="12" cy="4.5" r="1.8" /><path d="M12 6.3v6M6 21l6-8 6 8M8 11h8" /></>;
  else if (has(/办公|office|联合办公|co-?work/i)) d = <><path d="M4 21V8l8-5 8 5v13" /><path d="M9 21v-5h6v5M9 9h.5M14.5 9h.5M9 12.5h.5M14.5 12.5h.5" /></>;
  else if (has(/多功能|厅|hall|活动/i)) d = <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 8h.5M12 8h.5M16 8h.5M8 12h.5M12 12h.5M16 12h.5M8 16h.5M12 16h.5M16 16h.5" /></>;
  else if (has(/儿童|游乐|kid|child|play/i)) d = <path d="M12 3l2.1 5.3L20 9l-4.3 3.6L17 19l-5-3-5 3 1.3-6.4L4 9l5.9-.7z" />;
  else if (has(/园|景|平台|deck|podium|garden|park|绿/i)) d = <><path d="M12 3C9.2 6.5 8 9 8 11.5a4 4 0 0 0 8 0C16 9 14.8 6.5 12 3z" /><path d="M12 14v7" /></>;
  else if (has(/球|运动|padel|sport|court|网球/i)) d = <><circle cx="12" cy="12" r="9" /><path d="M4.5 7c4 2 11 2 15 0M4.5 17c4-2 11-2 15 0" /></>;
  else if (has(/烧烤|bbq|barbecue|烤/i)) d = <><path d="M12 3c3 3 4.4 6 4.4 8.8a4.4 4.4 0 0 1-8.8 0c0-1.4.5-2.7 1.5-3.9.3 1 1 1.6 1.8 2C10 8 10.5 5.5 12 3z" /></>;
  else if (has(/餐|零售|retail|rikas|dining|shop|restaurant|咖啡|cafe/i)) d = <path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.6 0-2.2 2.2-2.2 4.2S15.4 11 17 11v10" />;
  else if (has(/码头|步道|滨水|marina|water|运河|河|creek|游艇/i)) d = <><circle cx="12" cy="4.5" r="1.8" /><path d="M12 6.3V20M5 12a7 7 0 0 0 14 0M5 12h2.5M16.5 12H19" /></>;
  else if (has(/安保|security|保安|24|guard/i)) d = <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6z" />;
  else if (has(/地铁|metro|巴士|bus|接驳|站/i)) d = <><rect x="6" y="4" width="12" height="12" rx="2" /><path d="M6 11h12M9 16l-1.5 3M15 16l1.5 3M9.5 8h.5M14 8h.5" /></>;
  else d = <><circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" /></>;
  return <svg className="pdr-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
}

// —— 区位同心圆雷达图（分钟数分环）+ SVG 时间行 ——
function LocationRadar({ distances = [], connectivity = [] }) {
  const items = distances
    .map((d) => ({ label: distLabel(d), mins: distMins(d) }))
    .filter((x) => x.mins != null);
  if (!items.length) return null;
  const cx = 190, cy = 190, rMax = 158, rMin = 36;
  const maxM = Math.max(...items.map((i) => i.mins), 40);
  const scale = (m) => rMin + (m / maxM) * (rMax - rMin);
  const pts = items.map((it, i) => {
    const ang = -Math.PI / 2 + i * ((2 * Math.PI) / items.length);
    const r = scale(it.mins);
    return { ...it, x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
  });
  const rings = [...new Set([10, 25, maxM].filter((v) => v <= maxM))].map(scale);
  const sorted = [...items].sort((a, b) => a.mins - b.mins);
  return (
    <div className="pd-loc2">
      <div className="pd-map">
        <svg viewBox="0 0 380 380" role="img" aria-label="区位同心圆通勤示意图">
          <defs>
            <radialGradient id="pdmapg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2a1f1a" />
              <stop offset="100%" stopColor="#15131a" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={rMax} fill="url(#pdmapg)" stroke="rgba(173,142,95,.28)" />
          {rings.map((r, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(173,142,95,.35)" strokeWidth="1" strokeDasharray="3 5" />
          ))}
          {pts.map((pt, i) => (
            <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="rgba(173,142,95,.18)" strokeWidth="1" />
          ))}
          {pts.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="5" fill="#C9A86E" stroke="#15131a" strokeWidth="1.5" />
              <text x={pt.x} y={pt.y - 10} fill="#EDE7DC" fontSize="12" fontFamily="Manrope, sans-serif" textAnchor="middle">{pt.mins}′</text>
            </g>
          ))}
          <circle className="pd-map-pulse" cx={cx} cy={cy} r="5" fill="none" stroke="#C9A86E" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="5.5" fill="#CE1C24" />
          <text x={cx} y={cy + 22} fill="#C9A86E" fontSize="12" fontFamily="Manrope, sans-serif" textAnchor="middle" letterSpacing="1">本项目</text>
        </svg>
      </div>
      <div>
        <ul className="pd-time-list">
          {sorted.map((it, i) => (
            <li className="pd-time-row" key={i}>
              <span className="pd-time-mins">{it.mins}<span>分钟</span></span>
              <span className="pd-time-label">{it.label}</span>
            </li>
          ))}
        </ul>
        {connectivity.length > 0 && (
          <ul className="pd-conn">
            {connectivity.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

// 富内容 JSON 载入（构建期 SSG 读取；不存在则返回 null → 回落骨架页）。
function loadRich(slug) {
  try {
    const p = join(process.cwd(), 'content', 'projects', `${slug}.json`);
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  // 独立 HTML 母版页（public/projects/<slug>/index.html + next.config 重写）从 SSG 排除，
  // 避免与静态页在 /projects/<slug> 冲突。
  return PROJECTS
    .map((p) => ({ slug: projectSlug(p) }))
    .filter((x) => !STANDALONE_PROJECT_SLUGS.includes(x.slug));
}

export function generateMetadata({ params }) {
  const p = findProjectBySlug(params.slug);
  if (!p) return { title: '项目未找到 | 丹枫置业' };
  const cn = p.cn ? ` ${p.cn}` : '';
  const blurb = String(p.blurb || '').slice(0, 80);
  const start = strip(p.startHint) || '价格请咨询顾问';
  return {
    title: `${p.name}${cn} · ${p.area} ${p.developer} 期房 | 丹枫置业`,
    description: `${blurb} · 起价示意 ${start}·非实时报价 · 交付 ${strip(p.handover) || '待定'} · 黄金签证${GV_LABEL[gvBucket(p.gv)]}。开发商 DFP-5 评级与社区画像见丹枫研究。`,
    alternates: { canonical: `/projects/${projectSlug(p)}` },
  };
}

export default function ProjectDetail({ params }) {
  // 独立 HTML 母版页由 next.config 重写到静态文件；若因任何原因走到本动态路由则不渲染旧版。
  if (STANDALONE_PROJECT_SLUGS.includes(params.slug)) notFound();
  const p = findProjectBySlug(params.slug);
  if (!p) notFound();
  // 全量跑第 2 棒（LEO 2026-07-12）：全部 1705 项目统一走 Tilal 暗调影院母版。
  // 不再要求 content/projects/<slug>.json 存在 —— rich 缺省传 {}；装配器全兜底
  // （户型缺省回落 subitems-index，弹性段自然省略），售态严格绑 catalog.status。
  // 下方 ProjectDetailSkeleton 为退役骨架页逻辑，代码保留、不再作为渲染路径。
  const rich = loadRich(projectSlug(p)) || {};
  return <ProjectLandingTilal data={buildProjectPageData(p, rich)} />;
}

// 退役骨架页（代码保留 · 全量切 Tilal 后不再被调用，仅供回滚参考）。
// 保留原「无富内容 → 渐进增强骨架页 / v5 富内容 → Tilal」双分支逻辑。
function ProjectDetailSkeleton({ params }) {
  const p = findProjectBySlug(params.slug);
  if (!p) notFound();
  const rich = loadRich(projectSlug(p));

  // —— 富内容路由切换（历史逻辑保留）——
  if (rich && rich.template === 'v5') {
    return <ProjectLandingTilal data={buildProjectPageData(p, rich)} />;
  }

  const e = EMIRATES[p.emirate] || ['e1', p.emirate];
  const dev = getDeveloper(p.developer);
  const rated = isCurrentDfp5(dev); // 旧版残留分数不展示（前端只认当前版本分数）
  const sold = /sold/i.test(p.status || '');
  const coming = /coming/i.test(p.status || '');
  const statusLabel = sold ? '已售罄' : coming ? '即将开盘' : '在售';
  const gb = gvBucket(p.gv);
  const start = strip(p.startHint);
  const priceText = start
    ? (/\d/.test(start) ? `${start} · 示意·非实时报价` : start)
    : '起价待更新 · 价格请咨询顾问';
  const similar = similarProjects(p, 4);
  // 素材台账：详情图集真图（优先于富内容 JSON 的占位 hero）+ 楼书（仅本地）。
  const assets = getAssets(projectSlug(p));
  const manifestHero = getHeroImages(p); // [{src,alt}]，无图 → []
  // 楼书：SHOW_BROCHURE=true 时**仅**认 manifest 本地 brochure（/brochures/…）；
  // 绝不回落 catalog/rich 的 brochureUrl（可能残留 bit.ly 等外链）。
  const brochureUrl = (SHOW_BROCHURE && assets && assets.brochure) ? assets.brochure : '';

  return (
    <>
      <Nav />
      <main className="proj-page pd-page" id="top">
        {/* ① Hero */}
        <header className={`pd-hero pd-${e[0]}` + ((rich || manifestHero.length) ? ' pd-hero-rich' : '')}>
          <div className="wrap">
            <Link className="pd-back" href="/projects">← 返回精选项目</Link>
            <div className={(rich || manifestHero.length) ? 'pd-hero-grid pd-hero-grid-rich' : 'pd-hero-grid'}>
              <div className="pd-hero-main">
                <span className={'pd-status ' + (sold ? 'so' : coming ? 'cs' : 'av')}><i />{statusLabel}</span>
                <h1>{p.name}</h1>
                {(rich?.cn || p.cn) && <div className="pd-cn">{rich?.cn || p.cn}</div>}
                {rich?.tagline && <div className="pd-tagline">{rich.tagline}</div>}
                <div className="pd-loc">
                  {p.area} · {p.developer}
                  {rated && <MapleRating dfp5={dev.dfp5} variant="mini" size={14} />}
                </div>
                <div className="pd-band">
                  <div><span>城市</span><b>{e[1]}</b></div>
                  <div><span>类型</span><b>{strip(p.types) || '—'}</b></div>
                  <div><span>交付</span><b>{(rich && strip(rich.handover)) || strip(p.handover) || '待定'}</b></div>
                  <div><span>起价</span><b>{start || '待更新'}</b></div>
                  {gb !== 'pending' && <div><span>黄金签证</span><b>{GV_LABEL[gb]}</b></div>}
                </div>
                <div className="pd-cta">
                  <a className="btn btn-red" href={askHref(p)}>让 AI 分析这个项目 →</a>
                  <a className="btn btn-ghost" href="/#contact">加顾问</a>
                </div>
              </div>
              {/* hero 图区：优先素材台账真图（manifest heroImages）→ 富内容 JSON 占位图 →
                  品牌色块兜底（无图即终态）。骨架版有真图也走图集升级（单图即单张 hero）。 */}
              {(manifestHero.length || rich?.hero?.length) ? (
                <ProjectHeroGallery images={manifestHero.length ? manifestHero : rich.hero} projectName={p.name} />
              ) : (
                <div className="pd-hero-art">
                  <div className="pd-art-name">{p.name}</div>
                  {rated && <MapleRating dfp5={dev.dfp5} variant="full" size={18} />}
                  <div className="pd-art-src">丹枫研究 · DLD · DXB Interact</div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* —— 富内容版：交替配色分章 deep→paper→ink→paper→ink→paper2→deep→paper —— */}
        {rich ? (
          <>
            {/* ② 投资逻辑 thesis 开篇（先 WHY 立论）· 浅章 paper */}
            {rich.thesis?.length > 0 && (
              <section className="pd-band pd-band-paper pd-lt">
                <div className="wrap">
                  <div className="pd-sec">
                    <div className="pd-shead">
                      <span className="eyebrow">Investment Thesis</span>
                      <h2>投资逻辑 · 为何是此标的</h2>
                    </div>
                    <div className="pd-thesis-grid">
                      {rich.thesis.map((t, i) => (
                        <div className="pd-thesis-cell" key={i}>
                          <div className="pd-thesis-label">{t.label}</div>
                          <div className="pd-thesis-num">{t.num}{t.unit && <span>{t.unit}</span>}</div>
                          <p className="pd-thesis-desc">{t.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* ③ 概览导语 + 核心卖点 · 深章 ink */}
            <section className="pd-band pd-band-ink">
              <div className="wrap">
                <div className="pd-sec">
                  <div className="pd-shead">
                    <span className="eyebrow">Overview</span>
                    <h2>概览 · 项目定位</h2>
                  </div>
                  {(rich.intro || p.blurb) && <p className="pd-blurb">{rich.intro || p.blurb}</p>}
                  <div className="pd-facts">
                    <div><span>物业类型</span><b>{strip(p.types) || '—'}</b></div>
                    <div><span>户型</span><b>{p.unitInfo || '—'}</b></div>
                    <div><span>交付</span><b>{strip(rich.handover) || strip(p.handover) || '待定'}（以开发商正式文件为准）</b></div>
                    <div><span>起价</span><b>{priceText}</b></div>
                    {(rich.payment?.structure || p.payment) && <div><span>付款</span><b>{rich.payment?.structure || p.payment}（示意，以正式方案为准）</b></div>}
                    {gb === 'fit' && <div><span>黄金签证</span><b>适配（起价已达 AED 200 万门槛）</b></div>}
                    {gb === 'below' && <div><span>黄金签证</span><b>多为门槛以下 · 重身份建议看大户型/别墅</b></div>}
                  </div>
                </div>
                {rich.highlights?.length > 0 && (
                  <div className="pd-sec">
                    <div className="pd-shead">
                      <span className="eyebrow">Highlights</span>
                      <h2>核心卖点</h2>
                    </div>
                    <ul className="pdr-bullets">
                      {rich.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* ④ 户型 floor 卡 + 起价对照表 · 浅章 paper */}
            {rich.unitTypes?.length > 0 && (
              <section className="pd-band pd-band-paper pd-lt">
                <div className="wrap">
                  <div className="pd-sec">
                    <div className="pd-shead">
                      <span className="eyebrow">Unit Types</span>
                      <h2>户型与空间</h2>
                    </div>
                    <div className="pd-floors">
                      {rich.unitTypes.map((u, i) => {
                        const bd = (String(u.type).match(/\d+/) || ['—'])[0];
                        const size = `${u.sizeMinSqft}${u.sizeMaxSqft && u.sizeMaxSqft !== u.sizeMinSqft ? `–${u.sizeMaxSqft}` : ''} sq.ft.`;
                        const price = u.startFromLabel || (u.startFromAED ? `AED ${Number(u.startFromAED).toLocaleString()} 起` : '咨询顾问');
                        return (
                          <div className="pd-floor" key={i}>
                            <div className="pd-floor-num">{bd}<span>居</span></div>
                            <div className="pd-floor-type">{u.type}</div>
                            <ul className="pd-floor-list">
                              <li><span>建筑面积</span><span>{size}</span></li>
                              <li><span>起价示意</span><span>{price.replace(/（[^）]*）/g, '').trim()}</span></li>
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pdr-tablewrap" style={{ marginTop: '28px' }}>
                      <table className="pdr-table">
                        <thead>
                          <tr><th>户型</th><th>面积（sq.ft.）</th><th>起价示意</th></tr>
                        </thead>
                        <tbody>
                          {rich.unitTypes.map((u, i) => (
                            <tr key={i}>
                              <td>{u.type}</td>
                              <td>{u.sizeMinSqft}{u.sizeMaxSqft && u.sizeMaxSqft !== u.sizeMinSqft ? `–${u.sizeMaxSqft}` : ''}</td>
                              <td>{u.startFromLabel || (u.startFromAED ? `AED ${Number(u.startFromAED).toLocaleString()} 起` : '咨询顾问')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rich.unitNote && <p className="pdr-note">{rich.unitNote}</p>}
                  </div>
                </div>
              </section>
            )}

            {/* ⑤ 付款计划 + 区位同心圆雷达 · 深章 ink */}
            {(rich.payment?.milestones?.length > 0 || rich.location?.distances?.length > 0) && (
              <section className="pd-band pd-band-ink">
                <div className="wrap">
                  {rich.payment?.milestones?.length > 0 && (
                    <div className="pd-sec">
                      <div className="pd-shead">
                        <span className="eyebrow">Payment Plan</span>
                        <h2>付款计划</h2>
                      </div>
                      <div className="pdr-pay">
                        {rich.payment.milestones.map((m, i) => (
                          <div className="pdr-payitem" key={i}>
                            <b>{m.percent}</b>
                            <span>{m.stage}</span>
                            {m.note && <em>{m.note}</em>}
                          </div>
                        ))}
                      </div>
                      {rich.payment.note && <p className="pdr-note">{rich.payment.note}</p>}
                    </div>
                  )}
                  {rich.location?.distances?.length > 0 && (
                    <div className="pd-sec">
                      <div className="pd-shead">
                        <span className="eyebrow">Location</span>
                        <h2>区位与通勤</h2>
                      </div>
                      <LocationRadar distances={rich.location.distances} connectivity={rich.location.connectivity || []} />
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ⑥ 配套 SVG 图标网格 + 景观 · 浅章 paper2 */}
            {(rich.amenities?.length > 0 || rich.views?.length > 0 || rich.communityFacts?.length > 0 || rich.video) && (
              <section className="pd-band pd-band-paper2 pd-lt">
                <div className="wrap">
                  {rich.amenities?.length > 0 && (
                    <div className="pd-sec">
                      <div className="pd-shead">
                        <span className="eyebrow">Amenities</span>
                        <h2>配套设施</h2>
                      </div>
                      <ul className="pdr-icons">
                        {rich.amenities.map((a, i) => (
                          <li key={i}><AmenityIcon label={a} /><span>{a}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(rich.views?.length > 0 || rich.communityFacts?.length > 0) && (
                    <div className="pd-sec">
                      <div className="pd-shead">
                        <span className="eyebrow">Views</span>
                        <h2>景观与社区量级</h2>
                      </div>
                      <div className="pdr-cols">
                        {rich.views?.length > 0 && (
                          <div className="pdr-col">
                            <h3>景观朝向</h3>
                            <ul className="pdr-list">{rich.views.map((v, i) => <li key={i}>{v}</li>)}</ul>
                          </div>
                        )}
                        {rich.communityFacts?.length > 0 && (
                          <div className="pdr-col">
                            <h3>社区量级</h3>
                            <ul className="pdr-list">{rich.communityFacts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {rich.video && (
                    <div className="pd-sec">
                      <div className="pd-shead">
                        <span className="eyebrow">Video</span>
                        <h2>项目视频</h2>
                      </div>
                      <div className="pdr-video">
                        <iframe
                          src={rich.video.replace('watch?v=', 'embed/')}
                          title={`${p.name} 项目视频`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ⑦ 社区 + 开发商背书 + 相似 · 深章 deep */}
            <section className="pd-band pd-band-deep">
              <div className="wrap">
                {getCommunity(p.area) && (
                  <div className="pd-sec">
                    <div className="pd-shead">
                      <span className="eyebrow">Community</span>
                      <h2>位置与社区</h2>
                    </div>
                    <CommunityProfile area={p.area} compact={false} />
                    <Link className="btn btn-ghost pd-xlink" href={`/communities/${communitySlug(getCommunity(p.area))}`}>
                      查看 {getCommunity(p.area).name} 社区详情 →
                    </Link>
                  </div>
                )}
                {dev && (
                  <div className="pd-sec">
                    <div className="pd-shead">
                      <span className="eyebrow">Developer · DFP-5</span>
                      <h2>开发商背书</h2>
                    </div>
                    <DeveloperRatingCard developer={p.developer} />
                    <Link className="btn btn-ghost pd-xlink" href={`/developers/${developerSlug(dev)}`}>
                      查看 {dev.cn || dev.name} 开发商详情 →
                    </Link>
                  </div>
                )}
                {similar.length > 0 && (
                  <div className="pd-sec">
                    <div className="pd-shead">
                      <span className="eyebrow">Similar</span>
                      <h2>相似项目</h2>
                    </div>
                    <div className="pcard-grid pd-similar">
                      {similar.map((s) => <ProjectCard key={s.name} p={s} />)}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ⑧ CTA 双栏（左权益清单 + 右 AI/顾问/报告 三路径深章）· 浅章 paper */}
            <section className="pd-band pd-band-paper pd-lt">
              <div className="wrap">
                <div className="pd-cta2">
                  <div className="pd-cta2-left">
                    <span className="eyebrow">Private Advisory</span>
                    <h2>面向合格投资人的一对一研究对接</h2>
                    <ul className="pd-cta2-list">
                      <li>丹枫研究团队出具项目研究备忘：DFP-5 开发商评级 + 社区画像 + 结构性事实核验。</li>
                      <li>AI 投顾即时解析本项目与您资产配置目标之匹配度。</li>
                      <li>持牌顾问核验实时可售房态、开发商正式价格与付款方案。</li>
                      <li>官方楼书、户型图与合规资料按需提供。</li>
                    </ul>
                    <p className="pd-cta2-note">本页仅展示开盘起价示意（非实时报价）；实时价格与房态以丹枫持牌顾问确认为准，AI 结果仅供参考，不构成投资建议。</p>
                    {SHOW_EXTERNAL_DEV_LINKS && p.landingUrl && <a className="pd-cta2-official" href={p.landingUrl} target="_blank" rel="nofollow noopener noreferrer">开发商官方页 ↗</a>}
                  </div>
                  <div className="pd-cta2-right">
                    <a className="pd-path pd-path-red" href={askHref(p)}>
                      <svg className="pd-path-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.3 3 5.6V19h8v-3.4c1.8-1.3 3-3.2 3-5.6a7 7 0 0 0-7-7z" /><path d="M9.5 22h5" /></svg>
                      <span><b>让 AI 深度分析这个项目</b><span>结合您的目标即时生成研究解析</span></span>
                    </a>
                    <a className="pd-path" href="/#contact">
                      <svg className="pd-path-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 3z" /><path d="M8 9h8M8 12h5" /></svg>
                      <span><b>加顾问微信 · 一对一</b><span>持牌顾问核验房态与正式方案</span></span>
                    </a>
                    {/* 下载楼书 PDF 按钮 2026-07-10 起下架（SHOW_BROCHURE=false → brochureUrl 恒空）；自动回落「向 AI/顾问索取资料」，flag 恢复后自动点亮 */}
                    <a className="pd-path" href={brochureUrl || askHref(p)} {...(brochureUrl ? { target: '_blank', rel: 'nofollow noopener noreferrer' } : {})}>
                      <svg className="pd-path-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M9.5 13h5M9.5 16h5" /></svg>
                      <span><b>{brochureUrl ? '下载楼书 PDF 与研究资料' : '向 AI / 顾问索取资料'}</b><span>官方楼书、户型与合规资料</span></span>
                    </a>
                  </div>
                </div>
                <p className="note-line pp-note">
                  ※ 本页起价为开盘起价示意（非实时报价），交付时间以开发商正式文件为准；具体户型、实时价格与可售房态由丹枫持牌顾问确认。
                  数据来源：开发商官网 · DLD · DXB Interact · 丹枫研究，更新 {rich.meta?.updated || CATALOG_UPDATED}。
                </p>
              </div>
            </section>
          </>
        ) : (
          <div className="wrap pd-body">
            {/* ② 概览 / 导语（骨架页 · 不挂 pd-band，样式零回归）*/}
            <section className="pd-sec">
              <h2>概览 Overview</h2>
              {p.blurb && <p className="pd-blurb">{p.blurb}</p>}
              <div className="pd-facts">
                <div><span>物业类型</span><b>{strip(p.types) || '—'}</b></div>
                <div><span>户型</span><b>{p.unitInfo || '—'}</b></div>
                <div><span>交付</span><b>{strip(p.handover) || '待定'}（以开发商正式文件为准）</b></div>
                <div><span>起价</span><b>{priceText}</b></div>
                {p.payment && <div><span>付款</span><b>{p.payment}（示意，以正式方案为准）</b></div>}
                {gb === 'fit' && <div><span>黄金签证</span><b>适配（起价已达 AED 200 万门槛）</b></div>}
                {gb === 'below' && <div><span>黄金签证</span><b>多为门槛以下 · 重身份建议看大户型/别墅</b></div>}
              </div>
            </section>

            {/* ③ 位置与社区 */}
            {getCommunity(p.area) && (
              <section className="pd-sec">
                <h2>位置与社区</h2>
                <CommunityProfile area={p.area} compact={false} />
                <Link className="btn btn-ghost pd-xlink" href={`/communities/${communitySlug(getCommunity(p.area))}`}>
                  查看 {getCommunity(p.area).name} 社区详情 →
                </Link>
              </section>
            )}

            {/* ⑥ 开发商背书 DFP-5 */}
            {dev && (
              <section className="pd-sec">
                <h2>开发商背书 · DFP-5</h2>
                <DeveloperRatingCard developer={p.developer} />
                <Link className="btn btn-ghost pd-xlink" href={`/developers/${developerSlug(dev)}`}>
                  查看 {dev.cn || dev.name} 开发商详情 →
                </Link>
              </section>
            )}

            {/* ⑦ 相似项目 */}
            {similar.length > 0 && (
              <section className="pd-sec">
                <h2>相似项目</h2>
                <div className="pcard-grid pd-similar">
                  {similar.map((s) => <ProjectCard key={s.name} p={s} />)}
                </div>
              </section>
            )}

            {/* ⑧ 咨询 CTA */}
            <section className="pd-final">
              <a className="btn btn-red" href={askHref(p)}>让 AI 深度分析 →</a>
              <a className="btn btn-gold" href="/#contact">加顾问微信</a>
              {/* 下载楼书 PDF 按钮 2026-07-10 起下架（SHOW_BROCHURE=false）；brochureUrl 已恒为空，此分支保留供恢复时一键点亮 */}
              {SHOW_BROCHURE && brochureUrl && <a className="btn btn-ghost" href={brochureUrl} target="_blank" rel="nofollow noopener noreferrer">下载楼书 PDF</a>}
              {!(SHOW_BROCHURE && brochureUrl) && <a className="btn btn-ghost" href={askHref(p)}>向 AI/顾问索取资料</a>}
              {SHOW_EXTERNAL_DEV_LINKS && p.landingUrl && <a className="pd-official" href={p.landingUrl} target="_blank" rel="nofollow noopener noreferrer">开发商官方页 ↗</a>}
            </section>

            <p className="note-line pp-note">
              ※ 本页起价为开盘起价示意（非实时报价），交付时间以开发商正式文件为准；具体户型、实时价格与可售房态由丹枫持牌顾问确认。
              数据来源：DLD · DXB Interact · 丹枫研究，更新 {CATALOG_UPDATED}。
            </p>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
