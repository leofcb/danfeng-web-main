import { featuredProjects, EMIRATES, PROJECT_COUNT, getDeveloper, isCurrentDfp5 } from '@/lib/catalog';
import MapleRating from './MapleRating';

export default function Projects() {
  const featured = featuredProjects(12);
  return (
    <section className="sec-pad" id="projects">
      <div className="wrap">
        <div className="sec-head reveal in">
          <span className="eyebrow">精选期房 · Emaar</span>
          <h2>覆盖迪拜的 Emaar 期房机会</h2>
          <p>
            智能投顾已接入 <b>{PROJECT_COUNT}</b> 个 Emaar 期房项目（1.0 版数据库）。
            以下为各片区代表项目示例；完整库存由 AI 按你的画像实时匹配。
          </p>
        </div>
        <div className="proj-grid reveal in">
          {featured.map((p) => {
            const e = EMIRATES[p.emirate] || ['e1', p.emirate];
            const dev = getDeveloper(p.developer);
            const rated = isCurrentDfp5(dev); // 旧版残留分数不展示（前端只认当前版本分数）
            return (
              <div className="proj" key={p.name}>
                <div className={'top ' + e[0]}>
                  <span className="tag">{p.tags}</span>
                  <span className="emi">{e[1]}</span>
                </div>
                <div className="body">
                  <div className="pn">{p.name}</div>
                  <div className="pcn">
                    {p.area} · {p.developer}
                    {rated && <MapleRating dfp5={dev.dfp5} variant="mini" size={13} />}
                  </div>
                  <div className="meta">
                    <div><span>起价</span><b>{p.startHint.replace(/（.*）/, '').trim()}</b></div>
                    <div><span>交付</span><b>{p.handover.replace(/（.*）/, '').trim()}</b></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="note-line">
          ※ 起价为开盘起价示意（非实时报价），交付时间以开发商正式文件为准。
          点击「开始智能匹配」获取与你画像匹配的项目；具体户型与实时价格由丹枫持牌顾问确认。
        </p>
      </div>
    </section>
  );
}
