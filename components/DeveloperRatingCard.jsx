'use client';

// ============================================================
// DeveloperRatingCard — 报告 §4 开发商 DFP-5 评级深析卡（评级体系第六章 6.1）。
// 主视觉 🍁×N + score/DFP-5 + 置信/覆盖率 + as-of/version + 五维条
// + 展示行（总规模 / 近12月成交动能）+「方法论摘要 ▸」入口 + 合规措辞。
// 数据源：getDeveloper() 品牌级维表（dfp5 + dxb），无实时价/项目级去化。
// NR / 未评级 → 只展示可得的品牌级事实，不渲染评分痕迹。
// ============================================================

import { useState } from 'react';
import { getDeveloper, isCurrentDfp5, isStaleDfp5, CURRENT_DFP5_VERSION, getDeveloperLogo } from '@/lib/catalog';
import { SHOW_EXTERNAL_DEV_LINKS } from '@/lib/flags';
import { MapleLeaves } from './MapleRating';

const DIMS = [
  ['a', '交付履约'],
  ['b', '市场表现'],
  ['c', '规模趋势'],
  ['d', '法律合规'],
  ['e', '历史背景'],
];

const round1 = (n) => Math.round(n * 10) / 10;
function unitsLabel(u) {
  if (!Number.isFinite(u) || u <= 0) return null;
  return u >= 10000 ? `逾 ${Math.floor(u / 10000)} 万套` : `约 ${u.toLocaleString()} 套`;
}

export default function DeveloperRatingCard({ developer, name }) {
  const [open, setOpen] = useState(false);
  const dev = getDeveloper(developer || name);
  if (!dev) return null;
  const dxb = dev.dxb || {};
  const dfp5 = dev.dfp5 || {};
  const rated = isCurrentDfp5(dev);
  const stale = isStaleDfp5(dev); // Rated 但旧版残留分数——面板显示「重算中」，不显示旧分/旧叶
  const nameLine = [dev.cn, dev.name].filter(Boolean).join(' · ');
  const logo = getDeveloperLogo(dev); // 有 logo 显示小徽标位（评级仍是主角）

  // 展示行（不计分）：总规模、近 12 月成交动能。
  const totalUnits = (Number(dxb.deliveredUnits) || 0) + (Number(dxb.ucUnits) || 0);
  const scale = unitsLabel(totalUnits);
  const momentum = [];
  if (Number.isFinite(dxb.transactionsYtd)) momentum.push(`成交 ${dxb.transactionsYtd.toLocaleString()} 套`);
  if (Number.isFinite(dxb.salesValueBn)) momentum.push(`销售额 AED ${round1(dxb.salesValueBn)}B`);
  if (Number.isFinite(dxb.rank)) momentum.push(`迪拜综合排名第 ${dxb.rank}`);

  return (
    <div className="report-doc__devrate">
      <div className="rd-dr-head">
        <div className="rd-dr-nameline">
          {logo && <img className="dev-logo dev-logo-sm" src={logo} alt={`${dev.name} logo`} loading="lazy" decoding="async" />}
          <div className="rd-dr-name">{nameLine}</div>
        </div>
        {SHOW_EXTERNAL_DEV_LINKS && dev.website && (
          <a className="rd-dr-web" href={dev.website} target="_blank" rel="noopener noreferrer">官网 ↗</a>
        )}
      </div>

      {rated ? (
        <>
          <div className="rd-dr-hero">
            <span className="rd-dr-leaves"><MapleLeaves leaves={dfp5.leaves} size={20} /></span>
            <span className="rd-dr-score">{round1(dfp5.score)}</span>
            <span className="rd-dr-model">/ DFP-5</span>
            <span className="rd-dr-conf">
              置信 {dfp5.confidence || '—'} · 覆盖率 {Number.isFinite(dfp5.coverage) ? dfp5.coverage : '—'}%
            </span>
          </div>
          <div className="rd-dr-asof">
            as-of {dfp5.ratedDate || '—'} · {dfp5.version || 'DFP-5'} · 来源 · DLD 登记 + DXB Interact
          </div>

          <div className="rd-dr-dims">
            {DIMS.map(([k, label]) => {
              const v = Number(dfp5.dims && dfp5.dims[k]);
              const pct = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
              return (
                <div className="rd-dim" key={k}>
                  <span className="rd-dim-l">{label}</span>
                  <span className="rd-dim-bar"><i style={{ width: pct + '%' }} /></span>
                  <span className="rd-dim-v">{Number.isFinite(v) ? round1(v) : '—'}</span>
                </div>
              );
            })}
          </div>

          {(scale || momentum.length) && (
            <div className="rd-dr-rows">
              {scale && <span className="rd-dr-chip"><em>总规模</em><b>{scale}</b></span>}
              {momentum.length > 0 && (
                <span className="rd-dr-chip"><em>近 12 月成交动能</em><b>{momentum.join(' · ')}</b></span>
              )}
            </div>
          )}

          <button className={'rd-dr-mtd' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
            方法论摘要 <span className="chev">▸</span>
          </button>
          {open && (
            <div className="rd-dr-mtd-body">
              <p><b>DFP-5</b> 是丹枫内部的开发商研究评级，从五个维度做零基客观打分：
                交付履约（交付规模/工期表现/准时率）、市场表现（转售增值/期房去化）、
                规模趋势（在建规模/销售动能）、法律合规（监管账户注册率）、历史背景
                （实体背景/经营时长）。综合分按各维加权归一为 0–100，
                映射为 🍁×N 徽标。原始数据来自 Dubai Land Department 登记与 DXB Interact
                交易口径，取数日 {dfp5.ratedDate || '—'}。</p>
              <p className="rd-dr-mtd-note">
                这是研究参考、非信用违约评级，也不担保任何收益。样本不足处如实标注、不硬凑。
              </p>
            </div>
          )}
        </>
      ) : stale ? (
        <>
          <div className="rd-dr-stale">
            <span className="dev-nr-chip dev-stale-chip">评分更新中</span>
            <span className="rd-dr-stale-note">新版模型 DFP-5 {CURRENT_DFP5_VERSION} 重算中，即将更新。</span>
          </div>
          {(scale || momentum.length) && (
            <div className="rd-dr-rows">
              {scale && <span className="rd-dr-chip"><em>总规模</em><b>{scale}</b></span>}
              {momentum.length > 0 && (
                <span className="rd-dr-chip"><em>近 12 月成交动能</em><b>{momentum.join(' · ')}</b></span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="rd-dr-nr">
          该开发商暂未纳入 DFP-5 评级覆盖（NR）。以下为可得的品牌级公开事实，供参考。
        </div>
      )}

      {dev.blurbCn && <p className="rd-dr-blurb">{dev.blurbCn}</p>}

      <div className="rd-dr-compliance">
        DFP-5 为丹枫内部研究评分，仅供研究参考，非信用违约评级，不构成投资建议，不担保任何回报。
      </div>
    </div>
  );
}
