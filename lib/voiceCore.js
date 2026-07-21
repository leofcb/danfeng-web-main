// ============================================================
// voiceCore — 语音输入(STT) 纯逻辑层（无 'server-only'、无 env 副作用）。
// ------------------------------------------------------------
// 供 /api/voice 路由与 node 单测共用：请求校验 / 文件名推断 / 每 IP 每分钟限流 /
// OpenAI 转写编排（主模型 gpt-4o-mini-transcribe，兜底 whisper-1；fetch 可注入）。
// 密钥读取与「server-only」保护留在路由层（app/api 天然仅服务端），此文件保持纯净可测。
// ============================================================

export const OPENAI_URL = 'https://api.openai.com/v1/audio/transcriptions';
export const MAX_BYTES = 5 * 1024 * 1024; // 音频 blob 硬上限 5MB
export const STT_MODELS = [
  process.env.OPENAI_STT_MODEL || 'gpt-4o-mini-transcribe', // 主：便宜、快、支持 language 提示
  'whisper-1', // 兜底：主模型 5xx / 拒识时降级重试一次
];

// —— 请求体大小校验 —— 返回 { ok } 或 { ok:false, status, error }
export function validateAudio(size) {
  const n = Number(size) || 0;
  if (n <= 0) return { ok: false, status: 400, error: 'empty' };
  if (n > MAX_BYTES) return { ok: false, status: 413, error: 'too_large' };
  return { ok: true };
}

// —— 上传文件名（OpenAI 靠扩展名判容器）——
export function audioFilename(contentType) {
  const c = String(contentType || '').toLowerCase();
  if (c.includes('mp4') || c.includes('aac') || c.includes('m4a')) return 'audio.mp4';
  if (c.includes('ogg')) return 'audio.ogg';
  if (c.includes('wav')) return 'audio.wav';
  return 'audio.webm';
}

// —— 每 IP 每分钟限流（进程内内存桶，思路同 /api/chat）——
const VOICE_WINDOW_MS = 60 * 1000;
const VOICE_LIMIT = Number(process.env.VOICE_RATE_LIMIT || 12);
const voiceBuckets = new Map(); // ip -> number[] (时间戳)

export function voiceRateLimit(ip, now = Date.now()) {
  const key = String(ip || 'unknown');
  const arr = (voiceBuckets.get(key) || []).filter((t) => now - t < VOICE_WINDOW_MS);
  if (arr.length >= VOICE_LIMIT) {
    voiceBuckets.set(key, arr);
    return { ok: false, retryMs: VOICE_WINDOW_MS - (now - arr[0]) };
  }
  arr.push(now);
  voiceBuckets.set(key, arr);
  if (voiceBuckets.size > 5000) {
    for (const [k, v] of voiceBuckets) {
      if (!v.length || now - v[v.length - 1] > VOICE_WINDOW_MS) voiceBuckets.delete(k);
    }
  }
  return { ok: true, remaining: VOICE_LIMIT - arr.length };
}

// 测试可复位限流桶（仅供单测；生产不调用）
export function _resetVoiceBuckets() { voiceBuckets.clear(); }

// —— 客户端 IP 提取（同 /api/chat 的 clientIp 思路，此处独立以免触碰对话主链路）——
export function voiceClientIp(req) {
  const h = req && req.headers;
  if (!h || typeof h.get !== 'function') return 'unknown';
  return (
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}

// —— 简体输出提示 ——
// 转写模型对输出简繁高度受 prompt 文字偏置：给一句简体中文示例句，
// 输出即稳定落简体（LEO 2026-07-19：iPhone 实测默认吐繁体，加此提示纠正）。
// 该句同时提示领域词汇（迪拉姆/黄金签证/户型），提高地产词转写准确率。
export const STT_PROMPT = '以下是简体中文普通话对话，可能中英混说，涉及迪拜房产：预算、迪拉姆、黄金签证、户型、社区。';

// —— OpenAI 转写编排 —— 返回纯文本（可能为空串）；不可恢复错误 throw。
// fetchImpl 可注入（单测用）；models 默认主→兜底。language 默认中文（中英混说场景）。
export async function runTranscription({
  apiKey, bytes, contentType, language = 'zh', prompt = STT_PROMPT, models = STT_MODELS, fetchImpl,
} = {}) {
  if (!apiKey) { const e = new Error('OPENAI_NOT_CONFIGURED'); e.code = 'no_key'; throw e; }
  const fetchFn = fetchImpl || globalThis.fetch;
  const filename = audioFilename(contentType);
  let lastErr;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const form = new FormData();
      const blob = new Blob([bytes], { type: contentType || 'audio/webm' });
      form.append('file', blob, filename);
      form.append('model', model);
      if (language) form.append('language', language);
      if (prompt) form.append('prompt', prompt); // 简体偏置 + 领域词提示
      form.append('response_format', 'json');

      const res = await fetchFn(OPENAI_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}` },
        body: form,
        cache: 'no-store',
      });

      if (!res.ok) {
        const detail = await safeText(res);
        const e = new Error(`OPENAI_HTTP_${res.status}:${String(detail).slice(0, 200)}`);
        e.status = res.status;
        // 鉴权/权限类错误：兜底也没用，直接抛（触发 501/502 降级）。
        if (res.status === 401 || res.status === 403) throw e;
        lastErr = e; // 其余错误 → 尝试下一个模型
        continue;
      }
      const data = await res.json();
      return data && typeof data.text === 'string' ? data.text.trim() : '';
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error('TRANSCRIBE_FAILED');
}
