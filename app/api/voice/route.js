// ============================================================
// /api/voice — 语音输入(STT) 服务端路由。
// ------------------------------------------------------------
// POST  : 收音频 blob（原始 body，≤5MB）→ OpenAI 转写 → { text }。
//         无 key → 501；限流 → 429；空/超大 → 400/413；上游失败 → 502。
// GET   : 轻量探活（前端首屏判断是否渲染麦克风按钮）。有 key→200，无 key→501。
// HEAD  : 同 GET 的探活（更省流量）。
// 说明：对话主链路（/api/chat、systemPrompt、工具、护栏）零改动；本路由完全独立。
//       密钥仅服务端读取（无 NEXT_PUBLIC_ 前缀，永不进浏览器包）。
// ============================================================
import {
  validateAudio, voiceRateLimit, voiceClientIp, runTranscription, MAX_BYTES,
} from '@/lib/voiceCore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KEY = () => process.env.OPENAI_API_KEY || '';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// —— 探活：前端据此决定是否渲染麦克风按钮（无 key 期间隐藏）——
export async function GET() {
  return KEY() ? json({ available: true }) : json({ available: false }, 501);
}
export async function HEAD() {
  return new Response(null, { status: KEY() ? 200 : 501, headers: { 'cache-control': 'no-store' } });
}

export async function POST(req) {
  const key = KEY();
  // ① 无 key → 501（前端首次探测后隐藏按钮，站点一切如常）。
  if (!key) return json({ error: 'not_configured' }, 501);

  // ② 每 IP 每分钟限流（默认 12 次/分）。
  const rl = voiceRateLimit(voiceClientIp(req));
  if (!rl.ok) return json({ error: 'rate_limit' }, 429);

  // ③ 尺寸预检（content-length 若存在则先挡）。
  const ctype = req.headers.get('content-type') || 'audio/webm';
  const clen = Number(req.headers.get('content-length') || 0);
  if (clen && clen > MAX_BYTES) return json({ error: 'too_large' }, 413);

  let bytes;
  try {
    bytes = Buffer.from(await req.arrayBuffer());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const v = validateAudio(bytes.length);
  if (!v.ok) return json({ error: v.error }, v.status);

  // ④ 转写（主模型 gpt-4o-mini-transcribe，兜底 whisper-1；中文为主中英混说）。
  try {
    const text = await runTranscription({ apiKey: key, bytes, contentType: ctype, language: 'zh' });
    return json({ text: text || '' }, 200);
  } catch {
    return json({ error: 'transcribe_failed' }, 502);
  }
}
