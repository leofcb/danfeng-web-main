// ============================================================
// CommunityCard — 画像卡 + 数据压舱（设计规格 §2）
// ------------------------------------------------------------
// 首页橱窗（Communities.jsx）与列表页（CommunitiesClient）共用，消除卡逻辑重复。
// 纯展示组件（无 hooks）。素材现实 = 无社区实拍图 → 走「blurbCn 一句话画像 +
// 参考价/ROI/在售项目数三行数据 + 双 CTA」，读得懂片区而非看图挑房。
//   · 参考价一律护栏「公开行情参考」；无价 → 整行不显（不显「0」）。
//   · ROI 走 communityRoiRange robust 区间 + 护栏「历史参考·非承诺」；无则不显。
//   · 在售项目数走 projectsByCommunity（communityId 反查）；0 → 不显。
//   · 双入口：详情 /communities/<slug>；AI askCommunityHref（comm: 前缀）。
// ============================================================

import Link from 'next/link';
import {
  firstLine, blurbShort, communityMinPrice, communityRoiRange,
  projectsByCommunity, communitySlug, askCommunityHref, getCommunityCardImage,
} from '@/lib/catalog';

const wan = (n) => Math.round(Number(n) / 10000);

export default function CommunityCard({ c }) {
  const prof = c.profile || {};
  const slug = communitySlug(c);
  const loc = firstLine(prof.location);
  const blurb = blurbShort(prof.blurbCn);
  const minP = communityMinPrice(c);
  const roi = communityRoiRange(c);
  const projCount = projectsByCommunity(c).length;
  const tags = Array.isArray(prof.tags) ? prof.tags.slice(0, 3) : [];
  const dldArea = c.area && c.area.dldArea;
  const cls = c.classification ? c.classification.replace(/_/g, ' ') : '';
  const thin = !prof.blurbCn && !minP; // 全量视图长尾薄卡：降饱和 + 如实标注
  // 素材台账：有社区图才渲染卡顶图区（同 ProjectCard 模式）；无图卡保持现状。
  const cardImage = getCommunityCardImage(c);

  return (
    <article className={'comm-card cc' + (c.classification === 'dld_area' ? ' cc-dld' : ' cc-mp') + (thin ? ' cc-thin' : '') + (cardImage ? ' cc-has-media' : '')}>
      {cardImage && (
        <Link className="cc-media" href={`/communities/${slug}`} aria-hidden="true" tabIndex={-1}>
          <img src={cardImage} alt={`${c.name} 社区实景`} loading="lazy" decoding="async" />
        </Link>
      )}
      <div className="cc-bar" aria-hidden="true" />
      {c.isHot && <span className="cc-hot">🔥 热门</span>}

      <div className="comm-card-top">
        <div className="comm-name">{c.name}</div>
      </div>
      {c.cn && <div className="comm-cn">{c.cn}</div>}
      <div className="cc-sub">{[cls, dldArea].filter(Boolean).join(' · ')}</div>

      {blurb ? (
        <p className="cc-blurb">{blurb}</p>
      ) : (
        <p className="cc-blurb cc-blurb-thin">片区画像完善中</p>
      )}

      {tags.length > 0 && (
        <div className="comm-tags">
          {tags.map((t, i) => <span key={i} className="comm-tag">{t}</span>)}
        </div>
      )}

      <div className="cc-data">
        {loc && <div className="cc-d"><span>📍</span>{loc}</div>}
        {minP && (
          <div className="cc-d cc-d-price">
            <span>💰</span>参考价 AED {wan(minP)}万起 · <em>公开行情参考</em>
          </div>
        )}
        {roi && (
          <div className="cc-d cc-d-roi">
            <span>📈</span>租金回报参考 {roi.lo}–{roi.hi}% · <em>历史参考·非承诺</em>
          </div>
        )}
        {projCount > 0 && (
          <div className="cc-d cc-d-proj"><span>🏗</span>{projCount} 个在售项目</div>
        )}
      </div>

      <div className="cc-cta">
        <Link className="pc-btn pc-btn-ghost" href={`/communities/${slug}`}>查看社区详情 →</Link>
        <a className="pc-btn pc-btn-red" href={askCommunityHref(c)}>问 AI 适不适合我</a>
      </div>
    </article>
  );
}
