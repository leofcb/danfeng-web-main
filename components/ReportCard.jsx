'use client';

import { useState } from 'react';
import { findProject, EMIRATES, getDeveloper, isCurrentDfp5, getAssets, projectSlug } from '@/lib/catalog';
import { SHOW_EXTERNAL_DEV_LINKS, SHOW_BROCHURE } from '@/lib/flags';
import MapleRating from './MapleRating';

const scrollToContact = () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });

const round1 = (n) => Math.round(n * 10) / 10;
function deliveredLabel(du) {
  if (!Number.isFinite(du) || du <= 0) return null;
  return du >= 10000 ? `逾 ${Math.floor(du / 10000)} 万套` : `约 ${du.toLocaleString()} 套`;
}

// 开发商背书小节：品牌名(cn+EN) + Tier 徽标 + 关键数据 + 一句话简介 + 外链。
// 数据缺失（无维表或无任何可展示信号）时整节返回 null 优雅降级。
function DeveloperSection({ developer }) {
  const dev = getDeveloper(developer);
  if (!dev) return null;
  const dxb = dev.dxb || {};
  const chips = [];
  if (Number.isFinite(dxb.capitalGainPct) && dxb.capitalGainPct > 0) chips.push(['转售涨幅', `${round1(dxb.capitalGainPct)}%`]);
  if (Number.isFinite(dxb.absorptionPct)) chips.push(['去化率', `${round1(dxb.absorptionPct)}%`]);
  const du = deliveredLabel(dxb.deliveredUnits);
  if (du) chips.push(['已交付', du]);
  const hasTier = typeof dev.tier === 'string' && /^[SABC]$/.test(dev.tier);
  const rated = isCurrentDfp5(dev); // 旧版残留分数不展示（前端只认当前版本分数）
  // 无 tier、无关键数据、无简介、无评级 → 无可展示信息，整节隐藏。
  if (!hasTier && !chips.length && !dev.blurbCn && !rated) return null;
  const tierCls = 'rep-devtier t-' + (hasTier ? dev.tier : 'x');
  const nameLine = [dev.cn, dev.name].filter(Boolean).join(' · ');
  return (
    <div className="rep-dev">
      <span className="dl">开发商</span>
      <div className="rep-dev-head">
        <span className="rep-dev-name">{nameLine}</span>
        {hasTier && <span className={tierCls}>{dev.tier} 级</span>}
      </div>
      {rated && (
        <div className="rep-dev-dfp5">
          <MapleRating dfp5={dev.dfp5} size={17} />
          <div className="rep-dev-dfp5-note">丹枫内部研究评分，仅供参考，不构成投资建议</div>
        </div>
      )}
      {chips.length > 0 && (
        <div className="rep-dev-stats">
          {chips.map(([k, v], i) => (
            <span key={i} className="rep-dev-chip"><em>{k}</em><b>{v}</b></span>
          ))}
        </div>
      )}
      {dev.blurbCn && <p className="rep-dev-blurb">{dev.blurbCn}</p>}
      {dxb.link && (
        <a className="rep-dev-link" href={dxb.link} target="_blank" rel="noopener noreferrer">查看开发商市场数据 →</a>
      )}
    </div>
  );
}

function MatchCard({ m }) {
  const [open, setOpen] = useState(false);
  const p = findProject(m.name);
  const score = Math.max(0, Math.min(100, parseInt(m.matchScore, 10) || 0));
  const e = p ? EMIRATES[p.emirate] : ['', ''];

  return (
    <div className="rep-card">
      <div className="rep-top">
        <div>
          <div className="rep-pn">{m.name}</div>
          {p && <div className="rep-pcn">{[p.cn, p.area, e[1], p.developer].filter(Boolean).join(' · ')}</div>}
        </div>
        <div className="rep-score">
          <div className="t">匹配度</div>
          <div className="v">{score}%</div>
          <div className="rep-bar"><i style={{ width: score + '%' }} /></div>
        </div>
      </div>

      {Array.isArray(m.reasons) && m.reasons.length > 0 && (
        <div className="rep-reasons">
          {m.reasons.map((r, i) => <div key={i}>{r}</div>)}
        </div>
      )}

      {p && (
        <>
          <div className="rep-meta">
            <span className="rep-tag gv">黄金签证 {p.gv}</span>
            <span className="rep-tag">起价示意 <b>{p.startHint}</b></span>
            <span className="rep-tag">交付 <b>{p.handover}</b></span>
            <span className="rep-tag">类型 {p.types}</span>
          </div>

          <button className={'rep-view' + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
            查看项目方案与资料 <span className="chev">▾</span>
          </button>

          <div className={'rep-detail' + (open ? ' open' : '')}>
            <div className="rep-dgrid">
              <div><span className="dl">项目简介</span><p>{p.blurb}</p></div>
              <div><span className="dl">片区</span><p>{p.area}</p></div>
              <div><span className="dl">户型与面积</span><p>{p.unitInfo}</p></div>
              <div><span className="dl">付款计划结构</span><p>{p.payment}</p></div>
              <div><span className="dl">交付与进度</span><p>计划交付 {p.handover}。</p></div>
              <div><span className="dl">起价示意</span><p>{p.startHint}</p></div>
              {p.location && <div><span className="dl">交通与距离</span><p style={{ whiteSpace: 'pre-line' }}>{p.location}</p></div>}
              {p.amenities && <div><span className="dl">周边/社区配套</span><p style={{ whiteSpace: 'pre-line' }}>{p.amenities}</p></div>}
            </div>
            <DeveloperSection developer={p.developer} />
            <div className="rep-guard">具体可售户型、实时价格与优惠以丹枫持牌顾问确认为准。</div>
            <div className="rep-acts">
              {/* 项目官网外链 2026-07-10 起隐藏（SHOW_EXTERNAL_DEV_LINKS=false · lib/flags.js） */}
              {SHOW_EXTERNAL_DEV_LINKS && p.landingUrl
                ? <a className="rep-btn red" href={p.landingUrl} target="_blank" rel="noopener noreferrer">查看完整落地页 →</a>
                : <span className="rep-btn muted">完整项目页 · 建设中</span>}
              {/* 楼书 PDF：仅认 assets-manifest 本地 brochure（/brochures/…）；无本地素材 → 待上传占位 */}
              {SHOW_BROCHURE && getAssets(projectSlug(p))?.brochure
                ? <a className="rep-btn ghost" href={getAssets(projectSlug(p)).brochure} target="_blank" rel="noopener noreferrer">下载项目手册 PDF</a>
                : <span className="rep-btn muted">项目手册 · 待上传</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportCard({ data, demo }) {
  if (!data) return null;
  return (
    <div className="msg ai report">
      {demo && (
        <div className="rep-demo">
          演示匹配：未连接实时 AI，以下由本地规则生成（正式版上线后由 AI 实时生成）。
        </div>
      )}
      {data.intro && <div className="rep-intro">{data.intro}</div>}
      {(data.matches || []).map((m, i) => <MatchCard key={i} m={m} />)}
      {data.gvPath && (
        <div className="rep-gv">
          <h5>黄金签证路径</h5>
          <p>{data.gvPath}</p>
        </div>
      )}
      <div className="rep-cta">
        <div>
          <div className="t">下一步：由顾问确认具体房源与报价</div>
          <div className="s">具体户型与实时价格以丹枫顾问确认为准。</div>
        </div>
        <button onClick={scrollToContact}>加微信预约顾问</button>
      </div>
      <div className="rep-disc">本报告基于项目级信息与丹枫匹配模型生成，匹配度与理由为模型评估，仅供参考。</div>
    </div>
  );
}
