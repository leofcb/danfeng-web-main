const CARDS = [
  ['01', '0% 个人所得税', '个人房产的租金与增值收益免征所得税，长期持有成本显著低于多数热门市场。'],
  ['02', '黄金签证', '单套 AED 200 万（约 ¥390 万）房产投资，即可申请 10 年可续签长期居留，覆盖配偶与子女。'],
  ['03', '灵活付款计划', '期房普遍提供 1–4 年分期，部分项目支持交付后付款，用更小的首付撬动资产。'],
  ['04', '外国人全资持有', '在指定自由持有（Freehold）区内，外籍人士可 100% 拥有产权，可继承、可转让。'],
  ['05', '增长与租金', '迪拜等核心区域租金回报多处于较高区间，叠加人口流入带来的资本增值空间。'],
  ['06', '丹枫一手资源', '持牌经纪资质 + 开发商直签，一手期房价格与优先选房，AI 帮你筛出真正匹配的项目。'],
];

export default function WhyUAE() {
  return (
    <section className="sec-pad paper" id="why">
      <div className="wrap">
        <div className="sec-head reveal in">
          <span className="eyebrow">为何选择阿联酋期房</span>
          <h2>全球资本正在重新配置中东</h2>
          <p>对中国高净值家庭而言，阿联酋期房同时承载着资产配置、身份规划与现金流管理三重价值。</p>
        </div>
        <div className="why-grid reveal in">
          {CARDS.map(([n, h, p]) => (
            <div className="why-card" key={n}>
              <div className="n">{n}</div>
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
