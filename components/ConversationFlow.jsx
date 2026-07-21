'use client';

// ============================================================
// ConversationFlow — 脚本化对话式需求采集（替换 Console 左侧表单）
// ------------------------------------------------------------
// 设计规格：引导式对话采集-交互设计v1_2026-07-06.md
// 顾问「子枫」逐题引导，用户点胶囊作答，答案气泡回显，逐步拼出
// runMatch 需要的 profile。走完 → 收尾动画 → generateAdvice('') 出报告。
//
// 零 API 成本：全部逻辑在前端脚本引擎跑（决策树），不发任何远端请求。
// profile 是唯一契约，喂给不变的 lib/match.runMatch；引擎/报告/护栏零改。
//
// 已落实（LEO 拍板）：
//   · 顾问命名「子枫」，红枫叶头像标识（复用 MapleRating 叶形）。
//   · 回退 = 点任意已答气泡改答 + 分支智能增删（完整版）：改答后重算
//     受影响分支，保留未受影响的答案。
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAdvisor } from './AdvisorProvider';
import { PROJECTS } from '@/lib/catalog';
import {
  NODES, MAIN_IDS, ADVISOR, SKIP_LABEL, FINALE_LINES,
  buildCtx, visibleNodes,
} from '@/lib/conversationScript';

// —— 红枫叶头像（子枫标识），复用 MapleRating 的写实叶形路径 ——
const LEAF_PATH =
  'M12 2.2c.4 1.9.9 3.1 1.9 3.9.5-.5.9-1.2 1-2 .5 1.3.4 2.6-.1 3.7 1-.2 1.9-.7 2.6-1.5' +
  '-.1 1.4-.8 2.6-1.8 3.4 1 .1 2 0 2.9-.5-.7 1.2-1.9 2-3.2 2.3l.6.9 2.6-.3-1.4 1.7' +
  '.7 1.7-2.6-.6-.3 2.9-1.6-2-1.6 2-.3-2.9-2.6.6.7-1.7-1.4-1.7 2.6.3.6-.9' +
  'c-1.3-.3-2.5-1.1-3.2-2.3.9.5 1.9.6 2.9.5-1-.8-1.7-2-1.8-3.4.7.8 1.6 1.3 2.6 1.5' +
  '-.5-1.1-.6-2.4-.1-3.7.1.8.5 1.5 1 2 1-.8 1.5-2 1.9-3.9z';

