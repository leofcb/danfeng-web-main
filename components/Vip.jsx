export default function Vip() {
  return (
    <section className="sec-pad paper" id="vip">
      <div className="wrap">
        <div className="sec-head reveal in">
          <span className="eyebrow">VIP 会员 · 即将开放</span>
          <h2>从信息，到陪伴式投资决策</h2>
          <p>免费体验智能投顾基础能力，进阶与年度会员解锁深度尽调、一对一顾问与优先选房。</p>
        </div>
        <div className="vip-grid reveal in">
          <div className="vip-card">
            <div className="tier">免费会员</div>
            <div className="price">¥0</div>
            <ul>
              <li>AI 智能投顾基础匹配</li>
              <li>四大酋长国期房资讯</li>
              <li>黄金签证资格初判</li>
              <li>精选项目浏览</li>
            </ul>
            <div className="vbtn">立即开始</div>
          </div>
          <div className="vip-card feat">
            <div className="badge">最受欢迎</div>
            <div className="tier">进阶会员</div>
            <div className="price">$99<small> / 月</small></div>
            <ul>
              <li>深度 AI 投资报告（含现金流测算）</li>
              <li>项目尽调与风险评估</li>
              <li>专属顾问微信答疑</li>
              <li>新盘优先选房通道</li>
            </ul>
            <div className="vbtn">预约开通</div>
          </div>
          <div className="vip-card">
            <div className="tier">年度尊享</div>
            <div className="price">$2,999<small> / 年</small></div>
            <ul>
              <li>进阶会员全部权益</li>
              <li>一对一投资规划与陪同看房</li>
              <li>黄金签证 + 税务全流程协办</li>
              <li>资产组合年度复盘</li>
            </ul>
            <div className="vbtn">预约咨询</div>
          </div>
        </div>
        <p className="note-line" style={{ color: '#9a8f80' }}>※ 会员定价为规划方案，正式开放与权益以届时公告为准。</p>
      </div>
    </section>
  );
}
