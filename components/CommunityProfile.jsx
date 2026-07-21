'use client';

// ============================================================
// CommunityProfile — 报告 §5 社区画像（communities.json profile）。
// 定位段 + 生活方式标签 + 交通/配套 + 户型参考价（LEO 已授权对外，
// 展示时强制带「公开行情参考 · 非实时报价」标注 + 来源）。
// 数据源：getCommunity(area) → profile{blurbCn,tags,location,amenities,lifestyle}
//        + marketData{source, unitPrices[]}。命中不到 → 整节不渲染。
// ============================================================

import { getCommunity } from '@/lib/catalog';

const fmtAED = (n) => (Number.isFinite(n) ? 'AED ' + Number(n).toLocaleString() : '—');

// compact=true 用于项目卡内嵌（只给定位摘要 + 标签，不展开价表）。
export default function CommunityProfile({ area, name, compact = false }) {
  const c = getCommunity(area || name);
  if (!c) return null;
  const prof = c.profile || {};
  const md = c.marketData;
  const prices = md && Array.isArray(md.unitPrices) ? md.unitPrices.filter((u) => u.salePrice || u.rent || u.roi) : [];
  const nameLine = [c.cn, c.name].filter(Boolean).join(' · ');

  return (
    <div className={'report-doc__comm' + (compact ? ' compact' : '')}>
      <div className="rd-cm-head">
        <span className="rd-cm-name">{nameLine}</span>
        {c.classification && <span className="rd-cm-cls">{c.classification.replace(/_/g, ' ')}</span>}
      </div>

      {prof.blurbCn && <p className="rd-cm-blurb">{prof.blurbCn}</p>}

      {Array.isArray(prof.tags) && prof.tags.length > 0 && (
        <div className="rd-cm-tags">
          {prof.tags.map((t, i) => <span key={i} className="rd-cm-tag">{t}</span>)}
        </div>
      )}

      {!compact && (
        <div className="rd-cm-grid">
          {prof.location && (
            <div><span className="dl">交通与距离</span><p style={{ whiteSpace: 'pre-line' }}>{prof.location}</p></div>
          )}
          {prof.amenities && (
            <div><span className="dl">周边配套</span><p style={{ whiteSpace: 'pre-line' }}>{prof.amenities}</p></div>
          )}
          {prof.lifestyle && (
            <div><span className="dl">生活方式</span><p style={{ whiteSpace: 'pre-line' }}>{prof.lifestyle}</p></div>
          )}
        </div>
      )}

      {!compact && prices.length > 0 && (
        <div className="rd-cm-prices">
          <div className="rd-cm-prices-h">
            社区级户型参考价
            <span className="rd-cm-badge">公开行情参考 · 非实时报价</span>
          </div>
          <table className="rd-cm-table">
            <thead>
              <tr><th>户型</th><th>物业</th><th>参考售价</th><th>参考年租</th><th>参考回报</th></tr>
            </thead>
            <tbody>
              {prices.map((u, i) => (
                <tr key={i}>
                  <td>{u.type}</td>
                  <td>{u.propertyType || '—'}</td>
                  <td className="lat">{fmtAED(u.salePrice)}</td>
                  <td className="lat">{u.rent ? fmtAED(u.rent) + '/年' : '—'}</td>
                  <td className="lat">{Number.isFinite(u.roi) ? u.roi + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="rd-cm-src">
            数据来源 · {md.source || 'Bayut / PF 公开行情'}。社区级公开参考价，非某一具体房源报价、非收益承诺；
            具体户型实时价格与可售房态以丹枫持牌顾问及开发商正式文件为准。
          </div>
        </div>
      )}
    </div>
  );
}
