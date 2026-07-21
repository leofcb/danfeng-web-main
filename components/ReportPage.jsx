'use client';

// ============================================================
// ReportPage — 研究级完整报告落地页（规格 v2 §2，九章结构）。
// 米白纸研究文档风（对标 danfeng-matching-report-sample.html），移动端可读，
// 打印样式即 PDF 方案（window.print → @media print A4 干净分页，零依赖零成本）。
// ------------------------------------------------------------
// 快照解析优先级（解决跨实例问题）：服务端内存 serverSnap → localStorage
//   → URL hash 自携数据（#d=）。三库详情由本页从前端包现场取（findProject/
//   getDeveloper/getCommunity），故快照只需 id + 画像 + 匹配结果。
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { findProject, EMIRATES, getDeveloper, getCommunity, getAssets, projectSlug } from '@/lib/catalog';
import { loadReportLocal, readHashReport, saveReportLocal } from '@/lib/reportClient';
import { SHOW_EXTERNAL_DEV_LINKS, SHOW_BROCHURE } from '@/lib/flags';
import DeveloperRatingCard from './DeveloperRatingCard';
import CommunityProfile from './CommunityProfile';

const WECHAT = process.env.NEXT_PUBLIC_WECHAT_ID || '';
const RERA = process.env.NEXT_PUBLIC_RERA_LICENSE || '';
const TRAKHEESI = process.env.NEXT_PUBLIC_TRAKHEESI_LICENSE || '';
const licenseText = [RERA && `RERA ${RERA}`, TRAKHEESI && `Trakheesi ${TRAKHEESI}`].filter(Boolean).join(' · ');

const fmtDate = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
};
const round1 = (n) => Math.round(n * 10) / 10;

// —— §1 画像 pills ——
function ProfilePills({ profile }) {
  const p = profile || {};
  const pills = [];
  if (p.budgetAED) {
    const aed = Number(p.budgetAED);
    const rmbWan = Math.round((aed * 1.95) / 1000) / 10; // ¥ 万（汇率估算）
    pills.push(['key', `预算 约 AED ${(aed / 1e6 >= 1 ? round1(aed / 1e6) + 'M' : aed.toLocaleString())}（¥${rmbWan}万 · 估算）`]);
  } else if (p.budget) {
    pills.push(['key', `预算 ${p.budget}`]);
  }
  if (p.goal) pills.push(['red', `目的 ${p.goal}`]);
  if (p.city) pills.push(['', p.city]);
  const arr = (a) => (Array.isArray(a) ? a.filter(Boolean) : []);
  arr(p.regions).forEach((r) => pills.push(['', r]));
  arr(p.types).forEach((t) => pills.push(['', t]));
  arr(p.beds).forEach((b) => pills.push(['', b]));
  if (p.handover) pills.push(['', `交付 ${p.handover}`]);
  if (p.risk) pills.push(['', `风险 ${p.risk}`]);
  arr(p.payment).forEach((x) => pills.push(['', x]));
  arr(p.prefs).forEach((x) => pills.push(['', x]));
  if (!pills.length) pills.push(['', '画像信息以本次对话为准']);
  return (
    <div className="rd-profile">
      <div className="rd-pills">
        {pills.map(([cls, txt], i) => <span key={i} className={'rd-pill' + (cls ? ' ' + cls : '')}>{txt}</span>)}
      </div>
    </div>
  );
}

