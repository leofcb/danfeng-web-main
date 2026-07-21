'use client';

// ============================================================
// MessageList（v2 单窗聊天流）
// 渲染：子枫开场/气泡(ai) · 用户气泡(user) · 简报卡(brief) · 打字指示(typing)
//       · 脚本流报告(report,复用 ReportCard) · 报告失效提示(report-stale)。
// logo-mark 小头像挂在子枫气泡左上（规格 §1.1）。
// ============================================================

import { useEffect, useRef } from 'react';
import { useAdvisor } from './AdvisorProvider';
import { esc, mdToHtml } from '@/lib/format';
import ReportCard from './ReportCard';
import BriefCard from './BriefCard';

function AiBubble({ html }) {
  return (
    <div className="msg ai has-av">
      <img className="msg-av" src="/logo-mark.png" alt="子枫" />
      <div className="msg-body" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

// only    : 仅渲染指定 role（脚本降级态分段渲染用）
// embedded : 内嵌模式（不做滚动容器、不 registerScroll、无 id）
export default function MessageList({ only = null, embedded = false }) {
  const { messages, registerScroll } = useAdvisor();
  const boxRef = useRef(null);

  useEffect(() => {
    if (embedded) return;
    registerScroll(() => {
      const el = boxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [registerScroll, embedded]);

  useEffect(() => {
    if (embedded) return;
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, embedded]);

  const list = only ? messages.filter((m) => only.includes(m.role)) : messages;
  if (embedded && list.length === 0) return null;

  return (
    <div className={embedded ? 'msgs msgs-embed' : 'msgs'} id={embedded ? undefined : 'msgs'} ref={boxRef}>
      {list.map((m) => {
        if (m.role === 'typing') {
          return (
            <div key={m.id} className="msg ai has-av">
              <img className="msg-av" src="/logo-mark.png" alt="子枫" />
              <div className="typing"><span /><span /><span /></div>
            </div>
          );
        }
        if (m.role === 'brief') return <BriefCard key={m.id} data={m.data} />;
        if (m.role === 'report') return <ReportCard key={m.id} data={m.data} demo={m.demo} />;
        if (m.role === 'report-stale') {
          return (
            <div key={m.id} className="msg report-stale" role="status">
              <span className="rs-dot" />
              偏好已更新，正在为您重新匹配…
            </div>
          );
        }
        if (m.role === 'ai' || m.role === 'intro') {
          return <AiBubble key={m.id} html={mdToHtml(m.text)} />;
        }
        // user
        return <div key={m.id} className="msg user" dangerouslySetInnerHTML={{ __html: esc(m.text).replace(/\n/g, '<br>') }} />;
      })}
    </div>
  );
}
