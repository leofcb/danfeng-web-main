// ============================================================
// 报告持久化（客户端）— v2 §2.1/2.7 跨实例快照解法。
// ------------------------------------------------------------
// 第一批的痛点：报告快照存在服务端进程内内存，serverless 多实例/冷启动下
// /report/编号 跨实例取不到快照。本模块把「瘦身快照」持久化到浏览器：
//   1) localStorage（同设备回访稳定）
//   2) URL hash 自携数据（#d=…，跨设备/转发稳定，零服务端存储/零合规负担）
// 瘦身原则：只存 id + 画像(profile) + 匹配结果(intro/matches/gvPath)；
// 项目/开发商/社区详情由落地页从三库 JSON 现场取（三库已在前端包内）。
// 典型体积 < 3KB，远低于 8KB 上限。
// ============================================================

const LS_PREFIX = 'dfr:report:';
const LS_INDEX = 'dfr:index';
const MAX_KEEP = 50;

// —— 瘦身：只保留落地页重建所需字段（详情靠三库现场取）——
export function slimSnapshot(data) {
  if (!data || !data.reportId) return null;
  return {
    reportId: data.reportId,
    profile: data.profile || {},
    intro: data.intro || '',
    gvPath: data.gvPath || '',
    createdAt: data.createdAt || new Date().toISOString(),
    matches: (data.matches || []).map((m) => ({
      name: m.name,
      matchScore: m.matchScore,
      reasons: Array.isArray(m.reasons) ? m.reasons.slice(0, 3) : [],
    })),
  };
}

function safeLS() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // 隐私模式/禁用 → 优雅降级（仍可靠 URL hash）
  }
}

// 写入 localStorage（含 LRU 索引，超上限淘汰最旧）。
export function saveReportLocal(data) {
  const snap = slimSnapshot(data);
  if (!snap) return;
  const ls = safeLS();
  if (!ls) return;
  try {
    ls.setItem(LS_PREFIX + snap.reportId, JSON.stringify(snap));
    let idx = [];
    try { idx = JSON.parse(ls.getItem(LS_INDEX) || '[]'); } catch { idx = []; }
    idx = idx.filter((id) => id !== snap.reportId);
    idx.push(snap.reportId);
    while (idx.length > MAX_KEEP) {
      const drop = idx.shift();
      ls.removeItem(LS_PREFIX + drop);
    }
    ls.setItem(LS_INDEX, JSON.stringify(idx));
  } catch {
    /* 配额满等 → 忽略，URL hash 仍兜底 */
  }
}

export function loadReportLocal(id) {
  const ls = safeLS();
  if (!ls || !id) return null;
  try {
    const raw = ls.getItem(LS_PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// —— URL hash 自携编解码（base64，UTF-8 安全）——
export function encodeReport(data) {
  const snap = slimSnapshot(data);
  if (!snap) return '';
  try {
    const json = JSON.stringify(snap);
    // encodeURIComponent → UTF-8 字节 → base64（浏览器 btoa 仅接受 Latin1）。
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64;
  } catch {
    return '';
  }
}

export function decodeReport(str) {
  if (!str) return null;
  try {
    const json = decodeURIComponent(escape(atob(str)));
    const obj = JSON.parse(json);
    return obj && obj.reportId ? obj : null;
  } catch {
    return null;
  }
}

// 生成自携数据的分享链接（跨设备转发稳定）。
export function buildShareUrl(data) {
  const snap = slimSnapshot(data);
  if (!snap) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const d = encodeReport(snap);
  return `${origin}/report/${snap.reportId}${d ? `#d=${d}` : ''}`;
}

// 从 location.hash 读取自携快照（落地页兜底）。
export function readHashReport() {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash || '';
  const m = h.match(/[#&]d=([^&]+)/);
  return m ? decodeReport(m[1]) : null;
}