function MapleAvatar({ size = 26 }) {
  return (
    <span className="cf-avatar" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
        <path d={LEAF_PATH} fill="var(--red)" stroke="var(--red-deep)" strokeWidth="0.5" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// 单条历史记录（一问一答）。kind 决定回显与回退行为。
// { nodeId, field, question, kind, echoLabel, values, display, skipped }
//   values  = 写入 profile 的原始值（single: 字符串; multi/region: 数组; info/fork: null）

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function ConversationFlow() {
  const { profile, setProfileField, setProfileFields, toggleProfileMulti, generateAdvice, busy } = useAdvisor();

  // 会话历史（顾问问 + 用户答，成对）。
  const [turns, setTurns] = useState([]);
  // 当前活动节点 id（正在等待用户作答）。
  const [activeId, setActiveId] = useState(null);
  // 顾问「正在输入」。
  const [typing, setTyping] = useState(false);
  // 收尾生成中（播放动画）。
  const [finishing, setFinishing] = useState(false);
  const [finaleLines, setFinaleLines] = useState([]);
  // 多选题的暂存选择（点确认才落 profile + 回显）。
  const [draft, setDraft] = useState([]);
  // 回退改答：正在编辑哪条 turn（null=非编辑态，走正常前进流）。
  const [editingId, setEditingId] = useState(null);
  // 是否选了「补充更多偏好」。
  const routeRef = useRef({ wantMore: false });
  // 精确预算输入框。
  const [aedOpen, setAedOpen] = useState(false);
  const [aedVal, setAedVal] = useState('');
  // 已开始（防止 StrictMode 双跑开场）。
  const started = useRef(false);
  const scrollRef = useRef(null);

  const node = activeId ? NODES.find((n) => n.id === activeId) : null;

  // 滚到底。
  const scrollBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => { setTimeout(scrollBottom, 0); }, [turns, typing, activeId, finaleLines, scrollBottom]);

  // 计算「下一个应出现的节点」：从给定 nodeId 之后，按可见性顺序取第一个未答的。
  const nextNodeAfter = useCallback((afterId, ctx) => {
    const vis = visibleNodes(ctx);
    const idx = afterId ? vis.findIndex((n) => n.id === afterId) : -1;
    for (let i = idx + 1; i < vis.length; i++) {
      const n = vis[i];
      // fork/info 也算节点；info 自动播放不等待。
      return n;
    }
    return null;
  }, []);

  // 推进到某节点（含 typing 动画）。info 节点自动播放后继续，fork/问题节点停下等待。
  const advanceTo = useCallback(async (n, prevProfile) => {
    if (!n) { // 无更多节点 → 收尾
      startFinale();
      return;
    }
    setTyping(true);
    await wait(500);
    setTyping(false);

    if (n.kind === 'info') {
      const txt = typeof n.infoText === 'function' ? n.infoText(buildCtx(prevProfile || profile, routeRef.current)) : '';
      setTurns((t) => [...t, {
        nodeId: n.id, kind: 'info', question: txt, values: null, display: null, info: true,
      }]);
      // 继续下一节点。
      const ctx = buildCtx(prevProfile || profile, routeRef.current);
      await wait(120);
      const nn = nextNodeAfter(n.id, ctx);
      await advanceTo(nn, prevProfile || profile);
      return;
    }
    // 问题 / fork 节点：设为活动，等用户作答。
    setDraft([]);
    setAedOpen(false); setAedVal('');
    setActiveId(n.id);
  }, [profile, nextNodeAfter]);

  // 开场：intro 已在右侧 MessageList，这里推第一题（Q1）。
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      await wait(650);
      const ctx = buildCtx(profile, routeRef.current);
      const first = visibleNodes(ctx)[0];
      await advanceTo(first, profile);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // —— 收尾生成动画 → generateAdvice('') ——
  const startFinale = useCallback(async () => {
    setActiveId(null);
    setFinishing(true);
    const where = typeof window !== 'undefined' && window.matchMedia('(max-width:960px)').matches ? '下方' : '右侧';
    for (let i = 0; i < FINALE_LINES.length; i++) {
      setTyping(true);
      await wait(i === 0 ? 500 : 650);
      setTyping(false);
      const line = FINALE_LINES[i].replace('{N}', String(PROJECTS.length)).replace('{where}', where);
      setFinaleLines((L) => [...L, line]);
      await wait(120);
    }
    await wait(300);
    generateAdvice(''); // 画像已在 profile 里；extra 传空 → freeText='' 中性
    setFinishing(false);
    // 移动端：报告在下方，平滑滚动过去。
    if (where === '下方') {
      setTimeout(() => {
        document.getElementById('msgs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [generateAdvice]);

  // —— 进度：已答主干数 / 动态分母（含已触发的分支）——
  const answeredMain = turns.filter((t) => MAIN_IDS.includes(t.nodeId)).length;
  const ctxNow = buildCtx(profile, routeRef.current);
  const branchTriggered = visibleNodes(ctxNow).filter(
    (n) => n.phase === 'branch' && (n.kind !== 'info') && turns.some((t) => t.nodeId === n.id),
  ).length;
  const denom = MAIN_IDS.length + branchTriggered;
  const inAddon = node && node.phase === 'addon';
  const remaining = Math.max(0, denom - (answeredMain + branchTriggered));

  // ==========================================================
  //  作答处理
  // ==========================================================

  // 记录一条 turn（新答或改答覆盖）。
  const recordTurn = (n, values, display, opts = {}) => {
    const entry = {
      nodeId: n.id, field: n.field, kind: n.kind,
      echoLabel: n.echoLabel, question: n.question,
      values, display, skipped: !!opts.skipped, info: false,
    };
    setTurns((t) => {
      const i = t.findIndex((x) => x.nodeId === n.id);
      if (i >= 0) { const c = [...t]; c[i] = entry; return c; }
      return [...t, entry];
    });
  };

  // —— 正常前进：单选作答 ——
  const answerSingle = async (n, o, isSkip) => {
    const nextProfile = { ...profile };
    if (n.field) {
      let val;
      if (o && o.value === '__keep__') { val = profile[n.field] || ''; /* B1 预算不变 */ }
      else if (isSkip) { val = n.skipValue != null ? n.skipValue : ''; }
      else { val = o.value; }
      // B1 上调预算需清 budgetAED。
      if (n.id === 'B1') { setProfileFields({ budget: val, budgetAED: '' }); nextProfile.budget = val; nextProfile.budgetAED = ''; }
      else { setProfileField(n.field, val); nextProfile[n.field] = val; }
    }
    const display = isSkip
      ? `${n.echoLabel}：${SKIP_LABEL}`
      : `${n.echoLabel}：${(n.echoMap && n.echoMap[o.value]) || o.label}`;
    recordTurn(n, isSkip ? '__skip__' : o.value, display, { skipped: isSkip });

    // B1 选完后追一句信息气泡（followInfo）。
    const doFollow = n.followInfo && !isSkip && o.value === '__keep__';
    await proceedAfter(n, nextProfile, doFollow ? n.followInfo : null);
  };

  // —— 精确预算提交（Q1）——
  const submitAed = async (n) => {
    const num = String(aedVal).replace(/[^\d]/g, '');
    if (!num) return;
    setProfileFields({ budgetAED: num, budget: '' });
    const nextProfile = { ...profile, budgetAED: num, budget: '' };
    recordTurn(n, `__aed__:${num}`, `预算：AED ${Number(num).toLocaleString()}`);
    await proceedAfter(n, nextProfile, null);
  };

  // —— 多选/社区确认 ——
  const confirmMulti = async (n) => {
    const vals = draft;
    // 落 profile：与当前值 diff 后 toggle（保证与 provider 数组一致）。
    setProfileFields({ [n.field]: vals });
    const nextProfile = { ...profile, [n.field]: vals };
    const display = vals.length ? `${n.echoLabel}：${vals.join('、')}` : `${n.echoLabel}：${SKIP_LABEL}`;
    recordTurn(n, vals, display, { skipped: vals.length === 0 });
    await proceedAfter(n, nextProfile, null);
  };
  const skipMulti = async (n) => {
    setProfileFields({ [n.field]: [] });
    const nextProfile = { ...profile, [n.field]: [] };
    recordTurn(n, [], `${n.echoLabel}：${SKIP_LABEL}`, { skipped: true });
    await proceedAfter(n, nextProfile, null);
  };

  // —— 分叉路由 ——
  const answerFork = async (n, o) => {
    routeRef.current = { ...routeRef.current, wantMore: o.value === 'more' };
    recordTurn(n, o.value, o.value === 'more' ? '补充更多偏好' : '直接生成报告', { fork: true });
    const nextProfile = { ...profile };
    if (o.value === 'done') { setActiveId(null); startFinale(); return; }
    await proceedAfter(n, nextProfile, null);
  };

  // —— 作答后：若在编辑态 → 重算受影响分支后回到末端；否则正常推进 ——
  const proceedAfter = async (n, nextProfile, followText) => {
    if (followText) {
      setTyping(true); await wait(450); setTyping(false);
      setTurns((t) => [...t, { nodeId: n.id + '_info', kind: 'info', question: followText, values: null, info: true }]);
      await wait(120);
    }
    if (editingId) {
      await resolveEdit(n, nextProfile);
      return;
    }
    const ctx = buildCtx(nextProfile, routeRef.current);
    const nn = nextNodeAfter(n.id, ctx);
    setActiveId(null);
    await advanceTo(nn, nextProfile);
  };

  // ==========================================================
  //  回退改答 + 分支智能增删
  // ==========================================================
  // 点某条已答气泡 → 重新激活该节点，保留后续未受影响的答案。
  const startEdit = (turn) => {
    if (busy || finishing) return;
    if (turn.info) return;
    setEditingId(turn.nodeId);
    setActiveId(turn.nodeId);
    // 多选题：把已答值载入 draft。
    if (turn.kind === 'multi' || turn.kind === 'region') setDraft(Array.isArray(turn.values) ? [...turn.values] : []);
    else { setDraft([]); }
    setAedOpen(false);
    if (turn.nodeId === 'Q1' && typeof turn.values === 'string' && turn.values.startsWith('__aed__')) {
      setAedOpen(true); setAedVal((profile.budgetAED || '').toString());
    }
  };

  // 改答落定后：重算分支——移除因改答而不该存在的分支/追加 turn，
  // 保留未受影响的答案；若改答催生新分支，则在此节点后插入并暂停等待作答。
  const resolveEdit = async (n, nextProfile) => {
    const ctx = buildCtx(nextProfile, routeRef.current);
    const vis = visibleNodes(ctx);
    const visIds = new Set(vis.map((v) => v.id));

    // 1) 清理：删掉已不可见的分支/追加节点对应的 turn（及其 followInfo）。
    setTurns((prev) => prev.filter((t) => {
      if (t.info && t.nodeId && t.nodeId.endsWith('_info')) {
        const base = t.nodeId.replace('_info', '');
        return visIds.has(base);
      }
      if (t.nodeId === n.id) return true;             // 当前改的这条保留
      if (t.kind === 'fork') return true;             // 分叉路由保留
      if (!visIds.has(t.nodeId)) return false;        // 不再可见 → 删
      return true;
    }));

    // 2) 找「改答节点之后、应出现但尚无 turn」的第一个节点。
    //    用最新 turns 计算需要在下一 tick，故用函数式读取。
    setEditingId(null);
    setActiveId(null);
    // 等 setTurns 应用后再判断缺口。
    await wait(0);
    setTurns((cur) => {
      const answered = new Set(cur.filter((t) => !t.info).map((t) => t.nodeId));
      const idx = vis.findIndex((v) => v.id === n.id);
      let gap = null;
      for (let i = idx + 1; i < vis.length; i++) {
        const v = vis[i];
        if (v.kind === 'info') continue; // info 由 advance 自动补
        if (!answered.has(v.id)) { gap = v; break; }
      }
      if (gap) {
        // 有新分支/漏答 → 推进到它（异步，脱离本 setState）。
        setTimeout(() => advanceTo(gap, nextProfile), 0);
      } else {
        // 无缺口：改答完成，静默留在末端（用户可继续点其它气泡或已进入报告）。
      }
      return cur;
    });
  };

  // ==========================================================
  //  渲染
  // ==========================================================
  const AdvisorBubble = ({ children }) => (
    <div className="cf-row cf-advisor">
      <MapleAvatar />
      <div className="cf-bubble cf-ask">{children}</div>
    </div>
  );

  const renderOptions = (n) => {
    if (n.kind === 'single') {
      return (
        <div className="cf-opts">
          {n.options.map((o) => (
            <button key={o.value} className="cf-chip" onClick={() => answerSingle(n, o, false)}>{o.label}</button>
          ))}
          {n.budgetInput && !aedOpen && (
            <button className="cf-chip cf-chip-ghost" onClick={() => setAedOpen(true)}>✎ 填写精确预算</button>
          )}
          {n.skip && <button className="cf-chip cf-chip-skip" onClick={() => answerSingle(n, null, true)}>{SKIP_LABEL}</button>}
          {n.budgetInput && aedOpen && (
            <div className="cf-aed">
              <input className="cf-aed-input" type="number" inputMode="numeric" value={aedVal} autoFocus
                onChange={(e) => setAedVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitAed(n); }}
                placeholder="AED 精确上限，如 2000000" />
              <button className="cf-aed-ok" onClick={() => submitAed(n)}>确认</button>
            </div>
          )}
        </div>
      );
    }
    if (n.kind === 'multi' || n.kind === 'region') {
      const toggle = (v) => setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
      return (
        <div className="cf-opts">
          <div className={'cf-chipwrap' + (n.kind === 'region' ? ' cf-region' : '')}>
            {n.options.map((o) => (
              <button key={o.value} className={'cf-chip' + (draft.includes(o.value) ? ' on' : '')}
                onClick={() => toggle(o.value)}>{o.label}</button>
            ))}
          </div>
          <div className="cf-multi-actions">
            <button className="cf-chip cf-chip-go" onClick={() => confirmMulti(n)}>{n.confirm || '下一步'}</button>
            {n.skip && <button className="cf-chip cf-chip-skip" onClick={() => skipMulti(n)}>{SKIP_LABEL}</button>}
          </div>
        </div>
      );
    }
    if (n.kind === 'fork') {
      return (
        <div className="cf-opts">
          {n.options.map((o) => (
            <button key={o.value} className={'cf-chip' + (o.value === 'done' ? ' cf-chip-go' : '')}
              onClick={() => answerFork(n, o)}>{o.label}</button>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="cf">
      {/* 进度暗示 */}
      {!finishing && (
        <div className="cf-progress">
          <div className="cf-bar"><i style={{ width: `${Math.min(100, ((answeredMain + branchTriggered) / Math.max(1, denom)) * 100)}%` }} /></div>
          <div className="cf-prog-txt">
            {inAddon ? '补充偏好 · 完善匹配' : remaining > 0 ? `还差 ${remaining} 个问题` : '已完成 · 正在生成报告'}
          </div>
        </div>
      )}

      <div className="cf-stream" ref={scrollRef}>
        {turns.map((t, i) => (
          t.info ? (
            <AdvisorBubble key={t.nodeId + '_' + i}>{t.question}</AdvisorBubble>
          ) : (
            <div key={t.nodeId + '_' + i} className="cf-pair">
              <AdvisorBubble>{t.question}</AdvisorBubble>
              <div className="cf-row cf-user">
                <button className={'cf-answer' + (editingId === t.nodeId ? ' editing' : '')}
                  title="点击可修改此项" onClick={() => startEdit(t)}>
                  {t.display} <span className="cf-edit-hint">✎</span>
                </button>
              </div>
            </div>
          )
        ))}

        {/* 活动题：顾问问 + 选项（编辑态时该节点已在上方，选项直接接续在流末） */}
        {node && !finishing && (
          <div className="cf-active">
            {/* 编辑态：不重复问句（气泡已在上方高亮）；正常态：显示问句 */}
            {!editingId && <AdvisorBubble>{node.question}</AdvisorBubble>}
            {editingId && <div className="cf-edit-tip">修改「{node.echoLabel || '此项'}」：</div>}
            {renderOptions(node)}
          </div>
        )}

        {/* 收尾动画气泡 */}
        {finaleLines.map((l, i) => (<AdvisorBubble key={'fin' + i}>{l}</AdvisorBubble>))}

        {/* 正在输入 */}
        {typing && (
          <div className="cf-row cf-advisor">
            <MapleAvatar />
            <div className="cf-bubble cf-ask"><span className="cf-typing"><i /><i /><i /></span></div>
          </div>
        )}
      </div>
    </div>
  );
}
