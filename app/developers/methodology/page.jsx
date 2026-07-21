// ============================================================
// /developers/methodology — DFP-5 方法论锚点页（可分享 · SEO · §3）
// 与弹层同一内容（MethodologyContent），独立 canonical 利于收录。
// ============================================================
import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { MethodologyContent } from '@/components/DevMethodologyModal';
import { DEVELOPER_COUNT, RATED_DEVELOPER_COUNT } from '@/lib/catalog';

export const metadata = {
  title: 'DFP-5 开发商评级方法论 · 五维十指标 | 丹枫置业',
  description:
    'DFP-5（Danfeng Five-Pillar）迪拜开发商评级方法论：五维（交付履约/市场表现/规模趋势/法律合规/历史背景）零基客观打分，维度级权重公开，数据源 DLD 登记 + DXB Interact。研究参考，非信用违约评级。',
  keywords: ['DFP-5 方法论', '迪拜开发商评级方法', '开发商评级权重', '丹枫置业'],
  alternates: { canonical: '/developers/methodology' },
};

export default function MethodologyPage() {
  return (
    <>
      <Nav />
      <main className="proj-page pd-page dev-mtd-page" id="top">
        <header className="pd-hero">
          <div className="wrap">
            <Link className="pd-back" href="/developers">← 返回开发商研究库</Link>
            <div className="pd-hero-main">
              <span className="eyebrow">方法论 · Methodology</span>
              <h1>DFP-5 开发商评级方法论</h1>
              <p className="pd-cn">{DEVELOPER_COUNT} 家研究库 · {RATED_DEVELOPER_COUNT} 家已评级 · 每一分可复算</p>
            </div>
          </div>
        </header>
        <div className="wrap pd-body">
          <section className="pd-sec dev-mtd-card">
            <MethodologyContent />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