// —— §2 市场研判（据三库真实字段生成，带出处；不含实时房源价）——
function MarketContext({ projects }) {
  const first = projects.find(Boolean);
  if (!first) return null;
  const emiLabel = (EMIRATES[first.emirate] || ['', ''])[1];
  const areas = [...new Set(projects.map((p) => p.area).filter(Boolean))];
  const isDubai = first.emirate === 'dubai';

  const paras = [];
  paras.push(
    isDubai
      ? '就「身份规划 + 租金稳健」这一组合，迪拜相较其它酋长国更易同时满足：期房库存更厚、租赁需求与二手流动性更强，AED 200 万级别的选择面显著更大。本次匹配集中在迪拜核心与新兴价值板块。'
      : `本次匹配覆盖 ${emiLabel}。相较迪拜，该酋长国期房覆盖更聚焦特定片区，更适合自住/长持；租赁活跃度与二手流动性需结合具体片区判断。`
  );

  // 片区社区画像佐证（取首个命中社区）。
  let commCited = false;
  for (const a of areas) {
    const c = getCommunity(a);
    if (c && c.profile && c.profile.blurbCn) {
      const snip = c.profile.blurbCn.split('。')[0] + '。';
      paras.push(`片区 ${a}：${snip}`);
      commCited = true;
      break;
    }
  }

  // 开发商市场动能佐证（取本报告涉及、有 dxb 数据的开发商）。
  let devCited = null;
  for (const p of projects) {
    const dev = getDeveloper(p.developer);
    if (dev && dev.dxb && Number.isFinite(dev.dxb.capitalGainPct)) { devCited = dev; break; }
  }
  if (devCited) {
    const dxb = devCited.dxb;
    const bits = [];
    if (Number.isFinite(dxb.capitalGainPct) && dxb.capitalGainPct > 0) bits.push(`近 12 个月转售中位涨幅约 ${round1(dxb.capitalGainPct)}%`);
    if (Number.isFinite(dxb.absorptionPct)) bits.push(`在建盘去化率约 ${round1(dxb.absorptionPct)}%`);
    if (bits.length) paras.push(`开发商动能参考：${devCited.cn ? devCited.cn + '（' + devCited.name + '）' : devCited.name} ${bits.join('、')}，反映其片区去化与增值表现。`);
  }

  const sources = ['来源 · DXB Interact'];
  if (commCited) sources.push('来源 · 丹枫社区库');
  sources.push('来源 · DLD 登记');

  return (
    <div className="rd-market">
      {paras.map((t, i) => <p key={i}>{t}</p>)}
      <div className="rd-src-badges">
        {sources.map((s, i) => <span key={i} className="rd-src-badge">{s}</span>)}
      </div>
    </div>
  );
}

