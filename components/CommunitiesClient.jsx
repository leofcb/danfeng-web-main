'use client';

// ============================================================
// /communities 列表页（客户端筛选/排序/视图切换 · 设计规格 §1–§3）
// ------------------------------------------------------------
// 母版 = ProjectsClient + DevelopersClient：分段视图 + 一级 chips + 更多筛选
// 抽屉 + 排序 + URL query 保态。数据已在包内（201 社区），客户端过滤零 API。
//   · 默认视图 = 精选社区 120（display，画像+参考价双全 · 附录 B-1）；
//     第二分段「研究库 全部 201」（薄社区标注「画像完善中」）。
//   · 一级：区域方位(方位桶) / 生活方式(tags) / 有无在售项目 / ROI 区间。
//   · 排序：精选 / ROI 高→低 / 在售项目数 / 参考价 低→高（rankCommunities）。
//   · 参考价/ROI 一律护栏；空结果引导 AI。
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  COMMUNITIES, displayCommunities, COMMUNITY_COUNT, DISPLAY_COMMUNITY_COUNT,
  COMMUNITY_WITH_MARKET_COUNT, COMMUNITY_UPDATED, ADVISOR_COMM_HREF,
  rankCommunities, communityRoiRange, communityMinPrice, projectsByCommunity, matchCommunityQuery,
} from '@/lib/catalog';
import Nav from './Nav';
import Footer from './Footer';
import CommunityCard from './CommunityCard';
import SearchBox from './SearchBox';

// —— 区域方位（方位/调性桶，非 84 个行政片区 · §3.2）——
const ZONE_OPTS = [['central', '中心城区'], ['coast', '滨海·滨水'], ['suburb', '新城·近郊'], ['golf', '高尔夫社区']];
function zonesOf(c) {
  const t = new Set((c.profile && c.profile.tags) || []);
  const z = [];
  if (t.has('Waterfront') || t.has('Beachfront')) z.push('coast');
  if (t.has('Golf Course')) z.push('golf');
  if (t.has('Business') || t.has('Metro Station') || t.has('Tourism')) z.push('central');
  if ((t.has('Gated Community') || t.has('Family Friendly') || t.has('New')) && !z.includes('central') && !z.includes('coast')) z.push('suburb');
  return z;
}

// —— 生活方式（高频 6，对华人投资者有意义 · §3.2）——
const LIFE_OPTS = [
  ['Family Friendly', '家庭友好'], ['Luxury', '豪宅'], ['Affordable', '高性价比'],
  ['Waterfront', '滨水'], ['Metro Station', '近地铁'], ['Pet Friendly', '宠物友好'],
];
// —— ROI 区间桶（中位落档 · §3.2）——
const ROI_OPTS = [['high', '≥7%'], ['mid', '5–7%'], ['low', '<5%']];
function roiBucket(c) {
  const r = communityRoiRange(c);
  if (!r) return null;
  const m = (r.lo + r.hi) / 2;
  if (m >= 7) return 'high';
  if (m >= 5) return 'mid';
  return 'low';
}
const SORT_OPTS = [['featured', '精选'], ['roi-desc', '租金回报 高→低'], ['proj-desc', '在售项目 多→少'], ['price-asc', '参考价 低→高']];

// —— 抽屉：完整 tags 全集 + 分类 + 有价/有画像 ——
const ALL_TAGS = ['Family Friendly', 'Gated Community', 'Parks', 'Luxury', 'Affordable', 'Expats', 'Waterfront', 'Popular', 'Business', 'Metro Station', 'Tourism', 'Pet Friendly', 'Beachfront', 'Golf Course', 'New', 'Racecourse'];
const CLS_OPTS = [['master_project', 'master project'], ['dld_area', 'dld area']];
const EXTRA_OPTS = [['hasprice', '有参考价'], ['hasprofile', '有画像']];

