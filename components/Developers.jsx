// ============================================================
// ③ 开发商 Developers（主页板块 · §3.3）
// 头部开发商榜单（按 DFP-5 综合分降序取 8 家），🍁 徽标 + 关键 dxb chips。
// DFP-5 方法论入口（<details> 零 JS 抽屉）。评级驱动 = 丹枫区别中介的核心资产。
// ============================================================
import Link from 'next/link';
import { topDevelopers, DEVELOPER_COUNT, RATED_DEVELOPER_COUNT, developerSlug, getDeveloperLogo } from '@/lib/catalog';
import MapleRating from './MapleRating';

const round1 = (n) => Math.round(n * 10) / 10;
function unitsLabel(u) {
  if (!Number.isFinite(u) || u <= 0) return null;
  return u >= 10000 ? `逾 ${Math.floor(u / 10000)} 万套` : `约 ${u.toLocaleString()} 套`;
}

export default function Developers() {
  const list = topDevelopers(10);
  return (
    <section className="sec-pad paper" id="developers">
      <div className="wrap">
        <div className="sec-head reveal in">
          <span className="eyebrow">开发商 · Developers</span>
          <h2>DFP-5 独立评级驱动的开发商研判</h2>
          <p>丹枫用内部 DFP-5 评级体系，从交付履约、市场表现、规模趋势、法律合规、历史背景五维为开发商零基客观打分。以下按综合分排序。</p>
          <div className="sec-badges">
            <span className="data-badge">{DEVELOPER_COUNT} 家开发商 · {RATED_DEVELOPER_COUNT} 家已评级</span>
            <span className="ts-badge">DFP-5 v3.1</span>
            <span className="src-note">数据来源：DLD 登记 · DXB Interact · 丹枫研究</span>
          </div>
          <details className="mtd-drawer">
            <summary>DFP-5 是什么 ▸</summary>
            <div className="mtd-body">
              DFP-5（Danfeng Five-Pillar）是丹枫内部的开发商研究评级：以 Dubai Land Department
              登记数据与 DXB Interact 交易口径为原始来源，从<b>交付履约 / 市场表现 / 规模趋势 /
              法律合规 / 历史背景</b>五个维度零基打分，加权归一为 0–100，并映射为 🍁×N 徽标。
              它是研究参考、非信用违约评级，不构成投资建议，不担保任何回报。
            </div>
          </details>
        </div>

        <div className="dev-grid reveal in">
          {list.map((d) => {
            const dxb = d.dxb || {};
            const chips = [];
            if (Number.isFinite(dxb.capitalGainPct) && dxb.capitalGainPct > 0) chips.push(['转售涨幅', `${round1(dxb.capitalGainPct)}%`]);
            if (Number.isFinite(dxb.absorptionPct)) chips.push(['去化率', `${round1(dxb.absorptionPct)}%`]);
            const du = unitsLabel(dxb.deliveredUnits);
            if (du) chips.push(['已交付', du]);
            return (
              <Link className="dev-card dev-card-link" key={d.name} href={`/developers/${developerSlug(d)}`}>
                <div className="dev-card-top">
                  <div className="dev-name-wrap">
                    {getDeveloperLogo(d) && <img className="dev-logo dev-logo-sm" src={getDeveloperLogo(d)} alt={`${d.name} logo`} loading="lazy" decoding="async" />}
                    <div className="dev-name">{[d.cn, d.name].filter(Boolean).join(' · ')}</div>
                  </div>
                  {Number.isFinite(dxb.rank) && <span className="dev-rank">DXB #{dxb.rank}</span>}
                </div>
                <div className="dev-rating"><MapleRating dfp5={d.dfp5} size={17} /></div>
                {chips.length > 0 && (
                  <div className="dev-chips">
                    {chips.map(([k, v], i) => <span key={i} className="dev-chip"><em>{k}</em><b>{v}</b></span>)}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="sec-foot">
          <Link className="btn btn-ghost" href="/developers">进入完整开发商研究库 · {DEVELOPER_COUNT} 家 →</Link>
          <p className="note-line">
            DFP-5 为丹枫内部研究评分，仅供研究参考，非信用违约评级，不构成投资建议，不担保任何回报。
          </p>
        </div>
      </div>
    </section>
  );
}
