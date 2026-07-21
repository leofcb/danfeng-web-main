// ============================================================
// ProjectCard — 无图数据卡（研究文献卡 · 设计规格 §4）
// ------------------------------------------------------------
// 纯展示组件（无 hooks）：首页 FeaturedProjects 与 /projects 列表共用，
// 消除卡逻辑分叉。素材现实 = 100% 无图即终态，故走「枫叶评级 + 数据点 +
// 出处徽标」而非中介图墙。
//   · 起价一律护栏文案；无价 → 「起价待更新」不留空（§0.3 / 附录 A）。
//   · DFP-5 仅 Rated 显示（MapleRating mini），不硬造分。
//   · 「让 AI 分析」→ askHref（方案 A，跳首页对话区预填）；「详情」→ /projects/<slug>。
// ============================================================

import Link from 'next/link';
import { EMIRATES, getDeveloper, askHref, projectSlug, gvBucket, isCurrentDfp5, getAssets } from '@/lib/catalog';
import MapleRating from './MapleRating';

// 去掉护栏括注（（开盘起价 · 非实时报价）等），保留主值。
const strip = (s) => String(s || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();

function priceLine(p) {
  const base = strip(p.startHint);
  if (base && /\d/.test(base)) return { text: `${base} · 示意·非实时报价`, has: true };
  if (Number.isFinite(Number(p.priceAED)) && Number(p.priceAED) > 0) {
    const wan = Math.round(Number(p.priceAED) / 10000);
    return { text: `起价约 AED ${wan}万 · 示意·非实时报价`, has: true };
  }
  if (base) return { text: base, has: false }; // 无价占位（如「价格请咨询丹枫顾问」）
  return { text: '起价待更新 · 请咨询顾问', has: false };
}

export default function ProjectCard({ p }) {
  const e = EMIRATES[p.emirate] || ['e1', p.emirate];
  const dev = getDeveloper(p.developer);
  const rated = isCurrentDfp5(dev); // 旧版残留分数不展示（前端只认当前版本分数）

  const sold = /sold/i.test(p.status || '');
  const coming = /coming/i.test(p.status || '');
  const statusLabel = sold ? '已售罄' : coming ? '即将开盘' : '在售';
  const statusCls = sold ? 'so' : coming ? 'cs' : 'av';

  const gb = gvBucket(p.gv);
  const price = priceLine(p);
  const handover = strip(p.handover) || '待定';
  const typeText = strip(p.types) || '类型待定';
  const beds = String(p.unitInfo || '').split('；')[0].trim();
  const tags = String(p.tags || '').split(/[，,、\s]+/).map((t) => t.trim()).filter(Boolean).slice(0, 3);
  const cn = String(p.cn || '').trim();
  const slug = projectSlug(p);
  // 素材台账：有 cardImage 才渲染卡顶图片区；无图卡保持现状（§B.2）。
  const assets = getAssets(slug);
  const cardImage = assets && assets.cardImage;

  return (
    <article className={`pcard pcard-${e[0]}${sold ? ' is-sold' : ''}${cardImage ? ' has-media' : ''}`}>
      {cardImage && (
        <Link className="pcard-media" href={`/projects/${slug}`} aria-hidden="true" tabIndex={-1}>
          <img src={cardImage} alt={`${p.name} 效果图`} loading="lazy" decoding="async" />
        </Link>
      )}
      <div className="pcard-head">
        <span className={`pcard-status ${statusCls}`}><i />{statusLabel}</span>
        <span className="pcard-emi">{e[1]}</span>
      </div>

      <div className="pcard-title">
        <h3 className="pcard-name">{p.name}</h3>
        {rated && <MapleRating dfp5={dev.dfp5} variant="mini" size={13} />}
      </div>
      {cn && <div className="pcard-cn">{cn}</div>}
      <div className="pcard-loc">{p.area} · {p.developer}</div>

      <div className="pcard-div" />

      <div className="pcard-meta">
        <div className="pcard-m"><span>🏠</span><b>{typeText}</b>{beds && <em>{beds}</em>}</div>
        <div className="pcard-m"><span>📅</span><b>交付 {handover}</b></div>
      </div>

      <div className={`pcard-price${price.has ? '' : ' tbd'}`}>
        <span>💰</span>{price.text}
      </div>

      {gb === 'fit' && <div className="pcard-gv fit">🛂 黄金签证适配</div>}
      {gb === 'below' && <div className="pcard-gv below">🛂 多为门槛以下 · 重身份建议看大户型/别墅</div>}

      {tags.length > 0 && (
        <div className="pcard-tags">
          {tags.map((t, i) => <span key={i} className="pcard-tag">#{t}</span>)}
        </div>
      )}

      <div className="pcard-cta">
        <a className="pc-btn pc-btn-red" href={askHref(p)}>AI 分析 →</a>
        <Link className="pc-btn pc-btn-ghost" href={`/projects/${slug}`}>详情</Link>
      </div>
    </article>
  );
}
