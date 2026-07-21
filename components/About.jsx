export default function About() {
  return (
    <section className="sec-pad" id="about">
      <div className="wrap about-grid">
        <div className="reveal in">
          <span className="eyebrow">关于丹枫</span>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(26px,3.2vw,38px)', color: 'var(--paper)', margin: '16px 0 18px', lineHeight: 1.25, fontWeight: 600 }}>
            不是中介，<br />是你的 AI 投资决策伙伴
          </h2>
          <p>丹枫置业（Danfeng Properties）依托迪拜持牌房产经纪资质、两年本地运营、稳定的开发商合作与一手期房资源，正升级为 AI 驱动的智能投顾平台。</p>
          <p>我们用技术把复杂的阿联酋期房投资——区域选择、价格判断、付款结构、签证与税务——拆解为清晰、可执行的决策，让每一次跨境置业都有据可依。</p>
        </div>
        <div className="about-stat reveal in">
          <div className="as"><b>2+</b><span>年迪拜本地运营</span></div>
          <div className="as"><b>4</b><span>大酋长国期房覆盖</span></div>
          <div className="as"><b>90–180</b><span>天华人投资者陪伴周期</span></div>
          <div className="as"><b>AI</b><span>驱动智能匹配引擎</span></div>
        </div>
      </div>
    </section>
  );
}
