// ============================================================
// /developers/<slug> — 开发商详情页（SSG 320 页 · 设计规格 §2）
// 服务端渲染 + generateStaticParams 预生成全量。评级机构式深析：
// Hero → ① 评级面板(DeveloperRatingCard + 雷达) → ② 关键数据仪表
// → ③ Track Record + 简介 → ④ 在售项目 → ⑤ 活跃社区 → ⑥ CTA。
// NR 家诚实降级（中性徽标 + 可得市场事实），不空洞、不出现负面暗示。
// 护栏：CRM/人工星评/Tier 零出现；资本增值标「历史」；d 维用「合规」口径。
// ============================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  DEVELOPERS, findDeveloperBySlug, developerSlug, askDeveloperHref,
  projectsByDeveloper, activeCommunitiesByDeveloper, CATALOG_UPDATED,
  communitySlug, isCurrentDfp5, isStaleDfp5, CURRENT_DFP5_VERSION, getDeveloperLogo,
  projectSlug, findProjectBySlug,
} from '@/lib/catalog';
import { SHOW_EXTERNAL_DEV_LINKS } from '@/lib/flags';
import { STANDALONE_DEVELOPER_SLUGS } from '@/lib/standalonePages.js';
import ProjectCard from '@/components/ProjectCard';
import DeveloperRatingCard from '@/components/DeveloperRatingCard';
import DevRadar from '@/components/DevRadar';
import { MapleLeaves } from '@/components/MapleRating';
import { V5_CSS, V5_SUPPLEMENT, V5_DETAIL_SUPPLEMENT, V5_DEV_CONTENT_SUPPLEMENT } from '@/components/projectLandingV5.styles';
import { V5Nav, V5Cta, V5Footer } from '@/components/V5Chrome';
import V5Enhance from '@/components/V5Enhance';

const round1 = (n) => Math.round(n * 10) / 10;
const OWN_LABEL = { Government: '政府', Private: '私营', 'Public Listed': '上市', 'Local Family': '本地家族' };

// —— trackRecord 脏数据兜底（§2.4）：接受 • 或 - 起头的要点；
//    无 bullet 结构且仅单句（如 Beyond 的脏字）→ 返回空，降级只显示 blurbCn。——
function cleanTrackRecord(tr) {
  if (!tr) return [];
  const raw = String(tr).trim();
  const hasBullet = /(^|\n)\s*[•\-–]/.test(raw) || raw.includes('•');
  const lines = raw.split(/\n|•/).map((s) => s.replace(/^[\s•\-–]+/, '').trim()).filter(Boolean);
  const bullets = lines.filter((l) => l.length >= 8);
  if (!hasBullet && bullets.length <= 1) return [];
  return bullets.slice(0, 10);
}

