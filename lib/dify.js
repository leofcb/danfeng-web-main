// ============================================================
// 服务端 Dify 客户端 —— 仅在 API 路由中被 import，密钥永不进浏览器。
// 对应交接说明第 9 节：前端 → Dify（编排层）→ 知识库 → Claude。
// ============================================================
import 'server-only';

const BASE = process.env.DIFY_API_BASE || 'https://api.dify.ai/v1';

export function difyConfigured(kind = 'chat') {
  if (kind === 'report') {
    return Boolean(process.env.DIFY_REPORT_KEY || process.env.DIFY_CHAT_KEY);
  }
  return Boolean(process.env.DIFY_CHAT_KEY);
}

function keyFor(kind) {
  if (kind === 'report') return process.env.DIFY_REPORT_KEY || process.env.DIFY_CHAT_KEY;
  return process.env.DIFY_CHAT_KEY;
}

/**
 * 调用 Dify 的 chat-messages 接口（blocking）。
 * @param {string} query        用户问题 / 画像 prompt
 * @param {object} opts
 * @param {'chat'|'report'} opts.kind
 * @param {object} opts.inputs           Dify 应用变量（如需在 Dify 侧注入目录可用）
 * @param {string} opts.user             终端用户标识（会话归属）
 * @param {string} opts.conversationId   多轮会话 ID
 * @returns {Promise<{answer:string, conversationId:string}>}
 */
export async function difyChat(query, { kind = 'chat', inputs = {}, user = 'anon', conversationId = '' } = {}) {
  const key = keyFor(kind);
  if (!key) throw new Error('DIFY_NOT_CONFIGURED');

  const res = await fetch(`${BASE}/chat-messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      inputs,
      query,
      response_mode: 'blocking',
      user,
      conversation_id: conversationId || undefined,
    }),
    // 服务端调用，避免缓存
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`DIFY_HTTP_${res.status}:${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return { answer: data.answer || '', conversationId: data.conversation_id || '' };
}
