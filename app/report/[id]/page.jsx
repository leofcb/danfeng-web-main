// ============================================================
// /report/[id] — 完整研究级报告落地页（规格 v2 §2，九章结构）。
// 服务端薄壳：尝试从进程内内存快照（reportStore）读回，作为「同实例」快路；
// 取不到时把 serverSnap=null 交给客户端 ReportPage，由其从 localStorage /
// URL hash 自携数据重建（解决 serverless 多实例/冷启动跨实例问题）。
// 项目/开发商/社区详情由客户端组件从三库现场取（三库已在前端包内）。
// ============================================================
import { getReport } from '@/lib/reportStore';
import ReportPage from '@/components/ReportPage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function Page({ params }) {
  const id = String(params?.id || '');
  // 服务端内存快照（同实例命中即用；跨实例为 null，客户端兜底）。
  const snap = getReport(id) || null;
  const serverSnap = snap
    ? {
        reportId: snap.id || id,
        profile: snap.profile || {},
        intro: snap.intro || '',
        gvPath: snap.gvPath || '',
        createdAt: snap.createdAt || '',
        advisor: snap.advisor || '待分配',
        matches: (snap.matches || []).map((m) => ({
          name: m.name,
          matchScore: m.matchScore,
          reasons: Array.isArray(m.reasons) ? m.reasons.slice(0, 3) : [],
        })),
      }
    : null;

  return <ReportPage id={id} serverSnap={serverSnap} />;
}
