'use client';

// ============================================================
// /developers 列表页（客户端筛选/排序/视图切换 · 设计规格 §1）
// ------------------------------------------------------------
// 母版 = ProjectsClient：一级筛选 Dropdown + 排序 + URL query 保态。
// 两视图：评级榜（Rated ~100，研究行）/ 研究库全量（320，密表，NR 平权）。
// 数据已在包内（developers.json 320 家），客户端过滤，零 API。
// 护栏：CRM/人工星评/Tier 零出现；NR 中性灰、绝不用红、不折叠。
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEVELOPERS, DEVELOPER_COUNT, RATED_DEVELOPER_COUNT,
  developerSlug, askDeveloperHref, isCurrentDfp5, isStaleDfp5, matchDeveloperQuery, getDeveloperLogo,
} from '@/lib/catalog';
import Nav from './Nav';
import Footer from './Footer';
import MapleRating from './MapleRating';
import DevMethodologyModal from './DevMethodologyModal';
import SearchBox from './SearchBox';

const round1 = (n) => Math.round(n * 10) / 10;
const fmtInt = (n) => (Number.isFinite(n) ? Number(n).toLocaleString() : '—');
const unitsShort = (u) => {
  if (!Number.isFinite(u) || u <= 0) return '—';
  return u >= 10000 ? `${round1(u / 10000)}万套` : `${u.toLocaleString()} 套`;
};

// —— 所有制归一（253 家 null → unlabeled，不假装有值）——
const OWN_MAP = { Government: 'gov', Private: 'private', 'Public Listed': 'public', 'Local Family': 'family' };
const OWN_OPTS = [['gov', '政府'], ['private', '私营'], ['public', '上市'], ['family', '本地家族'], ['unlabeled', '未标注']];
const ownBucket = (o) => OWN_MAP[o] || 'unlabeled';
const OWN_LABEL = Object.fromEntries(OWN_OPTS);

// —— 评级状态 / 置信度 / 分数段（筛选维度；Tier 不做——数据无此字段）——
const STATUS_OPTS = [['rated', '已评级 Rated'], ['nr', '未评级 NR']];
const CONF_OPTS = [['High', '高 High'], ['Medium', '中 Medium'], ['Low', '低 Low']];
const BAND_OPTS = [['b90', '90 分以上'], ['b80', '80–90'], ['b70', '70–80'], ['b60', '60–70'], ['b0', '60 分以下']];
const scoreBand = (s) => {
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n >= 90) return 'b90';
  if (n >= 80) return 'b80';
  if (n >= 70) return 'b70';
  if (n >= 60) return 'b60';
  return 'b0';
};

// —— 排序 ——
const SORT_OPTS = [
  ['score', 'DFP-5 综合分'],
  ['capital', '资本增值率 高→低'],
  ['delivered', '交付规模 高→低'],
  ['uc', '在建规模 高→低'],
  ['sales', '近12月成交额 高→低'],
  ['founded-old', '成立年份 老→新'],
  ['founded-new', '成立年份 新→老'],
  ['rank', 'DXB 综合排名'],
];

// 五维标签（与全站 DIMS 常量一致）+ 迷你条首字。
const DIM_KEYS = [['a', '交'], ['b', '市'], ['c', '规'], ['d', '合'], ['e', '背']];

// —— 排序键（无值沉底）——
function sortDevs(list, sort) {
  const arr = [...list];
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const byDesc = (get) => (a, b) => {
    const x = num(get(a)), y = num(get(b));
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return y - x;
  };
  const byAsc = (get) => (a, b) => {
    const x = num(get(a)), y = num(get(b));
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return x - y;
  };
  switch (sort) {
    // 旧版残留分数不可比、不参与排序（sink 到底部，与筛选/榜单口径一致）。
    case 'score': return arr.sort(byDesc((d) => (isCurrentDfp5(d) ? d.dfp5.score : null)));
    case 'capital': return arr.sort(byDesc((d) => d.dxb && d.dxb.capitalGainPct));
    case 'delivered': return arr.sort(byDesc((d) => d.dxb && d.dxb.deliveredUnits));
    case 'uc': return arr.sort(byDesc((d) => d.dxb && d.dxb.ucUnits));
    case 'sales': return arr.sort(byDesc((d) => d.dxb && d.dxb.salesValueBn));
    case 'founded-old': return arr.sort(byAsc((d) => d.founded));
    case 'founded-new': return arr.sort(byDesc((d) => d.founded));
    case 'rank': return arr.sort(byAsc((d) => d.dxb && d.dxb.rank));
    default: return arr;
  }
}

