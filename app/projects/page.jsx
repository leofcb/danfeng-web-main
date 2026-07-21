// ============================================================
// /projects — 精选项目列表页（服务端壳：SEO metadata + 客户端过滤壳）
// 筛选态走 query，canonical 指向 /projects（避免筛选组合重复索引 · §7.1）。
// ============================================================
import ProjectsClient from '@/components/ProjectsClient';
import { PROJECT_COUNT } from '@/lib/catalog';

export const metadata = {
  title: `精选期房项目 · 迪拜为主 ${PROJECT_COUNT} 个在售期房 | 丹枫置业研究`,
  description:
    `丹枫置业研究驱动的中东期房项目库，覆盖迪拜等地 ${PROJECT_COUNT} 个期房。按城市/社区/开发商/预算/交付/黄金签证筛选，AI 智能投顾一键分析。数据源 DLD·DXB Interact。`,
  keywords: ['迪拜期房', '阿联酋期房项目', '黄金签证', '开发商 DFP-5 评级', '丹枫置业', 'Danfeng Properties'],
  alternates: { canonical: '/projects' },
  openGraph: {
    title: `精选期房项目 · 迪拜为主 ${PROJECT_COUNT} 个在售期房 | 丹枫置业研究`,
    description: '研究驱动的中东期房项目库，AI 智能投顾一键分析。数据源 DLD·DXB Interact·丹枫研究。',
    type: 'website',
  },
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
