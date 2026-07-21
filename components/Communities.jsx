// ============================================================
// ④ 热门社区 Communities（主页橱窗 · §8）
// 首页保留为橱窗（hotCommunities 6），卡片复用 CommunityCard（与 /communities
// 列表页同一组件，消除卡逻辑重复）；底部 pill 换实链进 /communities。
// ============================================================
import Link from 'next/link';
import { hotCommunities, COMMUNITY_COUNT, DISPLAY_COMMUNITY_COUNT } from '@/lib/catalog';
import CommunityCard from './CommunityCard';

export default function Communities() {
  const list = hotCommunities(10);
  return (
    <section className="sec-pad" id="communities">
      <div className="wrap">
        <div className="sec-head reveal in">
          <span className="eyebrow">热门社区 · Communities</span>
          <h2>迪拜社区研究库</h2>
          <p>每个片区含定位、生活方式、交通配套与租金回报参考，帮您在片区层面判断值不值得买、适合谁。</p>
          <div className="sec-badges">
            <span className="data-badge">{COMMUNITY_COUNT} 迪拜社区</span>
            <span className="ts-badge">{DISPLAY_COMMUNITY_COUNT} 精选画像</span>
            <span className="ts-badge">更新 2026-07</span>
            <span className="src-note">数据来源：Bayut · PF · DXB Interact · 丹枫研究</span>
          </div>
        </div>

        <div className="comm-grid cc-grid reveal in">
          {list.map((c) => <CommunityCard key={c.communityId || c.name} c={c} />)}
        </div>

        <div className="sec-foot">
          <Link className="btn btn-ghost" href="/communities">浏览全部 {COMMUNITY_COUNT} 个社区 →</Link>
          <p className="note-line">
            社区参考价与租金回报为片区级公开行情参考（Bayut · PF · DXB Interact），非丹枫报价、非收益承诺；具体房源、价格与房态以丹枫持牌顾问及开发商正式文件为准。
          </p>
        </div>
      </div>
    </section>
  );
}
