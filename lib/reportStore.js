// ============================================================
// 报告编号分配 + 匹配快照持久化（v2 §2.4）。
// 格式 DFR-YYYY-NNNN（当年顺序号，4 位零填充，跨年归零）。
// 本批：进程内内存存储（模块单例）。后续可挂 monday CRM 线索记录做跨进程持久化。
// 简报卡与 /report/编号 完整报告页共用同一编号与快照。
// ============================================================
import 'server-only';

const store = new Map(); // reportId -> snapshot
let year = new Date().getFullYear();
let seq = 0;

function nextId() {
  const y = new Date().getFullYear();
  if (y !== year) { year = y; seq = 0; }
  seq += 1;
  return `DFR-${year}-${String(seq).padStart(4, '0')}`;
}

/**
 * 生成并持久化一份匹配快照，返回报告编号。
 * @param {object} snap { profile, intro, matches, gvPath }
 * @returns {string} reportId
 */
export function createReport(snap) {
  const id = nextId();
  store.set(id, {
    id,
    profile: snap.profile || {},
    intro: snap.intro || '',
    matches: snap.matches || [],
    gvPath: snap.gvPath || '',
    createdAt: new Date().toISOString(),
    advisor: '待分配',
  });
  // 防内存无限增长：仅保留最近 500 份（本批无外部存储）。
  if (store.size > 500) {
    const first = store.keys().next().value;
    store.delete(first);
  }
  return id;
}

export function getReport(id) {
  return store.get(String(id || '')) || null;
}