// —— URL query <-> state ——
// q = 搜索关键词（开发商名/中文名），客户端叠加过滤。
const ARR_KEYS = ['ownership', 'confidence', 'band', 'status'];
const EMPTY = { ownership: [], confidence: [], band: [], status: [], q: '' };
function stateToQuery(view, f, sort, defSort) {
  const q = new URLSearchParams();
  if (view !== 'board') q.set('view', view);
  if (f.q) q.set('q', f.q);
  for (const k of ARR_KEYS) if (f[k].length) q.set(k, f[k].join('~'));
  if (sort !== defSort) q.set('sort', sort);
  return q.toString();
}
function queryToState() {
  let view = 'board';
  const f = { ownership: [], confidence: [], band: [], status: [], q: '' };
  let sort = null;
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('view') === 'library') view = 'library';
    if (q.get('q')) f.q = q.get('q');
    for (const k of ARR_KEYS) { const v = q.get(k); if (v) f[k] = v.split('~').filter(Boolean); }
    if (q.get('sort')) sort = q.get('sort');
  } catch { /* SSR */ }
  return { view, f, sort };
}

// —— 通用下拉（抄 ProjectsClient）——
function Dropdown({ label, count, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="fdrop" ref={ref}>
      <button className={'fchip' + (count ? ' on' : '') + (open ? ' open' : '')} onClick={() => setOpen((o) => !o)}>
        {label}{count ? ` · ${count}` : ''} <span className="fchev">▾</span>
      </button>
      {open && <div className="fdrop-panel">{children}</div>}
    </div>
  );
}
function Opt({ on, onClick, children }) {
  return <button className={'fopt' + (on ? ' on' : '')} onClick={onClick}>{children}</button>;
}

