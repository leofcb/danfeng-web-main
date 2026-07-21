'use client';

// ============================================================
// BriefCard（流内"名片式"简报卡，规格 v2 §1.6）
// 从 ReportCard 拆出的轻量态：报告编号 + 2–3 匹配项目行（名+匹配条+片区+开发商🍁mini）
// + 一句护栏 + 三动作（查看完整报告[占位跳转] / 转发 / 加顾问）。
// 不含可展开项目详情（那是 /report/编号 完整报告的活）。
// 数据源：runMatch 返回 {reportId,intro,matches,gvPath}；项目/开发商详情按 name 回填。
// ============================================================

import { useEffect, useState } from 'react';
import { findProject, EMIRATES, getDeveloper, isCurrentDfp5 } from '@/lib/catalog';
import { saveReportLocal, buildShareUrl } from '@/lib/reportClient';
import MapleRating from './MapleRating';

const scrollToContact = () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });

function Row({ m, idx }) {
  const p = findProject(m.name);
  const score = Math.max(0, Math.min(100, parseInt(m.matchScore, 10) || 0));
  const dev = p ? getDeveloper(p.developer) : null;
  const rated = isCurrentDfp5(dev); // 旧版残留分数不展示（前端只认当前版本分数）
  return (
    <div className="bc-row">
      <span className="bc-idx">{idx + 1}</span>
      <div className="bc-main">
        <div className="bc-line1">
          <span className="bc-name">{m.name}</span>
          <span className="bc-score">匹配 {score}%</span>
        </div>
        <div className="bc-bar"><i style={{ width: score + '%' }} /></div>
        <div className="bc-line2">
          {p && <span>{p.area}</span>}
          {p && p.developer && <span> · {p.developer}</span>}
          {rated && <span className="bc-maple"><MapleRating dfp5={dev.dfp5} size={13} /></span>}
        </div>
      </div>
    </div>
  );
}

export default function BriefCard({ data }) {
  const [copied, setCopied] = useState(false);
  // 简报卡渲染即再持久化一次（与 AdvisorProvider 双保险）。
  useEffect(() => { if (data && data.reportId) saveReportLocal(data); }, [data]);
  if (!data) return null;
  const { reportId, matches = [], gvPath } = data;

  // 自携数据的落地页链接（同设备走 localStorage，转发靠 hash 数据兜底）。
  const reportHref = `/report/${reportId}`;
  const forward = () => {
    const url = buildShareUrl(data) || `${window.location.origin}${reportHref}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }).catch(() => {});
    }
  };
  const cityHint = (() => {
    const areas = matches.map((m) => findProject(m.name)).filter(Boolean);
    const emi = areas[0] ? EMIRATES[areas[0].emirate] : null;
    return emi ? emi[1].split(' · ')[1] || '' : '';
  })();

  return (
    <div className="msg brief">
      <div className="bc">
        <div className="bc-head">
          <span className="bc-tag"><i className="bc-dot" /> AI 智能匹配 · 项目级</span>
          <span className="bc-id">{reportId}</span>
        </div>
        <div className="bc-sub">为您匹配 {matches.length} 个项目{cityHint ? ` · ${cityHint}为主` : ''}</div>
        <div className="bc-rows">
          {matches.map((m, i) => <Row key={i} m={m} idx={i} />)}
        </div>
        <div className="bc-guard">
          {gvPath ? '黄金签证路径见完整报告 · ' : ''}起价示意 · 均为项目级信息，不含实时价
        </div>
        <div className="bc-acts">
          <a className="bc-btn red" href={reportHref} target="_blank" rel="noopener noreferrer">查看完整研究报告 →</a>
          <button className="bc-btn ghost" onClick={forward}>{copied ? '链接已复制 · 可粘贴到微信' : '转发'}</button>
          <button className="bc-btn ghost" onClick={scrollToContact}>加顾问</button>
        </div>
      </div>
    </div>
  );
}
