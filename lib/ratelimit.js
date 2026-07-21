// ============================================================
// 简易内存 IP 限流（滑动窗口计数）。默认 60 req/h/IP。
// 本批：进程内单例（Map）。多实例部署可换 Redis/Upstash，接口不变。
// ============================================================
import 'server-only';

const WINDOW_MS = 60 * 60 * 1000; // 1 小时
const LIMIT = Number(process.env.CHAT_RATE_LIMIT || 60);

const buckets = new Map(); // ip -> number[] (时间戳)

export function rateLimit(ip) {
  const key = String(ip || 'unknown');
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) {
    buckets.set(key, arr);
    const retryMs = WINDOW_MS - (now - arr[0]);
    return { ok: false, retryMs };
  }
  arr.push(now);
  buckets.set(key, arr);
  // 偶发清理，避免 Map 无限增长
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.length || now - v[v.length - 1] > WINDOW_MS) buckets.delete(k);
    }
  }
  return { ok: true, remaining: LIMIT - arr.length };
}

export function clientIp(req) {
  const h = req.headers;
  return (
    (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}
