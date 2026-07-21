// ============================================================
// /api/chat — 子枫对话核心（服务端直连 Anthropic Messages API + 工具循环）。
// 规格 v2 §4：Haiku + 四工具（searchProjects/getDeveloper/getCommunity/runMatch）。
// SSE 分块流式返回；系统提示与工具定义标 cache_control（prompt caching）。
// 无 key / 开关关闭 / 上游失败 / 限流 → 返回明确降级信号，前端切脚本流。
// 对话历史由前端携带（无服务端存储、无 cookie）；单会话 30 轮上限。
// ============================================================
import { anthropicMessages, anthropicConfigured } from '@/lib/anthropic';
import { buildSystemBlocks } from '@/lib/systemPrompt';
import { toolsForApi, executeTool } from '@/lib/tools';
import { runChatLoop } from '@/lib/chatLoop';
import { rateLimit, clientIp } from '@/lib/ratelimit';
import { ENABLE_AI_CHAT } from '@/lib/flags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TURNS = 30;
const MAX_HISTORY = 40;

function degrade(reason, status = 200) {
  return new Response(JSON.stringify({ degrade: true, reason }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(req) {
  // 双重判定①：环境开关或密钥缺失 → 降级（绝不触达 API，无 key 也不报错）。
  if (!ENABLE_AI_CHAT || !anthropicConfigured()) return degrade('not_configured');

  // 简单 IP 限流（内存桶，默认 60 req/h）。
  const rl = rateLimit(clientIp(req));
  if (!rl.ok) return degrade('rate_limit', 429);

  let body;
  try {
    body = await req.json();
  } catch {
    return degrade('bad_request', 400);
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  // 归一 + 截断：仅保留 user/assistant 文本，末 MAX_HISTORY 条，单条 ≤ 4000 字。
  const messages = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return degrade('empty_query', 400);
  }

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const today = new Date().toISOString().slice(0, 10);

  const encoder = new TextEncoder();
  const sse = (obj) => encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (o) => {
        try { controller.enqueue(sse(o)); } catch { /* 客户端已断开 */ }
      };

      // 轮次收口：超过上限直接给收口话术，不再调用模型（省成本）。
      if (userTurns > MAX_TURNS) {
        emit({
          type: 'text',
          text:
            '今天我能帮您做的项目级判断基本都覆盖到了。再往下——具体户型、当期价格、可售房态——交给丹枫持牌顾问最稳妥。留个微信，顾问会带着这次的匹配报告为您优选。',
        });
        emit({ type: 'chips', chips: ['加顾问微信', '保存报告链接'] });
        emit({ type: 'done', capped: true });
        controller.close();
        return;
      }

      const system = buildSystemBlocks(today, userTurns);
      const tools = toolsForApi();

      await runChatLoop({
        messages,
        maxLoops: 5,
        emit,
        callModel: (convo) =>
          anthropicMessages({ system, messages: convo, tools, max_tokens: 1024 }),
        execTool: (name, input) => executeTool(name, input),
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