// —— 内容层 JSON 载入（构建期 SSG 读取 content/developers/<slug>.json）——
//    存在则渐进增强出叙事内容区（品牌故事/里程碑/代表作品/业务版图）；
//    不存在返回 null → 页面保持现状纯数据模板（零回归，同项目页模式）。
function loadDevContent(slug) {
  try {
    const p = join(process.cwd(), 'content', 'developers', `${slug}.json`);
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

// —— 代表作品互链解析：优先 flagship.librarySlug（须命中库内在售项目），
//    否则按 flagship.name 在该开发商在售项目里做大小写不敏感名称匹配；
//    命中返回 /projects/<slug>，未命中返回 null（模板降级为静态卡）。——
function makeFlagshipLinker(devProjects) {
  const byName = new Map();
  for (const p of devProjects) byName.set(String(p.name || '').toLowerCase().trim(), projectSlug(p));
  return (flag) => {
    if (flag && flag.librarySlug && findProjectBySlug(flag.librarySlug)) return `/projects/${flag.librarySlug}`;
    const hit = byName.get(String(flag && flag.name || '').toLowerCase().trim());
    return hit ? `/projects/${hit}` : null;
  };
}

export function generateStaticParams() {
  // WEB-DEV-V1 独立 HTML 档案页（如 beyond）从 SSG 排除：由 public/developers/<slug>/index.html
  // 静态托管 + next.config beforeFiles 重写接管，避免与本动态路由冲突。
  return DEVELOPERS
    .map((d) => ({ slug: developerSlug(d) }))
    .filter((p) => !STANDALONE_DEVELOPER_SLUGS.includes(p.slug));
}

export function generateMetadata({ params }) {
  const d = findDeveloperBySlug(params.slug);
  if (!d) return { title: '开发商未找到 | 丹枫置业' };
  const rated = isCurrentDfp5(d); // 旧版残留分数不进 SEO 标题/描述（前端只认当前版本分数）
  const cn = d.cn ? `${d.cn} ` : '';
  const ratingTag = rated ? ` · 🍁${d.dfp5.leaves} · DFP-5 ${round1(d.dfp5.score)} 分` : '';
  const desc = (d.blurbCn ? String(d.blurbCn).slice(0, 118) : `${d.name} 的 DFP-5 评级、交付与在建规模、资本增值与去化等公开市场事实（DLD · DXB Interact）。`);
  return {
    title: `${cn}${d.name} DFP-5 评级与在售项目${ratingTag}｜丹枫置业`,
    description: desc,
    alternates: { canonical: `/developers/${developerSlug(d)}` },
    openGraph: {
      title: `${cn}${d.name}${ratingTag ? ' · DFP-5 ' + round1(d.dfp5.score) + ' 分' : ''}｜丹枫 DFP-5 独立评级`,
      description: desc,
      type: 'website',
    },
  };
}

function DataCell({ label, value, sub }) {
  return (
    <div className="dev-dash-cell">
      <div className="ddc-v">{value}</div>
      <div className="ddc-l">{label}</div>
      {sub && <div className="ddc-s">{sub}</div>}
    </div>
  );
}

export default function DeveloperDetail({ params }) {
  // 独立 HTML 档案页 slug 交由 public 静态页 + 重写处理，动态路由此处守卫防冲突。
  if (STANDALONE_DEVELOPER_SLUGS.includes(params.slug)) notFound();
  const d = findDeveloperBySlug(params.slug);
  if (!d) notFound();

  const dxb = d.dxb || {};
  const dfp5 = d.dfp5 || {};
  const rated = isCurrentDfp5(d);
  const stale = isStaleDfp5(d); // Rated 但旧版残留分数——中性态「评分更新中」，不显示旧分/旧叶，不标 NR
  const bullets = cleanTrackRecord(d.trackRecord);
  const projects = projectsByDeveloper(d);
  const comms = activeCommunitiesByDeveloper(d);
  const ownLabel = OWN_LABEL[d.ownership] || null;

  // —— 内容层（渐进增强）：品牌故事 / 里程碑 / 代表作品 / 业务版图 ——
  const content = loadDevContent(params.slug);
  const linkFlagship = makeFlagshipLinker(projects);
  const hasContent = !!(content && (content.brandStory ||
    (Array.isArray(content.milestones) && content.milestones.length) ||
    (Array.isArray(content.flagships) && content.flagships.length) || content.business));

  // Hero 元信息行。
  const meta = [];
  if (ownLabel) meta.push(['所有制', ownLabel]);
  if (d.founded) meta.push(['成立', `${d.founded} 年`]);
  if (Number.isFinite(d.employees) && d.employees > 0) meta.push(['员工', `约 ${d.employees.toLocaleString()} 人`]);
  if (d.devNumber) meta.push(['DLD 登记号', d.devNumber]);

  // ② 关键数据仪表格子。
  const cells = [];
  if (Number.isFinite(dxb.deliveredUnits) || Number.isFinite(dxb.deliveredProjects)) {
    cells.push({ label: '交付规模', value: dxb.deliveredUnits != null ? `${dxb.deliveredUnits.toLocaleString()} 套` : '—',
      sub: Number.isFinite(dxb.deliveredProjects) ? `${dxb.deliveredProjects} 个项目已交付` : null });
  }
  if (Number.isFinite(dxb.ucUnits) || Number.isFinite(dxb.ucProjects)) {
    cells.push({ label: '在建规模', value: dxb.ucUnits != null ? `${dxb.ucUnits.toLocaleString()} 套` : '—',
      sub: Number.isFinite(dxb.ucProjects) ? `${dxb.ucProjects} 个项目在建` : null });
  }
  if (Number.isFinite(dxb.capitalGainPct)) {
    cells.push({ label: '历史转售涨幅', value: `${dxb.capitalGainPct > 0 ? '+' : ''}${round1(dxb.capitalGainPct)}%`, sub: '历史市场数据 · 非预期收益' });
  }
  if (Number.isFinite(dxb.absorptionPct)) {
    cells.push({ label: '去化率', value: `${round1(dxb.absorptionPct)}%`, sub: '近 12 月' });
  }
  if (Number.isFinite(dxb.transactionsYtd) || Number.isFinite(dxb.salesValueBn)) {
    cells.push({ label: '近 12 月成交', value: Number.isFinite(dxb.transactionsYtd) ? `${dxb.transactionsYtd.toLocaleString()} 套` : '—',
      sub: Number.isFinite(dxb.salesValueBn) ? `销售额 AED ${round1(dxb.salesValueBn)}B` : null });
  }
  if (Number.isFinite(dxb.rank)) {
    cells.push({ label: 'DXB 综合排名', value: `迪拜第 ${dxb.rank}`, sub: 'DXB Interact 口径' });
  }

  // ②b 合规与履约（指标级，仅 Rated 且有值时出现）。
  const perf = [];
  if (Number.isFinite(dfp5.a2MedianMonths)) {
    perf.push({ label: '交付工期中位', value: `${round1(dfp5.a2MedianMonths)} 个月`,
      sub: Number.isFinite(dfp5.a2Samples) ? `样本 ${dfp5.a2Samples} 个项目` : null });
  }
  if (Number.isFinite(dfp5.a2bOntimeRefPct)) {
    perf.push({ label: '准时交付率', value: `${round1(dfp5.a2bOntimeRefPct)}%`, sub: '同业对比口径' });
  }
  if (Number.isFinite(dfp5.d1EscrowPct)) {
    perf.push({ label: '合规托管覆盖', value: `${round1(dfp5.d1EscrowPct)}%`, sub: '登记合规口径（非资金安全承诺）' });
  }

  const asOf = dxb.asOf || dfp5.ratedDate || CATALOG_UPDATED;
  const heroEn = Number.isFinite(dxb.rank) ? `Dubai Developer · Rank #${dxb.rank}` : 'Dubai Developer';
  const heroLead = d.blurbCn ? (String(d.blurbCn).length > 110 ? String(d.blurbCn).slice(0, 110) + '…' : String(d.blurbCn)) : null;

  const navLinks = [
    { href: '#rating', label: '评级面板' },
    ...(cells.length > 0 ? [{ href: '#data', label: '关键数据' }] : []),
    ...(hasContent ? [{ href: '#story', label: '品牌研究' }] : []),
    { href: '#projects', label: '在售项目' },
    ...(comms.length > 0 ? [{ href: '#comms', label: '活跃社区' }] : []),
  ];

  return (
    <div className="cwv5" id="top">
      <style dangerouslySetInnerHTML={{ __html: V5_CSS + V5_SUPPLEMENT + V5_DETAIL_SUPPLEMENT + V5_DEV_CONTENT_SUPPLEMENT }} />
      <V5Nav askHref={askDeveloperHref(d)} links={navLinks} />

      {/* Hero — v5 分栏（左文 / 右评级大徽标白卡） */}
      <section className="hero"><div className="wrap"><div className="hero-inner">
        <div className="hero-left">
          <Link className="pd-back" href="/developers">← 返回开发商研究库</Link>
          {getDeveloperLogo(d) && (
            <img className="dev-logo dev-logo-hero" src={getDeveloperLogo(d)} alt={`${d.name} logo`} loading="eager" decoding="async" />
          )}
          <div className="eyebrow">开 发 商 · Developer</div>
          <h1>{d.name}{d.cn ? <em>{d.cn}</em> : null}</h1>
          <div className="hero-en">{heroEn}</div>
          {heroLead && <p className="hero-lead">{heroLead}</p>}
          <div className="hero-cta-row">
            <a className="btn btn-red" href={askDeveloperHref(d)}>让 AI 分析这家开发商 <span className="arrow">→</span></a>
            <a className="btn btn-ghost" href="/#contact">加顾问微信</a>
            {SHOW_EXTERNAL_DEV_LINKS && d.website && <a className="pd-official" href={d.website} target="_blank" rel="nofollow noopener noreferrer">官网 ↗</a>}
          </div>
          {meta.length > 0 && (
            <div className="hero-meta">
              {meta.map(([k, v]) => <div key={k}>{k}<strong>{v}</strong></div>)}
            </div>
          )}
        </div>
        <div className="hero-right dev-hero-right">
          {/* 评级大徽标 / NR 中性徽标（三态不变） */}
          <div className="dev-hero-badge">
            {rated ? (
              <>
                <MapleLeaves leaves={dfp5.leaves} size={28} />
                <div className="dhb-score">{round1(dfp5.score)}<em>/ DFP-5</em></div>
                <div className="dhb-conf">置信 {dfp5.confidence || '—'} · 覆盖 {Number.isFinite(dfp5.coverage) ? dfp5.coverage : '—'}%</div>
              </>
            ) : stale ? (
              <>
                <div className="dev-nr-badge dev-stale-badge">评分更新中</div>
                <div className="dhb-conf">新版模型 DFP-5 {CURRENT_DFP5_VERSION} 重算中 · 即将更新</div>
              </>
            ) : (
              <>
                <div className="dev-nr-badge">未评级 NR</div>
                <div className="dhb-conf">尚未纳入 DFP-5 覆盖 · 不代表负面评价</div>
              </>
            )}
            <div className="dhb-src">丹枫 DFP-5 独立评级 · DLD · DXB Interact</div>
          </div>
        </div>
      </div></div></section>

      {/* ① 评级面板 */}
      <section className="sec alt" id="rating"><div className="wrap">
        <div className="sec-head reveal">
          <div className="eyebrow">评 级 面 板</div>
          <h2 className="h2">DFP-5 评级面板</h2>
        </div>
        <div className="dev-rate-embed reveal">
          {rated && dfp5.dims && (
            <div className="dev-radar-box">
              <DevRadar dims={dfp5.dims} size={260} />
              <div className="dev-radar-cap">五维雷达 · 0–100（下方评级卡附条形与数字）</div>
            </div>
          )}
          <DeveloperRatingCard developer={d.name} />
          <Link className="dev-mtd-link" href="/developers/methodology">如何计算 · DFP-5 方法论 ▸</Link>
        </div>
      </div></section>

      {/* ② 关键数据仪表 */}
      {cells.length > 0 && (
        <section className="sec" id="data"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">关 键 数 据</div>
            <h2 className="h2">关键数据仪表</h2>
          </div>
          <div className="dev-dash reveal">
            {cells.map((c, i) => <DataCell key={i} {...c} />)}
          </div>
          {dxb.bedMix && <div className="dev-dash-note">{dxb.bedMix}</div>}
          <div className="dev-dash-src">来源 DXB Interact · as-of {asOf}</div>

          {perf.length > 0 && (
            <>
              <h3 className="dev-subh">合规与履约（DFP-5 指标级）</h3>
              <div className="dev-dash dev-dash-perf">
                {perf.map((c, i) => <DataCell key={i} {...c} />)}
              </div>
              <div className="dev-dash-src">来源 丹枫研究 · DLD 登记 · as-of {dfp5.ratedDate || asOf}</div>
            </>
          )}
        </div></section>
      )}

      {/* ②c 内容层（渐进增强）：品牌故事 / 发展里程碑 / 代表作品 / 业务版图。
          仅当 content/developers/<slug>.json 存在时渲染；否则本区整体不出现。 */}
      {hasContent && (
        <>
          {content.brandStory && (
            <section className="sec alt" id="story"><div className="wrap">
              <div className="sec-head reveal">
                <div className="eyebrow">品 牌 研 究</div>
                <h2 className="h2">品牌故事</h2>
              </div>
              <div className="dev-story reveal"><p>{content.brandStory}</p></div>
            </div></section>
          )}

          {Array.isArray(content.milestones) && content.milestones.length > 0 && (
            <section className="sec"><div className="wrap">
              <div className="sec-head reveal">
                <div className="eyebrow">发 展 里 程</div>
                <h2 className="h2">发展里程碑</h2>
              </div>
              <ol className="dev-mile reveal">
                {content.milestones.map((m, i) => (
                  <li className="dev-mile-item" key={i}>
                    <div className="dev-mile-year">{m.year}</div>
                    <div className="dev-mile-body">
                      {m.title && <div className="dev-mile-t">{m.title}</div>}
                      {m.desc && <div className="dev-mile-d">{m.desc}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </div></section>
          )}

          {Array.isArray(content.flagships) && content.flagships.length > 0 && (
            <section className="sec alt"><div className="wrap">
              <div className="sec-head reveal">
                <div className="eyebrow">代 表 作 品</div>
                <h2 className="h2">代表作品</h2>
              </div>
              <div className="dev-flag-grid reveal">
                {content.flagships.map((f, i) => {
                  const href = linkFlagship(f);
                  const inner = (
                    <>
                      <div className="dev-flag-name">{f.name}</div>
                      {f.cn && <div className="dev-flag-cn">{f.cn}</div>}
                      {f.positioning && <div className="dev-flag-pos">{f.positioning}</div>}
                      {href && <span className="dev-flag-link">查看该项目 →</span>}
                    </>
                  );
                  return href
                    ? <Link key={i} className="dev-flag-card is-link" href={href}>{inner}</Link>
                    : <div key={i} className="dev-flag-card">{inner}</div>;
                })}
              </div>
            </div></section>
          )}

          {content.business && (
            <section className="sec"><div className="wrap">
              <div className="sec-head reveal">
                <div className="eyebrow">业 务 版 图</div>
                <h2 className="h2">业务版图</h2>
              </div>
              <div className="dev-biz reveal"><p>{content.business}</p></div>
            </div></section>
          )}
        </>
      )}

      {/* ③ Track Record + 简介 */}
      {(bullets.length > 0 || d.blurbCn) && (
        <section className="sec alt"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">履 历 观 点</div>
            <h2 className="h2">履历与研究观点</h2>
          </div>
          <div className="reveal">
            {bullets.length > 0 && (
              <ul className="dev-track">
                {bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
            {d.blurbCn && <p className="dev-blurb">{d.blurbCn}</p>}
          </div>
        </div></section>
      )}

      {/* ④ 在售项目 */}
      <section className="sec" id="projects"><div className="wrap">
        <div className="sec-head reveal">
          <div className="eyebrow">在 售 项 目</div>
          <h2 className="h2">在售项目</h2>
        </div>
        {projects.length > 0 ? (
          <>
            <div className="pcard-grid dev-proj-grid reveal">
              {projects.slice(0, 6).map((p) => <ProjectCard key={p.name} p={p} />)}
            </div>
            {projects.length > 6 && (
              <Link className="btn btn-ghost dev-proj-all" href={`/projects?dev=${encodeURIComponent(d.name)}`}>
                查看全部 {projects.length} 个 {d.name} 项目 →
              </Link>
            )}
          </>
        ) : (
          <div className="dev-noproj reveal">
            {d.onBoardStats && <div className="dev-onboard">{d.onBoardStats}</div>}
            <p>网站在售录入以 AI 对话为准——该开发商的在售房源可让 AI 代查。</p>
            <a className="btn btn-red" href={askDeveloperHref(d)}>让 AI 代查该开发商在售房源 →</a>
          </div>
        )}
      </div></section>

      {/* ⑤ 活跃社区 */}
      {comms.length > 0 && (
        <section className="sec alt" id="comms"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">活 跃 社 区</div>
            <h2 className="h2">活跃社区</h2>
          </div>
          <div className="dev-comm-chips reveal">
            {comms.map(({ area, community }) => (
              community
                ? <Link key={area} className="dev-comm-chip" href={`/communities/${communitySlug(community)}`}>{community.cn ? `${community.cn} · ${community.name}` : community.name}</Link>
                : <Link key={area} className="dev-comm-chip" href={`/projects?comm=${encodeURIComponent(area)}`}>{area}</Link>
            ))}
          </div>
        </div></section>
      )}

      {/* ⑥ CTA（共享三路径深色块） */}
      <V5Cta
        askHref={askDeveloperHref(d)}
        heading="要不要深挖这家开发商？"
        intro="三条路径任选：让丹枫 AI 智能投顾结合 DFP-5 评级与公开市场事实分析这家开发商，或直接联系持牌顾问获取在售房源与真实报价。透明、专业、不催单。"
      />

      {/* FOOTER（免责逐字保留 · 搬进 v5 foot-disc 排版壳） */}
      <V5Footer
        disclaimer={
          <p style={{ marginTop: 10 }}>
            ※ DFP-5 为丹枫内部研究评分，仅供研究参考，非信用违约评级，不构成投资建议，不担保任何回报。
            资本增值为历史市场数据（非预期收益）；合规口径仅指登记/托管覆盖，非资金安全承诺。
            数据来源：DLD 登记 · DXB Interact · 丹枫研究，更新 {CATALOG_UPDATED}。
          </p>
        }
      />

      <V5Enhance />
    </div>
  );
}
