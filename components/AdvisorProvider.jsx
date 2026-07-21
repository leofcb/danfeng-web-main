'use client';

// ============================================================
// AdvisorProvider（v2 · 单窗聊天核心）
// ------------------------------------------------------------
// mode='ai'    ：子枫真智能对话（SSE 流 + 工具循环 + 简报卡）。
// mode='script'：降级到脚本引导流（ConversationFlow 全量复用，零 API）。
// 契约不变：profile → 报告；脚本方法（setProfileField 等）供 fallback 使用。
// 无服务端存储：对话历史随每次请求由前端携带（无 cookie 合规负担）。
// ============================================================

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { localMatch } from '@/lib/localMatch';
import { ENABLE_AI_CHAT } from '@/lib/flags';
import { saveReportLocal } from '@/lib/reportClient';
import { findProjectBySlug, findDeveloperBySlug, findCommunityBySlug } from '@/lib/catalog';

const AdvisorContext = createContext(null);
export const useAdvisor = () => useContext(AdvisorContext);

let _id = 0;
const nextId = () => `m${++_id}`;

// 子枫开场（规格 §1.4）。开场快捷胶囊已按定稿删除，容器留空不占高度。
const OPENING =
  '您好，我是丹枫智能投顾「子枫 Dan」。跟我说说您的预算和目的，我来帮您匹配房产项目、生成投资报告。';
const OPENING_CHIPS = [];

// 降级过渡话术（规格 §4.4）。
const DEGRADE_LINE = '实时分析这会儿有点慢，我先用引导方式，几个问题帮您快速定位。';

// 把统一消息流转成发给 /api/chat 的对话历史（仅 user/assistant 文本）。
function toHistory(msgs) {
  const out = [];
  for (const m of msgs) {
    if (m.role === 'user') out.push({ role: 'user', content: m.text });
    else if (m.role === 'ai' || m.role === 'intro') out.push({ role: 'assistant', content: m.text });
    else if (m.role === 'brief' && m.histText) out.push({ role: 'assistant', content: m.histText });
  }
  return out;
}

