// ============================================================
// 交付分档索引（服务端权威）。按"今天 vs 各项目完工日期"精确计算，
// 作为权威清单注入 Dify，让 Claude 照着用、不再自己做日期算术。
// 零维护：随当天动态计算，永不过期。
// ============================================================
import 'server-only';
import { PROJECTS } from './catalog';

function yearsUntil(p, now) {
  const d = p.handoverDate || (/^\d{4}/.test(p.handover || '') ? p.handover.slice(0, 4) + '-12-31' : null);
  if (!d) return null;
  const t = Date.parse(d);
  if (!Number.isFinite(t)) return null;
  return (t - now) / (365.25 * 24 * 3600 * 1000);
}

// 返回一段文本：按交付档分组的项目名清单（仅可售/非 Sold）。
export function buildDeliveryIndex(now = Date.now()) {
  const bands = { delivered: [], ready: [], y1_3: [], y3plus: [], unknown: [] };
  for (const p of PROJECTS) {
    if (/sold/i.test(p.status || '')) continue; // 已售不进推荐
    const yu = yearsUntil(p, now);
    if (yu == null) bands.unknown.push(p.name);
    else if (yu < 0) bands.delivered.push(p.name);
    else if (yu <= 1) bands.ready.push(p.name);
    else if (yu <= 3) bands.y1_3.push(p.name);
    else bands.y3plus.push(p.name);
  }
  const j = (a) => (a.length ? a.join('、') : '（无）');
  return [
    '【交付分档清单（系统按今天精确计算，判断交付阶段时请只依据本清单，不要自行用完工日期计算；本清单已排除已售项目）】',
    `已交付/现房：${j(bands.delivered)}`,
    `准现房（今天起1年内交付、尚未交房）：${j(bands.ready)}`,
    `1–3年交付：${j(bands.y1_3)}`,
    `3年以上交付：${j(bands.y3plus)}`,
  ].join('\n');
}
