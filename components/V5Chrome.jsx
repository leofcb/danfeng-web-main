// ============================================================
// V5Chrome — v5「象牙白版」共享外壳（Nav / Footer / CTA + 品牌 marker + 图标）
// ------------------------------------------------------------
// 从 ProjectLandingV5.jsx 抽出，供项目页 / 开发商详情页 / 社区详情页三处共用，
// 避免 chrome 漂移（详情页 v5 对齐规格 §1.1 / §1.2）。服务端安全（无 'use client'、
// 无 catalog 依赖），滚动态/reveal 交互仍由 <V5Enhance/> 统一驱动。
// 所有取色继承 .cwv5 作用域根 token（调用方须把本套组件放进 <div className="cwv5">）。
// ============================================================
import Link from 'next/link';

// —— 品牌 marker（v5 原样）——
export const BrandMark = ({ w = 33 }) => (
  <svg className="mk" width={w} height={w} viewBox="0 0 40 40" fill="none" aria-label="Danfeng Capital">
    <rect x="6" y="12" width="8" height="24" rx="1" fill="#C02830" />
    <rect x="26" y="12" width="8" height="24" rx="1" fill="#C02830" />
    <rect x="16" y="6" width="8" height="30" rx="1" fill="#9E2028" />
    <rect x="16.5" y="16.5" width="7" height="7" transform="rotate(45 20 20)" fill="#A88858" />
  </svg>
);

// —— 共享 SVG 图标（护栏禁 emoji · currentColor）——
export const IconLock = ({ cls }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>
);
export const IconRobot = ({ cls }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="11" rx="2.5" /><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6" /><circle cx="4" cy="13" r="0.6" /><circle cx="20" cy="13" r="0.6" /></svg>
);
export const IconChat = ({ cls }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 3z" /><path d="M8 9.5h8M8 12.5h5" /></svg>
);
export const IconPhone = ({ cls }) => (
  <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></svg>
);

// —— V5Nav：象牙白顶栏（70px · 品牌 marker · 中部锚点 · 智能投顾/联系顾问）——
// links: [{ href, label }]；askHref：智能投顾入口；contactHref：联系顾问锚点（默认 #cta）。
export function V5Nav({ links = [], askHref = '/#advisor', contactHref = '#cta' }) {
  return (
    <nav id="nav"><div className="nav-inner">
      <Link className="brand" href="/">
        <BrandMark />
        <span className="bt"><span className="en">Danfeng Capital</span><span className="cn">丹 枫 资 本</span></span>
      </Link>
      <div className="nav-links">
        {links.map((l, i) => <a key={i} href={l.href}>{l.label}</a>)}
      </div>
      <div className="nav-cta">
        <a className="btn btn-ghost" href={askHref} style={{ padding: '10px 16px', fontSize: 13 }}>智能投顾</a>
        <a className="btn btn-red" href={contactHref} style={{ padding: '10px 18px', fontSize: 13 }}>联系顾问</a>
      </div>
    </div></nav>
  );
}

// —— V5Cta：全站唯一深色块 · 双路径 CTA（左=智能投顾[AI 对话+报告] / 右=加微信[顾问]）——
// LEO 点⑦：移除原第三条海外 IM 路径，仅留 AI + 微信两路径。
// askHref：AI 主路径入口；heading/intro：各页微调文案；contactHref：加微信入口。
export function V5Cta({ askHref, heading, intro, eyebrow = '下 一 步', contactHref = '/#contact' }) {
  return (
    <section className="sec cta" id="cta"><div className="wrap">
      <div className="cta-in">
        <div className="eyebrow">{eyebrow}</div>
        <h2>{heading}</h2>
        <p>{intro}</p>
      </div>
      <div className="cta-paths cta-paths-2 reveal">
        <div className="cpath primary">
          <div className="ci"><IconRobot cls="cii" /></div>
          <h4>智能投顾 · AI 在线分析</h4>
          <p>与丹枫 AI 智能投顾对话，基于三库真实数据分析你的需求，1 分钟生成专属《投资分析报告》。</p>
          <a className="cbtn" href={askHref}>开始对话 · 生成报告</a>
        </div>
        <div className="cpath">
          <div className="ci"><IconChat cls="cii" /></div>
          <h4>加微信 · 持牌顾问</h4>
          <div className="cqr"><div className="qr" /><small>扫码加顾问微信<br />真实报价 · 可售套数 · 线下看房</small></div>
          <a className="cbtn" href={contactHref}>复制微信号 / 扫码</a>
        </div>
      </div>
    </div></section>
  );
}

// —— V5Footer：象牙白页脚 · 品牌 + 合规免责（.foot-disc 排版壳）——
// disclaimer：各页现有 note-line 免责节点（逐字保留，仅搬进 v5 排版壳）。
// licenseLine：RERA/ORN 牌照行文本。
export function V5Footer({
  disclaimer,
  licenseLine = 'RERA / Trakheesi 牌照号：[待填] · ORN：[待填]',
}) {
  return (
    <footer><div className="wrap foot-in">
      <div>
        <div className="foot-brand"><BrandMark w={30} /><span className="fb-t">Danfeng Capital · 丹枫资本</span></div>
        <div className="foot-tag">Investing in Value. Building the Future.</div>
        <div className="foot-tag2">链接东方资本与中东机遇 · Investment · Development · Management</div>
      </div>
      <div className="foot-disc">
        <div className="lic">{licenseLine}</div>
        {disclaimer}
      </div>
    </div></footer>
  );
}