// —— 评级榜「研究行」——
function ResearchRow({ d, rank, router }) {
  const dxb = d.dxb || {};
  const dfp5 = d.dfp5 || {};
  const slug = developerSlug(d);
  const sub = [OWN_LABEL[ownBucket(d.ownership)] !== '未标注' ? OWN_LABEL[ownBucket(d.ownership)] : null, d.founded ? `${d.founded} 年成立` : null]
    .filter(Boolean).join(' · ');
  const data = [
    ['转售', Number.isFinite(dxb.capitalGainPct) ? `${dxb.capitalGainPct > 0 ? '+' : ''}${round1(dxb.capitalGainPct)}%` : '—'],
    ['去化', Number.isFinite(dxb.absorptionPct) ? `${round1(dxb.absorptionPct)}%` : '—'],
    ['已交付', unitsShort(dxb.deliveredUnits)],
    ['在建', unitsShort(dxb.ucUnits)],
  ];
  const go = () => router.push(`/developers/${slug}`);
  return (
    <div className={'dev-row' + (rank <= 3 ? ' top3' : '')} onClick={go} role="link" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') go(); }}>
      <div className="dev-row-rank">#{rank}</div>
      {getDeveloperLogo(d) && <img className="dev-logo dev-logo-row" src={getDeveloperLogo(d)} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
      <div className="dev-row-main">
        <div className="dev-row-name">
          {d.cn && <span className="drn-cn">{d.cn}</span>}
          <span className="drn-en">{d.name}</span>
        </div>
        {sub && <div className="dev-row-sub">{sub}</div>}
      </div>
      <div className="dev-row-rating">
        <MapleRating dfp5={dfp5} variant="full" size={16} />
        <div className="dev-row-conf">置信 {dfp5.confidence || '—'} · 覆盖 {Number.isFinite(dfp5.coverage) ? dfp5.coverage : '—'}%</div>
      </div>
      <div className="dev-row-dims" aria-hidden="true">
        {DIM_KEYS.map(([k, ch]) => {
          const v = Number(dfp5.dims && dfp5.dims[k]);
          const pct = Number.isFinite(v) ? Math.max(4, Math.min(100, v)) : 0;
          return (
            <span className="dev-mbar" key={k} title={`${ch} ${Number.isFinite(v) ? round1(v) : '—'}`}>
              <i style={{ height: pct + '%' }} />
              <em>{ch}</em>
            </span>
          );
        })}
      </div>
      <div className="dev-row-data">
        {data.map(([kk, vv], i) => (
          <span className="dev-row-dp" key={i}><em>{kk}</em><b>{vv}</b></span>
        ))}
      </div>
      <div className="dev-row-tail">
        <div className="dev-row-asof">as-of {dxb.asOf || dfp5.ratedDate || '—'}</div>
        <a className="dev-row-ask" href={askDeveloperHref(d)} onClick={(e) => e.stopPropagation()}>AI 分析 →</a>
      </div>
    </div>
  );
}

export default function DevelopersClient() {
  const router = useRouter();
  const [view, setView] = useState('board');
  const [f, setF] = useState(EMPTY);
  const [sort, setSort] = useState('score');
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(40);
  const [mtdOpen, setMtdOpen] = useState(false);

  const defSort = view === 'board' ? 'score' : 'rank';

  useEffect(() => {
    const { view: qv, f: qf, sort: qs } = queryToState();
    setView(qv); setF(qf);
    setSort(qs || (qv === 'board' ? 'score' : 'rank'));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const qs = stateToQuery(view, f, sort, defSort);
    window.history.replaceState(null, '', qs ? `/developers?${qs}` : '/developers');
    setVisible(40);
  }, [view, f, sort, ready, defSort]);

  const toggle = (key, val) => setF((s) => {
    const cur = s[key];
    return { ...s, [key]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] };
  });
  const setQuery = (v) => setF((s) => ({ ...s, q: v }));
  const switchView = (v) => {
    setView(v);
    setSort(v === 'board' ? 'score' : 'rank');
    // 评级榜锁定 Rated：清掉状态筛选。
    if (v === 'board') setF((s) => ({ ...s, status: [] }));
  };
  const reset = () => { setF(EMPTY); setSort(defSort); };

  const filtered = useMemo(() => {
    // 评级榜（board）唯一口径 = 当前版本 Rated（isCurrentDfp5）——旧版残留
    // 分数（如 Diamond）不进入榜单排名，见 lib/catalog.js 头注。
    const base = view === 'board' ? DEVELOPERS.filter(isCurrentDfp5) : DEVELOPERS;
    return base.filter((d) => {
      // 搜索：开发商名 / 中文名，大小写不敏感 · 去空格 · 中英双语。
      if (f.q && !matchDeveloperQuery(d, f.q)) return false;
      // 评级状态（仅研究库视图有意义）。旧版残留仍算 status=Rated（非
      // NR），研究库列表用「评分更新中」中性态展示，不计入真 NR。
      if (view === 'library' && f.status.length) {
        const st = d.dfp5 && d.dfp5.status === 'Rated' ? 'rated' : 'nr';
        if (!f.status.includes(st)) return false;
      }
      // 所有制。
      if (f.ownership.length && !f.ownership.includes(ownBucket(d.ownership))) return false;
      // 置信度（仅对 Rated 有值；NR 无 → 选了置信度即排除 NR）。
      if (f.confidence.length) {
        const c = d.dfp5 && d.dfp5.confidence;
        if (!c || !f.confidence.includes(c)) return false;
      }
      // 分数段——仅当前版本分数参与匹配（旧版残留分数不可比，不参与筛选，
      // 避免用户按分数段筛出一个前端根本不展示分数的「评分更新中」行）。
      if (f.band.length) {
        const b = isCurrentDfp5(d) ? scoreBand(d.dfp5.score) : null;
        if (!b || !f.band.includes(b)) return false;
      }
      return true;
    });
  }, [view, f]);

  const sorted = useMemo(() => sortDevs(filtered, sort), [filtered, sort]);

  // 评级榜排名 = 当前版本 Rated 榜内固定排名（不随筛选变化，保持「榜」的语义）。
  const ratedRankMap = useMemo(() => {
    const m = new Map();
    DEVELOPERS
      .filter(isCurrentDfp5)
      .sort((a, b) => Number(b.dfp5.score) - Number(a.dfp5.score))
      .forEach((d, i) => m.set(d.name, i + 1));
    return m;
  }, []);

  const activeFacets = ARR_KEYS.reduce((n, k) => n + (f[k].length ? 1 : 0), 0) + (f.q ? 1 : 0);
  const total = sorted.length;
  const shown = view === 'board' ? sorted : sorted.slice(0, visible);

  return (
    <>
      <Nav />
      <main className="proj-page dev-list" id="top">
        {/* Hero */}
        <header className="pp-head dl-head">
          <div className="wrap">
            <span className="eyebrow">开发商研究库 · Developer Research</span>
            <h1>DFP-5 独立开发商评级</h1>
            <p className="pp-sub">
              丹枫的评级机构式研判：以 DLD 登记 + DXB Interact 交易口径为原始数据，从五维为开发商零基客观打分。
              每一分都可复算——这是丹枫区别于中介名录的核心资产。
            </p>
            <div className="pp-badges">
              <span className="data-badge">{DEVELOPER_COUNT} 家 · {RATED_DEVELOPER_COUNT} 家已评级</span>
              <span className="ts-badge">DFP-5 v3.1</span>
              <span className="ts-badge">来源 DLD · DXB Interact · 丹枫研究</span>
              <button className="dl-mtd-open" onClick={() => setMtdOpen(true)}>DFP-5 是什么 / 方法论 ▸</button>
            </div>
          </div>
        </header>

        {/* 视图切换 + 筛选条 */}
        <div className="pp-filterbar dl-bar">
          <div className="wrap">
            <div className="pp-search-row">
              <SearchBox value={f.q} onChange={setQuery} placeholder="搜索开发商…" />
            </div>
          </div>
          <div className="wrap pp-fb-in dl-fb-in">
            <div className="dl-seg">
              <button className={'dl-seg-btn' + (view === 'board' ? ' on' : '')} onClick={() => switchView('board')}>
                评级榜 · {RATED_DEVELOPER_COUNT}
              </button>
              <button className={'dl-seg-btn' + (view === 'library' ? ' on' : '')} onClick={() => switchView('library')}>
                研究库全部 · {DEVELOPER_COUNT}
              </button>
            </div>
            <div className="pp-chips dl-chips">
              <Dropdown label="所有制" count={f.ownership.length}>
                {OWN_OPTS.map(([k, l]) => <Opt key={k} on={f.ownership.includes(k)} onClick={() => toggle('ownership', k)}>{l}</Opt>)}
              </Dropdown>
              <Dropdown label="分数段" count={f.band.length}>
                {BAND_OPTS.map(([k, l]) => <Opt key={k} on={f.band.includes(k)} onClick={() => toggle('band', k)}>{l}</Opt>)}
              </Dropdown>
              <Dropdown label="置信度" count={f.confidence.length}>
                {CONF_OPTS.map(([k, l]) => <Opt key={k} on={f.confidence.includes(k)} onClick={() => toggle('confidence', k)}>{l}</Opt>)}
              </Dropdown>
              {view === 'library' && (
                <Dropdown label="评级状态" count={f.status.length}>
                  {STATUS_OPTS.map(([k, l]) => <Opt key={k} on={f.status.includes(k)} onClick={() => toggle('status', k)}>{l}</Opt>)}
                </Dropdown>
              )}
            </div>
            <div className="pp-fb-right">
              <div className="pp-sort">
                <label>排序</label>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORT_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <span className="pp-count">
                {activeFacets ? `命中 ${total}` : `共 ${total} 家`}
                {activeFacets > 0 && <button className="dl-reset" onClick={reset}>复位</button>}
              </span>
            </div>
          </div>
        </div>

        <div className="wrap dl-body">
          {view === 'board' ? (
            <>
              <p className="dl-tone">
                已评级 <b>{RATED_DEVELOPER_COUNT} 家</b>为达到数据覆盖门槛、可复算打分者，按 DFP-5 综合分排名。
                <button className="dl-inline-mtd" onClick={() => setMtdOpen(true)}>ⓘ 评级方法论</button>
              </p>
              <div className="dev-rows">
                {shown.map((d) => (
                  <ResearchRow key={d.name} d={d} rank={ratedRankMap.get(d.name) || 0} router={router} />
                ))}
              </div>
              {total === 0 && (
                <div className="pp-empty"><h3>当前条件下暂无匹配开发商</h3>
                  {f.q && <p>没有找到「{f.q}」相关结果。</p>}
                  <button className="btn btn-ghost" onClick={reset}>放宽筛选 / 复位</button></div>
              )}
            </>
          ) : (
            <>
              <p className="dl-tone">
                已评级 {RATED_DEVELOPER_COUNT} 家为达到数据覆盖门槛、可复算打分者；其余 {DEVELOPER_COUNT - RATED_DEVELOPER_COUNT} 家
                仍提供公开市场事实，<b>评级覆盖持续扩容中</b>。
                <span className="dl-nr-legend"><span className="dev-nr-chip">未评级 NR</span> = 尚未纳入 DFP-5 覆盖，多因公开数据不足，不代表负面评价。</span>
              </p>
              <div className="dl-table-wrap">
                <table className="dl-table">
                  <thead>
                    <tr>
                      <th className="dlt-name">开发商</th>
                      <th>评级</th>
                      <th>所有制</th>
                      <th>成立</th>
                      <th>DXB 排名</th>
                      <th>转售涨幅</th>
                      <th>去化</th>
                      <th>已交付</th>
                      <th>在建</th>
                      <th>近12月成交额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((d) => {
                      const dxb = d.dxb || {};
                      const current = isCurrentDfp5(d);
                      const stale = isStaleDfp5(d);
                      const slug = developerSlug(d);
                      return (
                        <tr key={d.name} className="dlt-row" onClick={() => router.push(`/developers/${slug}`)}>
                          <td className="dlt-name">
                            <span className="dlt-nameflex">
                              {getDeveloperLogo(d) && <img className="dev-logo dev-logo-xs" src={getDeveloperLogo(d)} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
                              <span className="dlt-nametext">
                                <span className="dlt-cn">{d.cn || d.name}</span>
                                {d.cn && <span className="dlt-en">{d.name}</span>}
                              </span>
                            </span>
                          </td>
                          <td>
                            {current
                              ? <MapleRating dfp5={d.dfp5} variant="mini" size={12} />
                              : stale
                                ? <span className="dev-nr-chip dev-stale-chip" title="该开发商已按新版模型排队重算，旧分数不再展示；不代表数据不足。">评分更新中</span>
                                : <span className="dev-nr-chip" title="NR = 尚未纳入 DFP-5 评级覆盖，多因公开数据不足；不代表负面评价。">未评级 NR</span>}
                          </td>
                          <td>{OWN_LABEL[ownBucket(d.ownership)]}</td>
                          <td className="lat">{d.founded || '—'}</td>
                          <td className="lat">{Number.isFinite(dxb.rank) ? `#${dxb.rank}` : '—'}</td>
                          <td className="lat">{Number.isFinite(dxb.capitalGainPct) ? `${dxb.capitalGainPct > 0 ? '+' : ''}${round1(dxb.capitalGainPct)}%` : '—'}</td>
                          <td className="lat">{Number.isFinite(dxb.absorptionPct) ? `${round1(dxb.absorptionPct)}%` : '—'}</td>
                          <td className="lat">{fmtInt(dxb.deliveredUnits)}</td>
                          <td className="lat">{fmtInt(dxb.ucUnits)}</td>
                          <td className="lat">{Number.isFinite(dxb.salesValueBn) ? `AED ${round1(dxb.salesValueBn)}B` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visible < total && (
                <div className="pp-more">
                  <button className="btn btn-ghost" onClick={() => setVisible((v) => v + 60)}>
                    加载更多（已显示 {shown.length} / {total}）
                  </button>
                </div>
              )}
              {total === 0 && (
                <div className="pp-empty"><h3>当前条件下暂无匹配开发商</h3>
                  {f.q && <p>没有找到「{f.q}」相关结果。</p>}
                  <button className="btn btn-ghost" onClick={reset}>放宽筛选 / 复位</button></div>
              )}
            </>
          )}

          <p className="note-line pp-note">
            ※ DFP-5 为丹枫内部研究评分，仅供研究参考，非信用违约评级，不构成投资建议，不担保任何回报。
            资本增值为历史市场数据（非预期收益）。数据来源：DLD 登记 · DXB Interact · 丹枫研究。
          </p>
        </div>
      </main>
      <Footer />
      <DevMethodologyModal open={mtdOpen} onClose={() => setMtdOpen(false)} />
    </>
  );
}