// q = 搜索关键词（社区名/中文名/别名/各平台名），客户端叠加过滤。
const EMPTY = { zone: [], life: [], hasproj: [], roi: [], tags: [], cls: [], extra: [], q: '' };
const ARR_KEYS = ['zone', 'life', 'hasproj', 'roi', 'tags', 'cls', 'extra'];

function stateToQuery(view, f, sort) {
  const q = new URLSearchParams();
  if (view !== 'display') q.set('view', view);
  if (f.q) q.set('q', f.q);
  for (const k of ARR_KEYS) if (f[k].length) q.set(k, f[k].join('~'));
  if (sort !== 'featured') q.set('sort', sort);
  return q.toString();
}
function queryToState() {
  let view = 'display';
  const f = { zone: [], life: [], hasproj: [], roi: [], tags: [], cls: [], extra: [], q: '' };
  let sort = 'featured';
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('view') === 'all') view = 'all';
    if (q.get('q')) f.q = q.get('q');
    for (const k of ARR_KEYS) { const v = q.get(k); if (v) f[k] = v.split('~').filter(Boolean); }
    if (q.get('sort')) sort = q.get('sort');
  } catch { /* SSR */ }
  return { view, f, sort };
}

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

export default function CommunitiesClient() {
  const [view, setView] = useState('display');
  const [f, setF] = useState(EMPTY);
  const [sort, setSort] = useState('featured');
  const [drawer, setDrawer] = useState(false);
  const [visible, setVisible] = useState(24);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { view: qv, f: qf, sort: qs } = queryToState();
    setView(qv); setF(qf); setSort(qs); setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const qs = stateToQuery(view, f, sort);
    window.history.replaceState(null, '', qs ? `/communities?${qs}` : '/communities');
    setVisible(24);
  }, [view, f, sort, ready]);

  const toggle = (key, val) => setF((s) => {
    const cur = s[key];
    return { ...s, [key]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] };
  });
  const setQuery = (v) => setF((s) => ({ ...s, q: v }));
  const reset = () => { setF(EMPTY); setSort('featured'); };

  const base = view === 'display' ? displayCommunities() : COMMUNITIES;
  const denom = view === 'display' ? DISPLAY_COMMUNITY_COUNT : COMMUNITY_COUNT;

  const filtered = useMemo(() => {
    return base.filter((c) => {
      // 搜索：社区名 / 中文名 / 别名 / 各平台名，大小写不敏感 · 去空格 · 中英双语。
      if (f.q && !matchCommunityQuery(c, f.q)) return false;
      if (f.zone.length) { const z = zonesOf(c); if (!f.zone.some((x) => z.includes(x))) return false; }
      if (f.life.length) { const t = (c.profile && c.profile.tags) || []; if (!f.life.some((x) => t.includes(x))) return false; }
      if (f.hasproj.includes('yes') && projectsByCommunity(c).length === 0) return false;
      if (f.roi.length) { const b = roiBucket(c); if (!b || !f.roi.includes(b)) return false; }
      if (f.tags.length) { const t = (c.profile && c.profile.tags) || []; if (!f.tags.every((x) => t.includes(x))) return false; }
      if (f.cls.length && !f.cls.includes(c.classification)) return false;
      if (f.extra.includes('hasprice') && !communityMinPrice(c)) return false;
      if (f.extra.includes('hasprofile') && !(c.profile && c.profile.blurbCn)) return false;
      return true;
    });
  }, [base, f]);

  const ranked = useMemo(() => rankCommunities(filtered, sort), [filtered, sort]);
  const activeFacets = ARR_KEYS.reduce((n, k) => n + (f[k].length ? 1 : 0), 0) + (f.q ? 1 : 0);
  const drawerCount = f.tags.length + f.cls.length + f.extra.length;
  const total = ranked.length;
  const shown = ranked.slice(0, visible);

  // 已选筛选回显。
  const labelOf = (opts, v) => (opts.find((o) => o[0] === v) || [])[1] || v;
  const chips = [];
  if (f.q) chips.push(['q', f.q, '搜索·' + f.q]);
  f.zone.forEach((v) => chips.push(['zone', v, labelOf(ZONE_OPTS, v)]));
  f.life.forEach((v) => chips.push(['life', v, labelOf(LIFE_OPTS, v)]));
  f.hasproj.forEach((v) => chips.push(['hasproj', v, '有在售项目']));
  f.roi.forEach((v) => chips.push(['roi', v, 'ROI ' + labelOf(ROI_OPTS, v)]));
  f.tags.forEach((v) => chips.push(['tags', v, v]));
  f.cls.forEach((v) => chips.push(['cls', v, labelOf(CLS_OPTS, v)]));
  f.extra.forEach((v) => chips.push(['extra', v, labelOf(EXTRA_OPTS, v)]));

  return (
    <>
      <Nav />
      <main className="proj-page comm-list" id="top">
        <header className="pp-head">
          <div className="wrap">
            <span className="eyebrow">社区研究库 · Communities</span>
            <h1>迪拜社区研究库 · 片区画像与租金回报参考</h1>
            <p className="pp-sub">
              在片区层面判断「值不值得买、适合谁、回报多少」。列表是片区研究索引，AI 是你的片区分析师——每张卡都能一键转成一次「这个片区适不适合你」的带数据分析。
            </p>
            <div className="pp-badges">
              <span className="data-badge">{COMMUNITY_COUNT} 社区</span>
              <span className="ts-badge">{DISPLAY_COMMUNITY_COUNT} 精选画像</span>
              <span className="ts-badge">{COMMUNITY_WITH_MARKET_COUNT} 含参考价</span>
              <span className="src-note">来源 Bayut · PF · DXB Interact · 丹枫研究</span>
              <span className="ts-badge">更新 {COMMUNITY_UPDATED}</span>
            </div>
          </div>
        </header>

        <div className="pp-filterbar dl-bar">
          <div className="wrap">
            <div className="pp-search-row">
              <SearchBox value={f.q} onChange={setQuery} placeholder="搜索社区…" />
            </div>
          </div>
          <div className="wrap pp-fb-in dl-fb-in">
            <div className="dl-seg">
              <button className={'dl-seg-btn' + (view === 'display' ? ' on' : '')} onClick={() => setView('display')}>
                精选社区 · {DISPLAY_COMMUNITY_COUNT}
              </button>
              <button className={'dl-seg-btn' + (view === 'all' ? ' on' : '')} onClick={() => setView('all')}>
                研究库全部 · {COMMUNITY_COUNT}
              </button>
            </div>
            <div className="pp-chips dl-chips">
              <Dropdown label="区域方位" count={f.zone.length}>
                {ZONE_OPTS.map(([k, l]) => <Opt key={k} on={f.zone.includes(k)} onClick={() => toggle('zone', k)}>{l}</Opt>)}
              </Dropdown>
              <Dropdown label="生活方式" count={f.life.length}>
                {LIFE_OPTS.map(([k, l]) => <Opt key={k} on={f.life.includes(k)} onClick={() => toggle('life', k)}>{l}</Opt>)}
              </Dropdown>
              <Dropdown label="在售项目" count={f.hasproj.length}>
                <Opt on={f.hasproj.includes('yes')} onClick={() => toggle('hasproj', 'yes')}>有在售项目</Opt>
              </Dropdown>
              <Dropdown label="ROI 区间" count={f.roi.length}>
                {ROI_OPTS.map(([k, l]) => <Opt key={k} on={f.roi.includes(k)} onClick={() => toggle('roi', k)}>{l}</Opt>)}
              </Dropdown>
              <button className={'fchip more' + (drawerCount ? ' on' : '')} onClick={() => setDrawer(true)}>
                更多筛选{drawerCount ? ` · ${drawerCount}` : ''} ▾
              </button>
            </div>
            <div className="pp-fb-right">
              <div className="pp-sort">
                <label>排序</label>
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORT_OPTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <span className="pp-count">
                {activeFacets ? `命中 ${total} / ${denom}` : `共 ${total} 个社区`} · 数据截至 {COMMUNITY_UPDATED}
              </span>
            </div>
          </div>
        </div>

        <div className="wrap">
          <a className="pp-advisor" href={ADVISOR_COMM_HREF}>
            <b>{COMMUNITY_COUNT} 个片区挑花眼？</b> 直接说预算、自住还是投资、看重什么，AI 按你的画像推片区 →
          </a>

          {chips.length > 0 && (
            <div className="pp-recap">
              {chips.map(([key, val, label]) => (
                <button key={key + val} className="pp-recap-chip" onClick={() => (key === 'q' ? setQuery('') : toggle(key, val))}>{label} ×</button>
              ))}
              <button className="pp-recap-clear" onClick={reset}>清除全部</button>
            </div>
          )}

          {total > 0 ? (
            <>
              <div className="comm-grid cc-grid">
                {shown.map((c) => <CommunityCard key={c.communityId} c={c} />)}
              </div>
              {visible < total && (
                <div className="pp-more">
                  <button className="btn btn-ghost" onClick={() => setVisible((v) => v + 24)}>
                    加载更多（已显示 {shown.length} / {total}）
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="pp-empty">
              <h3>当前条件下暂无匹配社区</h3>
              {f.q && <p>没有找到「{f.q}」相关结果。</p>}
              <p>条件可能太窄——直接说说你的预算、自住还是投资、看重什么，让 AI 从 {COMMUNITY_COUNT} 个片区里帮你推。</p>
              <div className="pp-empty-cta">
                <a className="btn btn-red" href={ADVISOR_COMM_HREF}>让 AI 推片区 →</a>
                <button className="btn btn-ghost" onClick={reset}>放宽筛选 / 重置</button>
              </div>
            </div>
          )}

          <p className="note-line pp-note">
            ※ 本页社区参考价与租金回报为公开行情参考（来源 Bayut · PF · DXB Interact），非丹枫报价、非收益承诺；
            具体房源、实时价格与房态由丹枫持牌顾问及开发商正式文件确认。数据更新 {COMMUNITY_UPDATED}。
          </p>
        </div>

        {drawer && (
          <div className="pp-drawer-mask" onClick={() => setDrawer(false)}>
            <aside className="pp-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="pp-drawer-head">
                <span>更多筛选</span>
                <button className="pp-drawer-x" onClick={() => setDrawer(false)}>✕</button>
              </div>
              <div className="pp-drawer-body">
                <div className="pp-fgroup">
                  <h4>生活方式标签<em>（全集 16）</em></h4>
                  <div className="pp-opts pp-opts-wrap">{ALL_TAGS.map((t) => <Opt key={t} on={f.tags.includes(t)} onClick={() => toggle('tags', t)}>{t}</Opt>)}</div>
                </div>
                <div className="pp-fgroup">
                  <h4>社区分类</h4>
                  <div className="pp-opts">{CLS_OPTS.map(([k, l]) => <Opt key={k} on={f.cls.includes(k)} onClick={() => toggle('cls', k)}>{l}</Opt>)}</div>
                </div>
                <div className="pp-fgroup">
                  <h4>资料完整度</h4>
                  <div className="pp-opts">{EXTRA_OPTS.map(([k, l]) => <Opt key={k} on={f.extra.includes(k)} onClick={() => toggle('extra', k)}>{l}</Opt>)}</div>
                </div>
              </div>
              <div className="pp-drawer-foot">
                <button className="btn btn-ghost" onClick={reset}>重置</button>
                <button className="btn btn-red" onClick={() => setDrawer(false)}>查看 {total} 个结果</button>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
