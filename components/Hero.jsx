'use client';

import { useAdvisor } from './AdvisorProvider';

// 首屏引导胶囊 → 点选即把该句作为首条用户消息注入 AI 聊天流（§3.2 seedFromHero）。
const HERO_CHIPS = ['黄金签证', '稳健出租', '资本增值', '子女教育', '自住'];
const HERO_SEED = {
  黄金签证: '我想通过迪拜期房拿黄金签证，帮我看看合适的项目。',
  稳健出租: '我更看重稳定的租金回报，迪拜哪些片区适合？',
  资本增值: '我想要长期资本增值，帮我判断方向。',
  子女教育: '我看重子女教育与家庭社区，迪拜有哪些合适片区？',
  自住: '我打算自住，帮我看看合适的迪拜期房。',
};
const HERO_Q = '200 万 AED 预算，想拿黄金签证，同时要稳定租金回报，迪拜哪个片区更合适？';

const gotoConsole = () => document.getElementById('console')?.scrollIntoView({ behavior: 'smooth' });

export default function Hero() {
  const { seedFromHero } = useAdvisor();
  const seed = (text) => (seedFromHero ? seedFromHero(text) : gotoConsole());
  return (
    <header className="hero" id="top">
      <div className="hero-bg" />
      <div className="wrap hero-grid">
        <div className="reveal in">
          <span className="eyebrow">数据驱动 · 阿联酋期房智能投顾</span>
          <h1>看懂你的<br /><span className="hl">阿联酋期房</span>投资</h1>
          <div className="en-sub">Off-Plan Investment Advisory · UAE</div>
          <p className="lead">
            面向全球华人高净值投资者。填写你的投资画像，即时生成专属投资报告——从酋长国与区域选择、黄金签证路径，到付款计划与风险提示。
          </p>
          <div className="hero-actions">
            <button className="btn btn-red" onClick={gotoConsole}>与 AI 开始对话 →</button>
            <a href="#projects" className="btn btn-ghost" onClick={(e) => { e.preventDefault(); document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' }); }}>浏览精选项目</a>
          </div>
          <div className="statline">
            <div className="s"><b>0%</b> 个人所得税</div>
            <div className="s"><b>AED 2M</b> 黄金签证门槛</div>
            <div className="s">外国人可<b>全资</b>持有</div>
            <div className="s"><b>4</b> 大酋长国覆盖</div>
          </div>
        </div>
        {/* 静态预览卡（营销示意，非采集入口）——整卡点击滚动到下方「AI」向导。
            移除旧自由文本框 + 死按钮，避免与 AI 重复造成「双胞胎助手」（验收 P1）。 */}
        <div
          className="reveal in demo-card demo-card-static"
          role="button"
          tabIndex={0}
          onClick={() => seed(HERO_Q)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); seed(HERO_Q); } }}
          title="点击，把这句话交给 AI 开始对话"
        >
          <div className="dc-h"><span className="dot" /><span className="dc-t">Danfeng Advisor · 示例</span></div>
          <div className="dc-q">「200 万 AED 预算，想拿黄金签证，同时要稳定租金回报，迪拜哪个片区更合适？」</div>
          <div className="dc-a">
            AI 会用约 1 分钟、几个问题了解您的预算、目的、片区偏好，随后从 700+ 精选期房中为您匹配方向并生成专属报告。
          </div>
          <div className="chips">
            {HERO_CHIPS.map((c) => (
              <button
                key={c}
                className="chip"
                onClick={(e) => { e.stopPropagation(); seed(HERO_SEED[c] || c); }}
              >{c}</button>
            ))}
          </div>
          <span className="btn btn-gold dc-cta" style={{ width: '100%', justifyContent: 'center' }}>
            与「AI」开始对话 →
          </span>
        </div>
      </div>
    </header>
  );
}
