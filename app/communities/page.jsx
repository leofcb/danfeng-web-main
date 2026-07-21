// ============================================================
// /communities — 迪拜社区研究库列表页（服务端壳：SEO + 客户端过滤壳）
// 筛选态走 query，canonical 指 /communities（避免筛选组合重复索引 · §7.2）。
// ============================================================
import CommunitiesClient from '@/components/CommunitiesClient';
import { COMMUNITY_COUNT, DISPLAY_COMMUNITY_COUNT, COMMUNITY_WITH_MARKET_COUNT } from '@/lib/catalog';

export const metadata = {
  title: `迪拜社区研究库 · ${COMMUNITY_COUNT} 片区画像与租金回报参考 | 丹枫置业研究`,
  description:
    `丹枫置业迪拜社区研究库：${COMMUNITY_COUNT} 个片区（${DISPLAY_COMMUNITY_COUNT} 精选画像 · ${COMMUNITY_WITH_MARKET_COUNT} 含参考价）。在片区层面判断值不值得买、适合谁、租金回报多少。参考价与回报为公开行情参考（Bayut·PF·DXB Interact），非报价、非收益承诺。AI 智能投顾按你的画像推片区。`,
  keywords: ['迪拜社区', '迪拜片区画像', '租金回报', '社区研究', '丹枫置业', 'Danfeng Properties'],
  alternates: { canonical: '/communities' },
  openGraph: {
    title: `迪拜社区研究库 · ${COMMUNITY_COUNT} 片区画像 | 丹枫置业研究`,
    description: '片区画像 + 公开行情参考，判断值不值得买、适合谁、回报多少。数据源 Bayut·PF·DXB Interact·丹枫研究。',
    type: 'website',
  },
};

export default function CommunitiesPage() {
  return <CommunitiesClient />;
}
