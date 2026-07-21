// ============================================================
// 纯工具循环编排（可单测，无 Next / 无网络依赖）。
// route.js 注入真实 callModel(anthropic) + execTool(tools) + emit(SSE)；
// scripts/sim-chat-tools.mjs 注入 mock 驱动逻辑单测。
// ------------------------------------------------------------
// 事件（emit）：
//   {type:'text',   text}          子枫一段作答（已剥离胶囊标记）
//   {type:'chips',  chips:[...]}    本轮快捷回复胶囊
//   {type:'status', tool}          某工具开始执行（前端可显示"分析中"）
//   {type:'brief',  data}          runMatch 命中 → 简报卡数据（含 reportId）
//   {type:'degrade',reason}        上游/工具不可用 → 前端降级到脚本流
//   {type:'done',   truncated?}    本轮结束
// ============================================================

// 从子枫文案末尾解析「〔胶囊：A · B · C〕」→ chips[]，并从正文剔除。
export function extractChips(text) {
  const m = String(text || '').match(/〔\s*(?:胶囊|快捷回复|选项)\s*[:：]\s*([^〕]+)〕/);
  if (!m) return { clean: String(text || '').trim(), chips: [] };
  const chips = m[1]
    .split(/[·、|,，/]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  const clean = String(text).replace(m[0], '').trim();
  return { clean, chips };
}

/**
 * @param {object} p
 * @param {Array}    p.messages     初始会话消息（[{role,content}]）
 * @param {Function} p.callModel    async (messages) => anthropic 响应（含 content/stop_reason）
 * @param {Function} p.execTool     async (name, input) => 工具结果对象
 * @param {Function} p.emit         (event) => void  推事件
 * @param {number}   p.maxLoops     工具循环上限（默认 5）
 */
export async function runChatLoop({ messages, callModel, execTool, emit, maxLoops = 5 }) {
  const convo = messages.slice();
  for (let i = 0; i < maxLoops; i++) {
    let data;
    try {
      data = await callModel(convo);
    } catch (e) {
      console.error('[chatLoop] callModel 异常，降级 upstream：', e);
      emit({ type: 'degrade', reason: 'upstream' });
      return;
    }

    let text = '';
    const toolUses = [];
    for (const block of data.content || []) {
      if (block.type === 'text') text += block.text;
      else if (block.type === 'tool_use') toolUses.push(block);
    }

    if (text.trim()) {
      const { clean, chips } = extractChips(text);
      if (clean) emit({ type: 'text', text: clean });
      if (chips.length) emit({ type: 'chips', chips });
    }

    // 把本轮 assistant content 原样入栈（含 tool_use 块，供下一轮衔接）。
    convo.push({ role: 'assistant', content: data.content || [] });

    if (data.stop_reason === 'tool_use' && toolUses.length) {
      const results = [];
      for (const tu of toolUses) {
        emit({ type: 'status', tool: tu.name });
        let out;
        try {
          out = await execTool(tu.name, tu.input || {});
        } catch (e) {
          console.error(`[chatLoop] execTool(${tu.name}) 异常：`, e);
          out = { error: 'tool_failed' };
        }
        if (tu.name === 'runMatch' && out && out.reportId) {
          emit({ type: 'brief', data: out });
        }
        results.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: typeof out === 'string' ? out : JSON.stringify(out),
        });
      }
      convo.push({ role: 'user', content: results });
      continue; // 下一轮让模型基于工具结果继续作答
    }

    emit({ type: 'done' });
    return;
  }
  // 达到循环上限仍未收敛：结束（前端已渲染既有 text/brief）。
  emit({ type: 'done', truncated: true });
}
