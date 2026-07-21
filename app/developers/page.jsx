// ============================================================
// /developers — DFP-5 开发商研究库列表页（服务端壳：SEO + 客户端过滤壳）
// 筛选态走 query，canonical 指 /developers（避免筛选组合重复索引 · §5）。
// ============================================================
import DevelopersClient from '@/components/DevelopersClient';
import { DEVELOPER_COUNT, RATED_DEVELOPER_COUNT } from '@/lib/catalog';

export const metadata = {
  title: `DFP-5 独立开发商评级 · ${DEVELOPER_COUNT} 家研究库 / ${RATED_DEVELOPER_COUNT} 家已评级 | 丹枫置业`,
  description:
    `丹枫置业 DFP-5 独立开发商评级：以 DLD 登记 + DXB Interact 交易口径为原始数据，从交付履约/市场表现/规模趋势/法律合规/历史背景五维为 ${DEVELOPER_COUNT} 家迪拜开发商零基客观打分，${RATED_DEVELOPER_COUNT} 家已评级、每分可复算。研究参考，非信用评级。`,
  keywords: ['迪拜开发商评级', 'DFP-5', '开发商 DFP-5 评级', 'Emaar 评级', '丹枫置业', 'Danfeng Properties'],
  alternates: { canonical: '/developers' },
  openGraph: {
    title: `DFP-5 独立开发商评级 · ${DEVELOPER_COUNT} 家研究库 | 丹枫置业`,
    description: '评级机构式的迪拜开发商研判：五维零基打分、每分可复算。数据源 DLD·DXB Interact·丹枫研究。',
    type: 'website',
  },
};

export default function DevelopersPage() {
  return <DevelopersClient />;
}
