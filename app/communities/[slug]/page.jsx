// ============================================================
// /communities/<slug> — 社区详情页（SSG 201 页 · 设计规格 §6）
// 服务端渲染 + generateStaticParams 预生成全量。片区研究站：
// Hero → ② 画像(CommunityProfile compact=false) + ③ 户型参考价表
// → ④ 在售项目(projectsByCommunity, communityId 反查) → ⑤ 活跃开发商(🍁mini)
// → ⑥ 相似社区 → ⑦ AI/顾问 CTA。
// 近半社区无在售项目 → 降级形态为一等公民（§6.5）。护栏：参考价/ROI 永远
// 带「公开行情参考」「历史参考·非承诺」+ 来源。
// ============================================================
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  COMMUNITIES, findCommunityBySlug, communitySlug, askCommunityHref,
  communityMinPrice, communityRoiRange, projectsByCommunity, activeDevelopersByCommunity,
  similarCommunities, developerSlug, CATALOG_UPDATED, isCurrentDfp5, getCommunityHeroImages,
} from '@/lib/catalog';
import { STANDALONE_COMMUNITY_SLUGS } from '@/lib/standalonePages.js';
import ProjectCard from '@/components/ProjectCard';
import CommunityCard from '@/components/CommunityCard';
import CommunityProfile from '@/components/CommunityProfile';
import ProjectHeroGallery from '@/components/ProjectHeroGallery';
import { MapleLeaves } from '@/components/MapleRating';
import { V5_CSS, V5_SUPPLEMENT, V5_DETAIL_SUPPLEMENT } from '@/components/projectLandingV5.styles';
import { V5Nav, V5Cta, V5Footer, IconLock } from '@/components/V5Chrome';
import V5Enhance from '@/components/V5Enhance';

const wan = (n) => Math.round(Number(n) / 10000);

export function generateStaticParams() {
  // WEB-COMM-V1 独立 HTML 社区页（如 business-bay）从 SSG 排除：由 public/communities/<slug>/index.html
  // 静态托管 + next.config beforeFiles 重写接管，避免与本动态路由冲突。
  return COMMUNITIES
    .map((c) => ({ slug: communitySlug(c) }))
    .filter((p) => !STANDALONE_COMMUNITY_SLUGS.includes(p.slug));
}

export function generateMetadata({ params }) {
  const c = findCommunityBySlug(params.slug);
  if (!c) return { title: '社区未找到 | 丹枫置业' };
  const cn = c.cn ? `${c.cn} ` : '';
  const blurb = (c.profile && c.profile.blurbCn) ? String(c.profile.blurbCn).slice(0, 80) : `${c.name} 片区画像、配套与租金回报参考`;
  const minP = communityMinPrice(c);
  const roi = communityRoiRange(c);
  const projN = projectsByCommunity(c).length;
  const parts = [blurb];
  if (minP) parts.push(`参考价 AED ${wan(minP)}万起（公开行情参考·非报价）`);
  if (roi) parts.push(`租金回报参考 ${roi.lo}–${roi.hi}%（历史参考·非承诺）`);
  if (projN) parts.push(`${projN} 个在售项目`);
  return {
    title: `${c.name} ${cn}社区画像 · 租金回报参考 | 丹枫置业研究`,
    description: parts.join(' · ') + '。片区画像与配套见丹枫研究。',
    alternates: { canonical: `/communities/${communitySlug(c)}` },
    openGraph: {
      title: `${c.name} ${cn}社区画像 · 租金回报参考 | 丹枫置业研究`,
      description: parts.join(' · '),
      type: 'website',
    },
  };
}