// —— §3 项目深析卡 ——
function ProjectCard({ m }) {
  const p = findProject(m.name);
  const score = Math.max(0, Math.min(100, parseInt(m.matchScore, 10) || 0));
  const e = p ? EMIRATES[p.emirate] : ['', ''];
  return (
    <div className="rd-card">
      <div className="rd-card-top">
        <div>
          <div className="rd-pn">{m.name}</div>
          {p && <div className="rd-pcn">{[p.cn, p.area, e[1], p.developer].filter(Boolean).join(' · ')}</div>}
        </div>
        <div className="rd-score">
          <div className="t">匹配度</div>
          <div className="v">{score}%</div>
          <div className="rd-bar"><i style={{ width: score + '%' }} /></div>
        </div>
      </div>

      {Array.isArray(m.reasons) && m.reasons.length > 0 && (
        <div className="rd-reasons">{m.reasons.map((r, i) => <div key={i}>{r}</div>)}</div>
      )}

      {p && (
        <>
          <div className="rd-meta">
            <span className="rd-tag gv">黄金签证 {p.gv}</span>
            <span className="rd-tag">起价示意 <b>{p.startHint}</b></span>
            <span className="rd-tag">交付 <b>{p.handover}</b></span>
            <span className="rd-tag">类型 {p.types}</span>
          </div>

          <div className="rd-dgrid">
            {p.blurb && <div><span className="dl">项目简介</span><p>{p.blurb}</p></div>}
            <div><span className="dl">片区</span><p>{p.area}</p></div>
            {p.unitInfo && <div><span className="dl">户型与面积</span><p>{p.unitInfo}</p></div>}
            {p.payment && <div><span className="dl">付款计划结构</span><p>{p.payment}</p></div>}
            <div><span className="dl">交付与进度</span><p>计划交付 {p.handover}{p.status ? ` · ${p.status}` : ''}。</p></div>
            <div><span className="dl">起价示意</span><p>{p.startHint}</p></div>
            {p.location && <div><span className="dl">交通与距离</span><p style={{ whiteSpace: 'pre-line' }}>{p.location}</p></div>}
            {p.amenities && <div><span className="dl">周边/社区配套</span><p style={{ whiteSpace: 'pre-line' }}>{p.amenities}</p></div>}
          </div>

          {/* 开发商评级小节（嵌入 §2.5） */}
          <DeveloperRatingCard developer={p.developer} />

          {/* 社区画像小节（研究级新增，命中才渲染） */}
          <CommunityProfile area={p.area} compact />

          <div className="rd-guard">具体可售户型、实时价格与优惠以丹枫持牌顾问确认为准。</div>
          <div className="rd-acts">
            {/* 项目官网外链 2026-07-10 起隐藏（SHOW_EXTERNAL_DEV_LINKS=false · lib/flags.js） */}
            {SHOW_EXTERNAL_DEV_LINKS && p.landingUrl
              ? <a className="rd-btn red" href={p.landingUrl} target="_blank" rel="noopener noreferrer">查看完整落地页 →</a>
              : <span className="rd-btn muted">完整项目页 · 建设中</span>}
            {/* 楼书 PDF：仅认 assets-manifest 本地 brochure（/brochures/…）；无本地素材 → 待上传占位 */}
            {SHOW_BROCHURE && getAssets(projectSlug(p))?.brochure
              ? <a className="rd-btn ghost" href={getAssets(projectSlug(p)).brochure} target="_blank" rel="noopener noreferrer">下载项目手册 PDF</a>
              : <span className="rd-btn muted">项目手册 · 待上传</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportPage({ id, serverSnap }) {
  const [snap, setSnap] = useState(serverSnap || null);
  const [resolved, setResolved] = useState(!!serverSnap);

  useEffect(() => {
    if (serverSnap) return;
    // 服务端未命中（多实例/冷启动）→ localStorage → URL hash 自携数据。
    let s = loadReportLocal(id);
    if (!s) {
      const hs = readHashReport();
      if (hs && (!id || hs.reportId === id)) {
        s = hs;
        saveReportLocal(hs); // 回填本地，便于再次访问
      }
    }
    setSnap(s || null);
    setResolved(true);
  }, [id, serverSnap]);

  const doPrint = () => { if (typeof window !== 'undefined') window.print(); };
  const doShare = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
    alert('报告链接已复制，可粘贴到微信转发给顾问或亲友。');
  };

  const matches = (snap && snap.matches) || [];
  const projects = matches.map((m) => findProject(m.name)).filter(Boolean);
  // 去重开发商（保序）。
  const devNames = [...new Set(projects.map((p) => p.developer).filter(Boolean))];
  // 去重命中社区。
  const commAreas = [...new Set(projects.map((p) => p.area).filter(Boolean))].filter((a) => getCommunity(a));
  const date = fmtDate(snap && snap.createdAt);
  const anyGV = projects.some((p) => /适配/.test(p.gv || ''));

  return (
    <main className="report-doc">
      {/* 交互工具条（打印时隐藏） */}
      <div className="rd-toolbar">
        <Link href="/#console" className="rd-tb-btn back">← 返回与子枫对话</Link>
        <div className="rd-tb-right">
          <button className="rd-tb-btn" onClick={doShare}>复制链接 / 转发</button>
          <button className="rd-tb-btn primary" onClick={doPrint}>下载 PDF / 打印</button>
        </div>
      </div>

      <div className="rd-sheet">
        {/* 页眉 */}
        <div className="rd-hd">
          <div className="rd-brand">
            <img src="/logo-mark.png" alt="丹枫置业" />
            <div><div className="en">Danfeng Properties</div><div className="cn">丹 枫 置 业</div></div>
          </div>
          <div className="rd-hd-meta">
            报告编号 {id}<br />生成时间 {date}<br />顾问 {(snap && snap.advisor) || '待分配'}<br />方法论 DFP-5 v3.1
          </div>
        </div>

        {!resolved ? (
          <div className="rd-body"><p className="rd-loading">正在载入报告…</p></div>
        ) : !snap ? (
          <div className="rd-body">
            <span className="rd-tag2">● 研究报告</span>
            <h1>阿联酋期房智能投顾研究报告</h1>
            <div className="rd-notfound">
              未能在本设备找到该报告快照（{id}）。报告数据保存在生成它的浏览器本地或分享链接里——
              若您是通过他人转发打开，请使用完整分享链接（含 <code>#d=</code> 数据）；或返回与子枫对话重新生成。
              具体房源与报价，欢迎联系丹枫持牌顾问。
            </div>
            <div className="rd-acts" style={{ marginTop: 18 }}>
              <Link href="/#console" className="rd-btn red">返回与子枫对话 →</Link>
              <Link href="/#contact" className="rd-btn ghost">联系持牌顾问</Link>
            </div>
          </div>
        ) : (
          <div className="rd-body">
            {/* 封面导语 */}
            <span className="rd-tag2">● AI 智能匹配 · 研究级 · 项目级</span>
            <h1>阿联酋期房智能投顾研究报告</h1>
            <div className="rd-h1sub">
              基于您的投资画像，子枫从丹枫在售项目库中检索、筛选并按加权模型排序；本报告为项目级研究参考，
              具体户型与实时价格由丹枫持牌顾问确认。
            </div>

            {/* §1 客户画像 */}
            <div className="rd-label">§1 客户画像</div>
            <ProfilePills profile={snap.profile} />
            {snap.intro && <p className="rd-intro">{snap.intro}</p>}

            {/* §2 市场研判 */}
            <div className="rd-label">§2 市场研判</div>
            <MarketContext projects={projects} />

            {/* §3 推荐项目深析 */}
            <div className="rd-label">§3 推荐项目深析</div>
            {matches.map((m, i) => <ProjectCard key={i} m={m} />)}

            {/* §4 开发商 DFP-5 评级深析 */}
            {devNames.length > 0 && (
              <>
                <div className="rd-label">§4 开发商 DFP-5 评级深析</div>
                {devNames.map((dn, i) => <DeveloperRatingCard key={i} developer={dn} />)}
              </>
            )}

            {/* §5 社区画像 */}
            {commAreas.length > 0 && (
              <>
                <div className="rd-label">§5 社区画像</div>
                {commAreas.map((a, i) => <CommunityProfile key={i} area={a} />)}
              </>
            )}

            {/* §6 黄金签证路径 */}
            <div className="rd-label">§6 黄金签证路径</div>
            <div className="rd-gvbox">
              <h3>Golden Visa Path</h3>
              <p>{snap.gvPath || 'UAE 黄金签证房产路径门槛为单套 AED 200 万；达门槛可申请 10 年可续签长期居留，覆盖配偶与子女。'}</p>
              <p className="rd-gv-note">
                {anyGV
                  ? '本报告中已有项目起价达门槛、可一步到位；其余项目选取较大户型或做组合配置亦有机会达标。'
                  : '本报告项目多为门槛以下；若以身份规划为先，建议上探更大户型或别墅类项目。'}
                资格、流程与税务以丹枫顾问及官方为准。
              </p>
            </div>

            {/* §7 财务口径与风险声明 */}
            <div className="rd-label">§7 财务口径与风险声明</div>
            <div className="rd-disc-box">
              <p><b>匹配度口径：</b>由丹枫本地加权模型评估，维度含预算贴合、增值潜力、黄金签证适配、片区分层与开发商 DFP-5 评级等；为研究参考、非精确概率。</p>
              <p><b>价格口径：</b>「起价示意」为开盘起价、非实时报价；社区级参考价为公开行情参考、非某一具体房源报价、非收益承诺；汇率为估算。</p>
              <p><b>数据来源与时效：</b>DLD 登记 / DXB Interact 交易口径 / 丹枫项目库、社区库；市场数据可能滞后，以标注 as-of 为准。</p>
              <p><b>风险声明：</b>本报告提供研究参考，不构成投资 / 法律 / 税务意见，不担保任何回报；DFP-5 为研究参考、非信用违约评级；市场有波动，请结合自身情况判断。</p>
            </div>

            {/* CTA */}
            <div className="rd-cta">
              <div>
                <div className="ct-t">下一步：由顾问为您锁定具体房源与报价</div>
                <div className="ct-s">顾问将基于本报告（{id}）为您优选可售单元；具体户型、当期价格与房态以持牌顾问确认为准。</div>
              </div>
              <div className="rd-qr">
                {WECHAT ? <span>微信<br />{WECHAT}</span> : <span>微信<br />待替换</span>}
              </div>
            </div>
            <div className="rd-aigen">本报告由丹枫智能投顾「子枫」基于项目级信息与丹枫研究模型生成，匹配度与理由为模型评估，仅供参考。</div>
          </div>
        )}

        {/* 页脚（合规） */}
        <div className="rd-ft">
          <div className="fb">Danfeng Properties 丹枫置业</div>
          本报告仅匹配到项目层面，不含具体房源与实时报价，不构成投资、法律或税务意见，也不对任何回报作出保证。
          信息遵循阿联酋 RERA / Trakheesi 广告许可与 UAE PDPL 数据保护要求。
          {licenseText ? ` ${licenseText}.` : ''} © 2026 Danfeng Properties · {id}
        </div>
      </div>
    </main>
  );
}
