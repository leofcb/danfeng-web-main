// ============================================================
// ② 精选项目 Featured Projects（主页橱窗 · §3.3 / 设计规格 §9）
// 首页 Top 8 橱窗：口径统一走 rankProjects 引擎（featuredProjects），
// 卡片复用共享 ProjectCard（无图数据卡）。底部「查看全部 →」进 /projects。
// ============================================================
import Link from 'next/link';
import { featuredProjects, PROJECT_COUNT, CATALOG_UPDATED } from '@/lib/catalog';
import ProjectCard from './ProjectCard';

export default function FeaturedProjects() {
  const featured = featuredProjects(10);
  return (
    <section className="sec-pad" id="projects">
      <div className="wrap">
        <div className="sec-head reveal in">
          <span className="eyebrow">精选项目 · Featured Projects</span>
          <h2>覆盖迪拜的在售期房机会</h2>
          <p>研究驱动的项目索引——每张卡都能一键交给 AI 做深度分析；完整库存由 AI 按您的画像实时匹配。</p>
          <div className="sec-badges">
            <span className="data-badge">{PROJECT_COUNT} 个期房项目</span>
            <span className="ts-badge">更新 {CATALOG_UPDATED}</span>
            <span className="src-note">数据来源：DLD · DXB Interact · 丹枫研究</span>
          </div>
        </div>

        <div className="pcard-grid reveal in">
          {featured.map((p) => <ProjectCard key={p.name} p={p} />)}
        </div>

        <div className="sec-foot">
          <Link className="btn btn-gold" href="/projects">查看全部 {PROJECT_COUNT} 个项目 →</Link>
          <p className="note-line">
            ※ 起价为开盘起价示意（非实时报价），交付时间以开发商正式文件为准；
            具体户型与实时价格由丹枫持牌顾问确认。
          </p>
        </div>
      </div>
    </section>
  );
}
