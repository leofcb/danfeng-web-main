// ============================================================
// 服务端 Anthropic Messages API 客户端 —— 仅在 API 路由中被 import。
// ANTHROPIC_API_KEY 永不进入浏览器包（无 NEXT_PUBLIC_ 前缀）。
// 模型：claude-haiku-4-5（成本敏感的对话式投顾核心）。
// prompt caching：system 与 tools 定义由调用方标 cache_control。
// ============================================================
import 'server-only';

const API_URL = 'https://api.anthropic.com/v1/messages';
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

export function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * 调用 Anthropic Messages API（blocking，非流式——工具循环逐轮拿全量 content）。
 * 上层 route 用 SSE 把每轮结果分块推给前端，兼顾可靠性与「流式感」。
 * @param {object} p
 * @param {Array}  p.system     system blocks（含 cache_control）
 * @param {Array}  p.messages   会话消息
 * @param {Array}  p.tools      工具定义（末条含 cache_control）
 * @param {number} p.max_tokens
 * @returns {Promise<object>}   Anthropic 原始响应（含 content / stop_reason / usage）
 */
export async function anthropicMessages({ system, messages, tools, max_tokens = 1024 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_NOT_CONFIGURED');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, system, messages, tools, max_tokens }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ANTHROPIC_HTTP_${res.status}:${detail.slice(0, 300)}`);
  }
  return res.json();
}