export default function CommunityDetail({ params }) {
  // 独立 HTML 社区页 slug 交由 public 静态页 + 重写处理，动态路由此处守卫防冲突。
  if (STANDALONE_COMMUNITY_SLUGS.includes(params.slug)) notFound();
  const c = findCommunityBySlug(params.slug);
  if (!c) notFound();

  const prof = c.profile || {};
  const cls = c.classification ? c.classification.replace(/_/g, ' ') : '';
  const dldArea = c.area && c.area.dldArea;
  const masterProject = c.area && c.area.masterProject;
  const minP = communityMinPrice(c);
  const roi = communityRoiRange(c);
  const projects = projectsByCommunity(c);
  const devs = activeDevelopersByCommunity(c);
  const similar = similarCommunities(c, 4);
  const hasProfile = !!prof.blurbCn;
  const hasMarket = !!c.marketData;
  const heroImgs = getCommunityHeroImages(c); // 素材台账社区实景图集，无图 → []

  // Hero 数据带。
  const band = [];
  if (projects.length) band.push(['在售项目', `${projects.length} 个`]);
  if (minP) band.push(['参考价', `AED ${wan(minP)}万起`]);
  if (roi) band.push(['租金回报参考', `${roi.lo}–${roi.hi}%`]);
  band.push(['来源', 'Bayut · PF · DXB']);

  const cchBar = 'cch-bar ' + (c.classification === 'dld_area' ? 'cch-dld' : 'cch-mp');
  const heroEn = [cls, dldArea, masterProject && masterProject !== dldArea ? masterProject : null].filter(Boolean).join(' · ');
  const navLinks = [
    { href: '#profile', label: '片区画像' },
    { href: '#projects', label: '在售项目' },
    ...(devs.length > 0 ? [{ href: '#devs', label: '活跃开发商' }] : []),
    ...(similar.length > 0 ? [{ href: '#similar', label: '相似片区' }] : []),
  ];

  return (
    <div className="cwv5" id="top">
      <style dangerouslySetInnerHTML={{ __html: V5_CSS + V5_SUPPLEMENT + V5_DETAIL_SUPPLEMENT }} />
      <V5Nav askHref={askCommunityHref(c)} links={navLinks} />

      {/* ① Hero — v5 分栏（左文 / 右实景图 imgframe + 参考价 badge） */}
      <section className="hero"><div className="wrap"><div className="hero-inner">
        <div className="hero-left">
          <Link className="pd-back" href="/communities">← 返回社区研究库</Link>
          {c.isHot && <span className="hot" style={{ alignSelf: 'flex-start', marginBottom: 14 }}>🔥 热门片区</span>}
          <div className="eyebrow">社 区 · Community</div>
          <h1>{c.name}{c.cn ? <em>{c.cn}</em> : null}</h1>
          {heroEn && <div className="hero-en">{heroEn}</div>}
          <div className="hero-cta-row">
            <a className="btn btn-red" href={askCommunityHref(c)}>问 AI 这个社区适合我吗 <span className="arrow">→</span></a>
            <a className="btn btn-ghost" href="/#contact">加顾问看片区房源</a>
          </div>
          <div className="hero-meta">
            {band.map(([k, v]) => <div key={k}>{k}<strong>{v}</strong></div>)}
          </div>
          {(minP || roi) && (
            <p className="cd-guard">
              参考价与租金回报为公开行情参考（Bayut · PF · DXB Interact），非丹枫报价、非收益承诺。
            </p>
          )}
        </div>
        {/* hero 图区：优先素材台账社区实景图集 → 无图则象牙白色块兜底（社区名 EN + cn）。 */}
        <div className="hero-right comm-hero-right">
          {heroImgs.length ? (
            <div className="comm-hero-media">
              <span className={cchBar} aria-hidden="true" />
              <ProjectHeroGallery images={heroImgs} projectName={c.name} />
            </div>
          ) : (
            <div className="comm-hero-art">
              <span className={cchBar} aria-hidden="true" />
              <div className="pd-art-name">{c.name}</div>
              {c.cn && <div className="cha-cn">{c.cn}</div>}
              <div className="pd-art-src">丹枫研究 · Bayut · PF · DXB Interact</div>
            </div>
          )}
          {minP && (
            <div className="hero-badge comm-hero-badge">
              <div className="hbk">参考价 · From</div>
              <div className="hbv">AED {wan(minP)}万起</div>
              <div className="hbn"><IconLock cls="lk" />公开行情参考 · 非报价</div>
            </div>
          )}
        </div>
      </div></div></section>

      {/* ② 画像 + ③ 户型参考价表（CommunityProfile compact=false 一体渲染） */}
      {hasProfile ? (
        <section className="sec alt" id="profile"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">片 区 画 像</div>
            <h2 className="h2">片区画像</h2>
          </div>
          <div className="reveal">
            <CommunityProfile area={c.name} compact={false} />
            {!hasMarket && (
              <p className="cd-degrade">参考价完善中——问 AI 或加顾问获取该片区最新户型行情。</p>
            )}
          </div>
        </div></section>
      ) : (
        <section className="sec alt" id="profile"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">片 区 画 像</div>
            <h2 className="h2">片区画像</h2>
          </div>
          <div className="reveal">
            <div className="cd-degrade-box">
              <div className="cd-idline">{[c.name, c.cn, cls, dldArea].filter(Boolean).join(' · ')}</div>
              <p>片区画像完善中。让 AI 代查该片区的定位、配套与适合人群。</p>
              <a className="btn btn-red" href={askCommunityHref(c)}>让 AI 代查该片区 →</a>
            </div>
            {hasMarket && (
              <div className="cd-market-only">
                <CommunityProfile area={c.name} compact={false} />
              </div>
            )}
          </div>
        </div></section>
      )}

      {/* ④ 在售项目（communityId 反查） */}
      <section className="sec" id="projects"><div className="wrap">
        <div className="sec-head reveal">
          <div className="eyebrow">在 售 项 目</div>
          <h2 className="h2">在售项目</h2>
        </div>
        {projects.length > 0 ? (
          <>
            <div className="pcard-grid reveal">
              {projects.slice(0, 6).map((p) => <ProjectCard key={p.name} p={p} />)}
            </div>
            {projects.length > 6 && (
              <Link className="btn btn-ghost dev-proj-all" href={`/projects?commId=${encodeURIComponent(c.communityId)}`}>
                查看全部 {projects.length} 个在售项目 →
              </Link>
            )}
          </>
        ) : (
          <div className="dev-noproj cd-noproj reveal">
            <p>
              该片区暂无收录在售期房。这多为成熟/低密度社区，或新盘尚未录入——问 AI 代查该片区最新在售，或加顾问获取实盘。
            </p>
            <div className="cd-noproj-cta">
              <a className="btn btn-red" href={askCommunityHref(c)}>问 AI 代查该片区在售 →</a>
              <a className="btn btn-ghost" href="/#contact">加顾问获取实盘</a>
            </div>
          </div>
        )}
      </div></section>

      {/* ⑤ 活跃开发商（无项目社区整区隐藏） */}
      {devs.length > 0 && (
        <section className="sec alt" id="devs"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">活 跃 开 发 商</div>
            <h2 className="h2">活跃开发商</h2>
          </div>
          <div className="cd-dev-chips reveal">
            {devs.map(({ name, developer, count }) => {
              const rated = isCurrentDfp5(developer); // 旧版残留分数不展示（前端只认当前版本分数）
              const inner = (
                <>
                  <span className="cddc-name">{developer && developer.cn ? developer.cn : name}</span>
                  {rated && <MapleLeaves leaves={developer.dfp5.leaves} size={13} />}
                  <span className="cddc-count">{count} 项目</span>
                </>
              );
              return developer
                ? <Link key={name} className="cd-dev-chip" href={`/developers/${developerSlug(developer)}`}>{inner}</Link>
                : <span key={name} className="cd-dev-chip is-nr">{inner}</span>;
            })}
          </div>
        </div></section>
      )}

      {/* ⑥ 相似社区 */}
      {similar.length > 0 && (
        <section className="sec" id="similar"><div className="wrap">
          <div className="sec-head reveal">
            <div className="eyebrow">调 性 相 近</div>
            <h2 className="h2">调性相近的片区</h2>
          </div>
          <div className="comm-grid cc-grid reveal">
            {similar.map((s) => <CommunityCard key={s.communityId} c={s} />)}
          </div>
        </div></section>
      )}

      {/* ⑦ CTA（共享三路径深色块） */}
      <V5Cta
        askHref={askCommunityHref(c)}
        heading="这个片区，究竟适不适合你？"
        intro="三条路径任选：让丹枫 AI 智能投顾结合片区画像与公开行情分析这个社区是否适合你，或直接联系持牌顾问获取该片区实盘与真实报价。透明、专业、不催单。"
      />

      {/* FOOTER（免责逐字保留 · 搬进 v5 foot-disc 排版壳） */}
      <V5Footer
        disclaimer={
          <p style={{ marginTop: 10 }}>
            ※ 本页社区参考价与租金回报为公开行情参考（来源 Bayut · PF · DXB Interact），非丹枫报价、非收益承诺；
            具体房源、实时价格与房态由丹枫持牌顾问及开发商正式文件确认。数据更新 {CATALOG_UPDATED}。
          </p>
        }
      />

      <V5Enhance />
    </div>
  );
}