export default function AdvisorProvider({ children }) {
  const initialAi = ENABLE_AI_CHAT;
  const [messages, setMessages] = useState(
    initialAi ? [{ id: 'intro', role: 'ai', text: OPENING }] : []
  );
  const [chips, setChips] = useState(initialAi ? OPENING_CHIPS : []);
  const [mode, setMode] = useState(initialAi ? 'ai' : 'script');
  const [analyzing, setAnalyzing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({
    budget: '', budgetAED: '', goal: '', city: '', regions: [],
    types: [], beds: [], risk: '', handover: '', payment: [], prefs: [],
  });

  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const scrollCbRef = useRef(null);
  const registerScroll = useCallback((cb) => { scrollCbRef.current = cb; }, []);
  const scroll = () => { if (scrollCbRef.current) scrollCbRef.current(); };

  const userTurns = messages.reduce((n, m) => n + (m.role === 'user' ? 1 : 0), 0);

  const append = useCallback((msg) => {
    if (msg.role === 'report') {
      setMessages((prev) => [
        ...prev.filter((m) => m.role !== 'report' && m.role !== 'report-stale'),
        { id: nextId(), ...msg },
      ]);
    } else {
      setMessages((prev) => [...prev, { id: nextId(), ...msg }]);
    }
    setTimeout(scroll, 0);
  }, []);

  const removeMsg = useCallback((id) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ————————————————————————————————————————————————
  //  子枫真智能对话（SSE 流 + 工具循环）
  // ————————————————————————————————————————————————
  const degradeToScript = useCallback((reason) => {
    if (modeRef.current === 'script') return;
    setChips([]);
    setAnalyzing(false);
    append({ role: 'ai', text: DEGRADE_LINE });
    setMode('script');
  }, [append]);

  const sendChat = useCallback(async (text) => {
    const t = String(text || '').trim();
    if (!t || busy || modeRef.current !== 'ai') return;
    setBusy(true);
    setChips([]);
    append({ role: 'user', text: t });

    const history = toHistory(messagesRef.current).concat({ role: 'user', content: t });
    const typingId = nextId();
    setMessages((prev) => [...prev, { id: typingId, role: 'typing' }]);
    setTimeout(scroll, 0);

    let firstContent = false;
    const dropTyping = () => { if (!firstContent) { firstContent = true; removeMsg(typingId); } };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const ctype = res.headers.get('content-type') || '';
      if (!res.ok || !res.body || ctype.includes('application/json')) {
        // 降级信号（未配置 / 限流 / 坏请求）→ 切脚本流。
        removeMsg(typingId);
        degradeToScript('unavailable');
        setBusy(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let sawDegrade = false;
      let sawContent = false;
      let pendingChips = [];

      const handle = (obj) => {
        if (obj.type === 'text') {
          dropTyping();
          sawContent = true;
          append({ role: 'ai', text: obj.text });
        } else if (obj.type === 'brief') {
          dropTyping();
          sawContent = true;
          const names = (obj.data.matches || []).map((m) => m.name).join('、');
          // 持久化瘦身快照到浏览器（localStorage）→ /report/编号 跨实例可重放。
          saveReportLocal(obj.data);
          append({
            role: 'brief',
            data: obj.data,
            histText: `【已生成匹配报告 ${obj.data.reportId}，推荐：${names}】`,
          });
        } else if (obj.type === 'status') {
          setAnalyzing(true);
        } else if (obj.type === 'chips') {
          pendingChips = obj.chips || [];
        } else if (obj.type === 'degrade') {
          sawDegrade = true;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          const line = part.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          try { handle(JSON.parse(line.slice(5).trim())); } catch { /* 跳过坏帧 */ }
        }
      }

      dropTyping();
      setAnalyzing(false);
      if (sawDegrade && !sawContent) {
        degradeToScript('upstream');
      } else if (pendingChips.length) {
        setChips(pendingChips);
      }
    } catch (e) {
      removeMsg(typingId);
      setAnalyzing(false);
      degradeToScript('network');
    } finally {
      setBusy(false);
    }
  }, [busy, append, removeMsg, degradeToScript]);

  // Hero 一句话直达（§1.4 / §3.2 seedFromHero）。
  const seedFromHero = useCallback((text) => {
    document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });
    if (modeRef.current === 'ai') {
      setTimeout(() => sendChat(text), 350);
    }
  }, [sendChat]);

  // 精选项目列表卡「让子枫分析」直达（设计规格 §5.1 方案 A）：
  // 读 URL ?ask=<slug|advise> → AI 模式自动发问；降级(script)模式给兜底引导提示。
  const askedRef = useRef(false);
  useEffect(() => {
    if (askedRef.current) return;
    askedRef.current = true;
    let ask = '';
    try { ask = new URLSearchParams(window.location.search).get('ask') || ''; } catch { ask = ''; }
    if (!ask) return;
    const runAi = modeRef.current === 'ai';
    const go = () => document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });

    if (ask === 'advise') {
      go();
      if (runAi) setTimeout(() => sendChat('请根据我的预算和目的，帮我从项目库里筛选并对比合适的项目。'), 450);
      else setTimeout(() => append({ role: 'ai', text: '好的，先告诉我您的预算与核心目的（如黄金签证 / 租金回报 / 保值增值），我从 700+ 项目里为您筛选并对比。' }), 300);
      return;
    }

    // 页面级「让子枫按画像推片区」（社区列表 advise-comm · §5.2 / §7.4）。
    if (ask === 'advise-comm') {
      go();
      if (runAi) setTimeout(() => sendChat('我想按片区维度选，请根据我的预算、自住还是投资、以及最看重什么（学区/通勤/租金回报/生活氛围），帮我推荐合适的迪拜片区并说明理由。'), 450);
      else setTimeout(() => append({ role: 'ai', text: '好的，告诉我您的预算、自住还是投资、以及最看重什么（学区 / 通勤 / 租金回报 / 生活氛围），我按片区为您推荐并说明理由。' }), 300);
      return;
    }

    // 社区级预填（askCommunityHref → comm:<slug> · §5.1 / §7.4）。
    if (ask.startsWith('comm:')) {
      const c = findCommunityBySlug(ask.slice(5));
      if (!c) { go(); return; }
      const dld = c.area && c.area.dldArea ? c.area.dldArea : '';
      const q = `${c.name}（${[c.cn, dld].filter(Boolean).join('·')}）这个片区适不适合我？帮我看看它适合什么人群、租金回报水平、值不值得买。`;
      if (runAi) { setTimeout(() => seedFromHero(q), 300); }
      else {
        go();
        setTimeout(() => append({ role: 'ai', text: `您想了解「${c.cn || c.name}」这个片区。引导模式下，先告诉我您的预算与自住/投资目的，我结合该片区画像为您分析适合人群与回报水平。` }), 300);
      }
      return;
    }

    // 开发商级预填（askDeveloperHref → dev:<slug>）。
    if (ask.startsWith('dev:')) {
      const dev = findDeveloperBySlug(ask.slice(4));
      if (!dev) { go(); return; }
      const rated = dev.dfp5 && dev.dfp5.status === 'Rated';
      const q = `请分析开发商 ${dev.cn ? dev.cn + '（' + dev.name + '）' : dev.name} 的 DFP-5 评级${rated ? '' : '覆盖情况'}、交付与在建规模、以及在售项目，适合什么样的买家？`;
      if (runAi) { setTimeout(() => seedFromHero(q), 300); }
      else {
        go();
        setTimeout(() => append({ role: 'ai', text: `您想了解开发商「${dev.cn || dev.name}」。引导模式下，先告诉我您的预算与核心目的，我结合该开发商的定位为您分析。` }), 300);
      }
      return;
    }

    const p = findProjectBySlug(ask);
    if (!p) { go(); return; }
    const q = `帮我分析一下 ${p.name}（${p.area}·${p.developer}）这个项目，适不适合我，风险和亮点是什么？`;
    if (runAi) {
      setTimeout(() => seedFromHero(q), 300);
    } else {
      go();
      setTimeout(() => append({ role: 'ai', text: `您想了解「${p.name}」（${p.area}·${p.developer}）。引导模式下，先告诉我您的预算与核心目的，我从库里对比同类项目为您分析亮点与风险。` }), 300);
    }
  }, [sendChat, seedFromHero, append]);

  // ————————————————————————————————————————————————
  //  脚本引导流（fallback）——保留 v1 契约供 ConversationFlow 使用
  // ————————————————————————————————————————————————
  const invalidateReport = useCallback(() => {
    setMessages((prev) => {
      const hadReport = prev.some((m) => m.role === 'report' || m.role === 'report-stale');
      if (!hadReport) return prev;
      const cleaned = prev.filter((m) => m.role !== 'report' && m.role !== 'report-stale');
      return [...cleaned, { id: nextId(), role: 'report-stale' }];
    });
    setTimeout(scroll, 0);
  }, []);

  const setProfileField = useCallback((key, value) => {
    setProfile((p) => ({ ...p, [key]: value }));
    invalidateReport();
  }, [invalidateReport]);

  const setProfileFields = useCallback((patch) => {
    setProfile((p) => ({ ...p, ...patch }));
    invalidateReport();
  }, [invalidateReport]);

  const toggleProfileMulti = useCallback((key, value) => {
    setProfile((p) => {
      const cur = Array.isArray(p[key]) ? p[key] : [];
      return { ...p, [key]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
    });
    invalidateReport();
  }, [invalidateReport]);

  // 脚本流收尾出报告：纯本地引擎（lib/match.runMatch），零 API、非演示。
  const generateAdvice = useCallback((extra) => {
    const parts = [];
    const j = (a) => (Array.isArray(a) ? a : []).filter(Boolean).join('、');
    if (profile.budgetAED) parts.push('预算(AED)：' + Number(profile.budgetAED).toLocaleString());
    else if (profile.budget) parts.push('预算：' + profile.budget);
    if (profile.goal) parts.push('核心目的：' + profile.goal);
    if (profile.city) parts.push('城市：' + profile.city);
    if (j(profile.regions)) parts.push('区域：' + j(profile.regions));
    if (j(profile.types)) parts.push('物业类型：' + j(profile.types));
    if (j(profile.beds)) parts.push('户型：' + j(profile.beds));
    if (profile.handover) parts.push('交付时间：' + profile.handover);
    if (profile.risk) parts.push('风险偏好：' + profile.risk);
    if (j(profile.payment)) parts.push('付款偏好：' + j(profile.payment));
    if (j(profile.prefs)) parts.push('地段/景观：' + j(profile.prefs));
    if (extra) parts.push('补充：' + extra);
    if (parts.length === 0) {
      append({ role: 'ai', text: '请先至少告诉我预算与核心目的，我再为你从项目库中匹配。' });
      return;
    }
    // 脚本流已逐题回显答案，无需重复画像气泡；直接出报告（在流末渲染）。
    const localData = localMatch(profile, extra);
    append({ role: 'report', data: localData, demo: false });
    setTimeout(scroll, 0);
  }, [profile, append]);

  const value = {
    messages, profile, busy, mode, chips, analyzing, userTurns,
    setChips, sendChat, seedFromHero,
    setProfileField, setProfileFields, toggleProfileMulti, generateAdvice, invalidateReport, registerScroll,
  };
  return <AdvisorContext.Provider value={value}>{children}</AdvisorContext.Provider>;
}
