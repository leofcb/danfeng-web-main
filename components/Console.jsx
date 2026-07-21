'use client';

// ============================================================
// Console（v2 单窗聊天 · 规格 §1）
// 合并 v1「左对话右报告」为一条聊天流：子枫气泡 / 用户气泡 / 简报卡内联。
// mode='ai'    ：MessageList 流 + 快捷胶囊 + 吸底输入框（混合输入）。
// mode='script'：顶部细条 +（子枫开场）+ ConversationFlow 脚本引导（降级）。
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useAdvisor } from './AdvisorProvider';
import MessageList from './MessageList';
import ConversationFlow from './ConversationFlow';
import VoiceInput from './VoiceInput';
import { INTRO_TEXT } from '@/lib/conversationScript';
import { PROJECT_COUNT, DEVELOPER_COUNT, COMMUNITY_COUNT } from '@/lib/catalog';

const CONTEXT_ROLES = ['ai', 'user', 'brief', 'intro'];

const MAX_TURNS = 30;
const scrollToContact = () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
const scrollToProjects = () => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });

export default function Console() {
  const { mode, chips, analyzing, busy, userTurns, sendChat, messages } = useAdvisor();
  const hasContext = messages.some((m) => CONTEXT_ROLES.includes(m.role));
  const [chat, setChat] = useState('');
  const chatRef = useRef(null);

  // 语音输入 toast（轻量、自消失；仅前端提示，不影响任何主链路）。
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3800);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // 语音转写回填输入框：不自动发送，追加到已有文本后，聚焦并自适应高度。
  const handleTranscript = (text) => {
    const t = String(text || '').trim();
    if (!t || capped) return;
    setChat((prev) => (prev && prev.trim() ? prev.replace(/\s+$/, '') + ' ' + t : t));
    setTimeout(() => {
      const el = chatRef.current;
      if (!el) return;
      el.focus();
      el.style.height = '64px';
      el.style.height = Math.min(el.scrollHeight, 132) + 'px';
      try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* noop */ }
    }, 0);
  };

  const handleVoiceError = (code) => {
    const msg = code === 'mic_denied'
      ? '麦克风被拒绝，请在浏览器设置中开启后重试'
      : code === 'rate_limit'
        ? '语音识别使用较频繁，请稍后再试或直接文字输入'
        : code === 'too_large'
          ? '录音过长，请分段重录或直接文字输入'
          : '语音识别暂不可用，请文字输入';
    showToast(msg);
  };

  const capped = userTurns >= MAX_TURNS;

  const onSend = () => {
    const t = chat.trim();
    if (!t || busy || capped) return;
    setChat('');
    if (chatRef.current) chatRef.current.style.height = '64px';
    sendChat(t);
  };

  // 左栏 V1 版式主 CTA「开始对话」：聚焦右栏对话输入框（分屏内即时），
  // 降级/无输入框时滚动到对话窗。次 CTA「加顾问」走 scrollToContact。
  const focusChat = () => {
    if (chatRef.current) { chatRef.current.focus(); chatRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else { document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' }); }
  };

  const onChip = (c) => {
    if (busy) return;
    if (/其它|我来说/.test(c)) { chatRef.current?.focus(); return; }
    if (/加顾问|顾问微信/.test(c)) { scrollToContact(); return; }
    sendChat(c);
  };

  return (
    <section className="hero-console" id="console">
      <div className="hero-bg" />
      <div className="wrap hc-stage">
        {/* 紧凑品牌横幅（≤25% 首屏高度）——主标 + 副标 + 动态数据徽章行。
            徽章数字从三库常量实时取（PROJECT/DEVELOPER/COMMUNITY_COUNT），不写死。 */}
        <header className="hc-banner reveal in" id="top">
          <span className="eyebrow">AI 驱动 · 迪拜房产智能投顾</span>
          <h1>AI智能投顾，更懂你的<span className="hl">中东资产配置</span></h1>
          {/* V1 金色拉丁副标：仅桌面/平板分屏可见（默认 display:none）；移动端零改动 */}
          <div className="hc-ensub">Property Investment Intelligence · UAE</div>
          <p className="hc-sub">
            1分钟，AI为您快速匹配房产项目、生成专属投资报告。
          </p>
          {/* V1 CTA 按钮组：主「AI投顾」聚焦右栏输入框，次「浏览项目」锚到精选项目板块。
              仅桌面/平板分屏可见（默认 display:none）；移动端零改动 */}
          <div className="hc-actions">
            <button className="btn btn-red" onClick={focusChat}>AI投顾 →</button>
            <button className="btn btn-ghost" onClick={scrollToProjects}>浏览项目 →</button>
          </div>
          {/* V1 统计条：数字用 <b> 包裹——base CSS 令 <b> 在 &lt;800px 无视觉效果（移动端零改动），
              ≥800px 才呈金色粗数字。DFP-5 评级为第四枚不带数字。 */}
          <div className="hc-badges">
            <span className="data-badge"><b>{PROJECT_COUNT}</b> 个期房项目</span>
            <span className="data-badge"><b>{DEVELOPER_COUNT}</b> 家开发商</span>
            <span className="data-badge"><b>{COMMUNITY_COUNT}</b> 社区画像</span>
            <span className="data-badge">DFP-5 评级</span>
            <span className="hc-src">数据源：DLD迪拜土地局</span>
          </div>
        </header>

        <div className="chatwrap chatwrap-solo reveal in">
          <div className="chat-top">
            <img src="/logo-mark.png" alt="" />
            <div>
              <div className="ct-n">丹枫 · AI智能投顾</div>
              <div className="ct-s">Danfeng · AI Property Advisor</div>
            </div>
            <div className={'ct-live' + (analyzing ? ' analyzing' : '')}>
              <i />{analyzing ? '分析中' : '就绪'}
            </div>
            {mode === 'ai' && userTurns > 20 && (
              <div className="ct-turns">对话较长，建议生成报告或联系顾问</div>
            )}
          </div>

          {mode === 'ai' ? (
            <>
              <MessageList />
              {chips.length > 0 && !capped && (
                <div className="hc-qr">
                  {chips.map((c, i) => (
                    <button key={i} className="qr-chip" disabled={busy} onClick={() => onChip(c)}>{c}</button>
                  ))}
                </div>
              )}
              <div className="chat-in">
                {toast && <div className="voice-toast" role="status">{toast}</div>}
                <textarea
                  ref={chatRef} rows={2} value={chat} disabled={capped}
                  onChange={(e) => {
                    setChat(e.target.value);
                    e.target.style.height = '64px';
                    e.target.style.height = Math.min(e.target.scrollHeight, 132) + 'px';
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                  placeholder={capped
                    ? '已达今日对话上限，欢迎加顾问微信继续'
                    : userTurns === 0
                      ? '例如：200万迪拉姆预算，目标办理黄金签证'
                      : '继续回复，或直接补充其它偏好…'}
                />
                <VoiceInput disabled={busy || capped} onTranscript={handleTranscript} onError={handleVoiceError} />
                <button className="send" disabled={busy || capped} onClick={onSend}>➤</button>
              </div>
            </>
          ) : (
            <>
              <div className="degrade-bar">引导模式：几个问题帮您快速定位，同样即时出匹配报告</div>
              <div className="cf-solo">
                {hasContext ? (
                  <MessageList only={['ai', 'user', 'brief']} embedded />
                ) : (
                  <div className="msg ai has-av" style={{ margin: '18px 20px 0' }}>
                    <img className="msg-av" src="/logo-mark.png" alt="子枫" />
                    <div className="msg-body">{INTRO_TEXT}</div>
                  </div>
                )}
                <ConversationFlow />
                <MessageList only={['report', 'report-stale']} embedded />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
