'use client';

// ============================================================
// /projects 列表页（客户端过滤 · 设计规格 §1–§3 / §8）
// ------------------------------------------------------------
// 数据已在包内（719 项目），客户端过滤即可，零 API。
//   · 一级筛选 chips：城市 / 类型 / 预算 / 交付 / 黄金签证（+ 更多筛选抽屉）
//   · 抽屉：社区 / 开发商 / 户型 / 状态(含售罄开关) / 付款 / 景观
//   · 默认排序 featuredScore（rankProjects），可切换
//   · 默认范围 = DEFAULT_SCOPE（迪拜 + 在售/即将；售罄/非迪拜靠显式筛选纳入）
//   · 筛选态写入 URL query（返回/分享/微信内保态），canonical 指 /projects
//   · 起价一律护栏；空结果引导 AI
// 两处「首席官可翻案」常量在 lib/catalog.js（DEFAULT_SCOPE / SUBFENG_LINK_MODE）。
// ============================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  PROJECTS, PROJECT_COUNT, CATALOG_UPDATED, DEFAULT_SCOPE, ADVISOR_HREF,
  EMIRATES, rankProjects, normType, gvBucket, handoverBucket, priceBand, getDeveloper, getCommunity,
  getCommunityById, isCurrentDfp5, matchProjectQuery,
} from '@/lib/catalog';
import Nav from './Nav';
import Footer from './Footer';
import ProjectCard from './ProjectCard';
import SearchBox from './SearchBox';

// —— 筛选选项（一级）——
const CITY_OPTS = [['dubai', '迪拜'], ['abudhabi', '阿布扎比'], ['sharjah', '沙迦'], ['rak', '哈伊马角'], ['uaq', '乌姆盖万']];
const TYPE_OPTS = ['公寓', '别墅', '联排', '写字楼', '酒店公寓'];
const BUDGET_OPTS = [['b1', '200万以下'], ['b2', '200–300万'], ['b3', '300–500万'], ['b4', '500–1000万'], ['b5', '1000–3000万'], ['b6', '3000万+']];
const HANDOVER_OPTS = [['near', '准现房(≤1年)'], ['mid', '1–3年'], ['far', '3年+'], ['delivered', '已交付'], ['tbd', '待定']];
const GV_OPTS = [['fit', '适配'], ['below', '门槛以下'], ['pending', '待核']];
// —— 抽屉选项 ——
const STATUS_OPTS = [['av', '在售'], ['cs', '即将开盘'], ['so', '已售罄']];
const BED_OPTS = ['工作室', '1居', '2居', '3居', '4居', '5居+'];
const PAY_OPTS = [['low', '低首付'], ['post', '交付后付款']];
const PREF_OPTS = ['临海水岸', '高尔夫景观', '市中心', '公园绿景', '家庭社区', '品牌豪宅'];
const SORT_OPTS = [['featured', '精选'], ['handover', '最新交付'], ['price-asc', '起价 低→高'], ['price-desc', '起价 高→低']];

const PREF_KW = {
  '临海水岸': /海|水岸|beach|marina|lagoon|滨|湾|临水|creek|harbour|island/i,
  '高尔夫景观': /高尔夫|golf|polo/i,
  '市中心': /downtown|市中心|中心|business\s*bay|商务湾/i,
  '公园绿景': /公园|park|绿|green|valley|oasis/i,
  '家庭社区': /家庭|family|villa|别墅|联排|townhouse|school|学校|ranches/i,
  '品牌豪宅': /品牌|armani|bugatti|mercedes|cavalli|豪宅|branded|luxe|奢|residences/i,
};
const bedMatch = (info, b) => {
  const s = String(info || '');
  if (b === '工作室') return /工作室|studio/i.test(s);
  if (b === '5居+') return /[5-9]\s*居|[5-9]\s*BR/i.test(s);
  return new RegExp(b.replace('居', '') + '\\s*居').test(s);
};
const prefText = (p) => [p.tags, p.amenities, p.blurb, p.area, p.types, p.location].filter(Boolean).join(' ');

// 空筛选态。（commId = 社区详情「查看全部」带入的 communityId 过滤 · §7.3；
// q = 搜索关键词，客户端叠加过滤，见设计规格「列表页搜索」）
const EMPTY = { city: '', commId: '', q: '', types: [], budget: [], handover: [], gv: [], comm: [], dev: [], beds: [], status: [], payment: [], prefs: [] };

// —— URL query <-> state ——
const ARR_KEYS = ['types', 'budget', 'handover', 'gv', 'comm', 'dev', 'beds', 'status', 'payment', 'prefs'];
function stateToQuery(f, sort) {
  const q = new URLSearchParams();
  if (f.city) q.set('city', f.city);
  if (f.commId) q.set('commId', f.commId);
  if (f.q) q.set('q', f.q);
  for (const k of ARR_KEYS) if (f[k].length) q.set(k, f[k].join('~'));
  if (sort !== 'featured') q.set('sort', sort);
  return q.toString();
}
function queryToState() {
  const f = { ...EMPTY, types: [], budget: [], handover: [], gv: [], comm: [], dev: [], beds: [], status: [], payment: [], prefs: [] };
  let sort = 'featured';
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get('city')) f.city = q.get('city');
    if (q.get('commId')) f.commId = q.get('commId');
    if (q.get('q')) f.q = q.get('q');
    for (const k of ARR_KEYS) { const v = q.get(k); if (v) f[k] = v.split('~').filter(Boolean); }
    if (q.get('sort')) sort = q.get('sort');
  } catch { /* SSR / 无 window */ }
  return { f, sort };
}

// —— 通用下拉筛选按钮 ——
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

export default function ProjectsClient() {
  const [f, setF] = useState(EMPTY);
  const [sort, setSort] = useState('featured');
  const [drawer, setDrawer] = useState(false);
  const [visible, setVisible] = useState(24);
  const [ready, setReady] = useState(false);

  // 挂载后从 URL 读态（避免 SSR 水合不匹配）。
  useEffect(() => {
    const { f: qf, sort: qs } = queryToState();
    setF(qf); setSort(qs); setReady(true);
  }, []);

  // 态变化写回 URL（replaceState，不新增历史项）。
  useEffect(() => {
    if (!ready) return;
    const qs = stateToQuery(f, sort);
    const url = qs ? `/projects?${qs}` : '/projects';
    window.history.replaceState(null, '', url);
    setVisible(24);
  }, [f, sort, ready]);

  // 筛选面板选项来源：catalog 内 distinct 社区 / 开发商（按出现次数降序）。
  const { commOpts, devOpts } = useMemo(() => {
    const cc = {}, dc = {};
    for (const p of PROJECTS) { cc[p.area] = (cc[p.area] || 0) + 1; dc[p.developer] = (dc[p.developer] || 0) + 1; }
    const commOpts = Object.keys(cc).sort((a, b) => cc[b] - cc[a]);
    const devOpts = Object.keys(dc).sort((a, b) => dc[b] - dc[a]);
    return { commOpts, devOpts };
  }, []);

  const toggle = (key, val) => setF((s) => {
    const cur = s[key];
    return { ...s, [key]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] };
  });
  const setCity = (val) => setF((s) => ({ ...s, city: s.city === val ? '' : val }));
  const setQuery = (v) => setF((s) => ({ ...s, q: v }));
  const reset = () => { setF(EMPTY); setSort('featured'); };

  // —— 过滤管线（搜索先过滤，再叠加既有筛选）——
  const filtered = useMemo(() => {
    const statusChosen = f.status.length > 0;
    const cityChosen = !!f.city;
    return PROJECTS.filter((p) => {
      // 搜索：项目名 / 中文名 / 社区 / 开发商，大小写不敏感 · 去空格 · 中英双语。
      if (f.q && !matchProjectQuery(p, f.q)) return false;
      // 社区 commId 过滤（§7.3，以 communityId 为锚，合并多 area 变体）。
      if (f.commId) { const cc = getCommunity(p.area); if (!cc || cc.communityId !== f.commId) return false; }
      // 城市：显式选择优先；否则默认范围（onlyDubai）。
      if (cityChosen) { if (p.emirate !== f.city) return false; }
      else if (DEFAULT_SCOPE.onlyDubai && p.emirate !== 'dubai') return false;
      // 状态：显式选择优先；否则默认范围（排除售罄）。
      if (statusChosen) {
        const st = /available/i.test(p.status || '') ? 'av' : /coming/i.test(p.status || '') ? 'cs' : /sold/i.test(p.status || '') ? 'so' : '';
        if (!f.status.includes(st)) return false;
      } else if (!DEFAULT_SCOPE.includeSoldOut && /sold/i.test(p.status || '')) return false;
      // 类型（包含匹配，组合项可命中多桶）。
      if (f.types.length) { const buckets = normType(p.types); if (!f.types.some((t) => buckets.includes(t))) return false; }
      // 预算档（无价仅在不限时出现）。
      if (f.budget.length) { const b = priceBand(p.priceAED); if (!b || !f.budget.includes(b)) return false; }
      // 交付档。
      if (f.handover.length) { if (!f.handover.includes(handoverBucket(p))) return false; }
      // 黄金签证。
      if (f.gv.length) { if (!f.gv.includes(gvBucket(p.gv))) return false; }
      // 社区 / 开发商（抽屉）。
      if (f.comm.length && !f.comm.includes(p.area)) return false;
      if (f.dev.length && !f.dev.includes(p.developer)) return false;
      // 户型。
      if (f.beds.length && !f.beds.some((b) => bedMatch(p.unitInfo, b))) return false;
      // 付款偏好（软提示；字段缺失则不命中）。
      if (f.payment.length) {
        const pay = String(p.payment || '');
        const ok = f.payment.some((k) => (k === 'low' ? /首付|10%|低首付|down\s*payment/i.test(pay) : /交付后|post|handover|移交后/i.test(pay)));
        if (!ok) return false;
      }
      // 地段/景观（OR 命中）。
      if (f.prefs.length) { const txt = prefText(p); if (!f.prefs.some((k) => PREF_KW[k] && PREF_KW[k].test(txt))) return false; }
      return true;
    });
  }, [f]);

  const ranked = useMemo(() => rankProjects(filtered, sort), [filtered, sort]);

  const activeFacets = (f.city ? 1 : 0) + (f.commId ? 1 : 0) + ARR_KEYS.reduce((n, k) => n + (f[k].length ? 1 : 0), 0);
  const drawerCount = f.comm.length + f.dev.length + f.beds.length + f.status.length + f.payment.length + f.prefs.length;
  const total = ranked.length;
  const shown = ranked.slice(0, visible);

  // 已选筛选回显（可删除 chip）。
  const chips = [];
  if (f.commId) { const cc = getCommunityById(f.commId); chips.push(['commId', f.commId, '社区·' + (cc ? cc.name : f.commId)]); }
  if (f.q) chips.push(['q', f.q, '搜索·' + f.q]);
  if (f.city) chips.push(['city', f.city, CITY_OPTS.find((o) => o[0] === f.city)?.[1] || f.city]);
  f.types.forEach((v) => chips.push(['types', v, v]));
  f.budget.forEach((v) => chips.push(['budget', v, BUDGET_OPTS.find((o) => o[0] === v)?.[1] || v]));
  f.handover.forEach((v) => chips.push(['handover', v, HANDOVER_OPTS.find((o) => o[0] === v)?.[1] || v]));
  f.gv.forEach((v) => chips.push(['gv', v, 'GV·' + (GV_OPTS.find((o) => o[0] === v)?.[1] || v)]));
  f.status.forEach((v) => chips.push(['status', v, STATUS_OPTS.find((o) => o[0] === v)?.[1] || v]));
  f.comm.forEach((v) => chips.push(['comm', v, v]));
  f.dev.forEach((v) => chips.push(['dev', v, v]));
  f.beds.forEach((v) => chips.push(['beds', v, v]));
  f.payment.forEach((v) => chips.push(['payment', v, PAY_OPTS.find((o) => o[0] === v)?.[1] || v]));
  f.prefs.forEach((v) => chips.push(['prefs', v, v]));
  const removeChip = (key, val) => {
    if (key === 'city') setCity(val);
    else if (key === 'commId') setF((s) => ({ ...s, commId: '' }));
    else if (key === 'q') setQuery('');
    else toggle(key, val);
  };

  const applyQuickStart = () => setF({ ...EMPTY, city: 'dubai', budget: ['b2'], gv: ['fit'] });

  return (
    <>
      <Nav />
      <main className="proj-page" id="top">
        {/* 页头带 */}
        <header className="pp-head">
          <div className="wrap">
            <span className="eyebrow">精选项目 · Off-Plan Projects</span>
            <h1>精选项目 · Off-Plan Projects</h1>
            <p className="pp-sub">覆盖迪拜为主的 {PROJECT_COUNT} 个期房项目 · 研究驱动 · 非中介挂盘。每个项目都能一键交给 AI 做深度分析。</p>
            <div className="pp-badges">
              <span className="data-badge">{PROJECT_COUNT} 项目</span>
              <span className="ts-badge">DLD · DXB Interact · 丹枫研究</span>
              <span className="ts-badge">更新 {CATALOG_UPDATED}</span>
            </div>
          </div>
        </header>

        {/* 筛选条（sticky） */}
        <div className="pp-filterbar">
          <div className="wrap">
            <div className="pp-search-row">
              <SearchBox value={f.q} onChange={setQuery} placeholder="搜索项目 / 社区 / 开发商…" />
            </div>
          </div>
          <div className="wrap pp-fb-in">
            <div className="pp-chips">
              <Dropdown label="城市" count={f.city ? 1 : 0}>
                {CITY_OPTS.map(([k, l]) => <Opt key={k} on={f.city === k} onClick={() => setCity(k)}>{l}</Opt>)}
              </Dropdown>
              <Dropdown label="物业类型" count={f.types.length}>
                {TYPE_OPTS.map((t) => <Opt key={t} on={f.types.includes(t)} onClick={() => toggle('types', t)}>{t}</Opt>)}
              </Dropdown>
              <Dropdown label="预算档" count={f.budget.length}>
                {BUDGET_OPTS.map(([k, l]) => <Opt key={k} on={f.budget.includes(k)} onClick={() => toggle('budget', k)}>{l}</Opt>)}
              </Dropdown>
              <Dropdown label="交付" count={f.handover.length}>
                {HANDOVER_OPTS.map(([k, l]) => <Opt key={k} on={f.handover.includes(k)} onClick={() => toggle('handover', k)}>{l}</Opt>)}
              </Dropdown>
              <Dropdown label="黄金签证" count={f.gv.length}>
                {GV_OPTS.map(([k, l]) => <Opt key={k} on={f.gv.includes(k)} onClick={() => toggle('gv', k)}>{l}</Opt>)}
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
                {(activeFacets || f.q) ? `命中 ${total} / ${PROJECT_COUNT}` : `共 ${total} 个`} · 数据截至 {CATALOG_UPDATED}
              </span>
            </div>
          </div>
        </div>

        {/* AI 引导条 */}
        <div className="wrap">
          <a className="pp-advisor" href={ADVISOR_HREF}>
            <b>不确定怎么选？</b> 119 个社区、31 家开发商挑花眼——直接说预算和目的，让 AI 按你的画像筛 →
          </a>

          {/* 已选筛选回显 */}
          {chips.length > 0 && (
            <div className="pp-recap">
              {chips.map(([key, val, label]) => (
                <button key={key + val} className="pp-recap-chip" onClick={() => removeChip(key, val)}>{label} ×</button>
              ))}
              <button className="pp-recap-clear" onClick={reset}>清除全部</button>
            </div>
          )}

          {/* 结果网格 */}
          {total > 0 ? (
            <>
              <div className="pcard-grid pp-grid">
                {shown.map((p) => <ProjectCard key={p.name} p={p} />)}
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
              <h3>当前条件下暂无匹配项目</h3>
              {f.q && <p>没有找到「{f.q}」相关结果。</p>}
              <p>条件可能太窄——换个思路，直接说说你的预算和目的，让 AI 从 {PROJECT_COUNT} 个项目里帮你筛。</p>
              <div className="pp-empty-cta">
                <a className="btn btn-red" href={ADVISOR_HREF}>让 AI 帮您筛 →</a>
                <button className="btn btn-ghost" onClick={reset}>放宽筛选 / 重置</button>
              </div>
              <div className="pp-empty-quick">
                <span>热门起点：</span>
                <button onClick={applyQuickStart}>迪拜 · 200–300万 · 黄金签证适配</button>
              </div>
            </div>
          )}

          <p className="note-line pp-note">
            ※ 本页起价为开盘起价示意（非实时报价），交付时间以开发商正式文件为准；具体户型、实时价格与可售房态由丹枫持牌顾问确认。
            数据来源：DLD · DXB Interact · 丹枫研究，更新 {CATALOG_UPDATED}。
          </p>
        </div>

        {/* 更多筛选抽屉 */}
        {drawer && (
          <div className="pp-drawer-mask" onClick={() => setDrawer(false)}>
            <aside className="pp-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="pp-drawer-head">
                <span>更多筛选</span>
                <button className="pp-drawer-x" onClick={() => setDrawer(false)}>✕</button>
              </div>
              <div className="pp-drawer-body">
                <div className="pp-fgroup">
                  <h4>在售状态<em>（含售罄开关）</em></h4>
                  <div className="pp-opts">{STATUS_OPTS.map(([k, l]) => <Opt key={k} on={f.status.includes(k)} onClick={() => toggle('status', k)}>{l}</Opt>)}</div>
                </div>
                <div className="pp-fgroup">
                  <h4>户型 / 卧室</h4>
                  <div className="pp-opts">{BED_OPTS.map((b) => <Opt key={b} on={f.beds.includes(b)} onClick={() => toggle('beds', b)}>{b}</Opt>)}</div>
                </div>
                <div className="pp-fgroup">
                  <h4>付款偏好<em>（示意，以顾问为准）</em></h4>
                  <div className="pp-opts">{PAY_OPTS.map(([k, l]) => <Opt key={k} on={f.payment.includes(k)} onClick={() => toggle('payment', k)}>{l}</Opt>)}</div>
                </div>
                <div className="pp-fgroup">
                  <h4>地段 / 景观偏好</h4>
                  <div className="pp-opts">{PREF_OPTS.map((p) => <Opt key={p} on={f.prefs.includes(p)} onClick={() => toggle('prefs', p)}>{p}</Opt>)}</div>
                </div>
                <div className="pp-fgroup">
                  <h4>开发商<em>（{devOpts.length} 家 · 🍁=DFP-5 评级）</em></h4>
                  <div className="pp-opts pp-opts-wrap">
                    {devOpts.map((d) => {
                      const dev = getDeveloper(d);
                      const rated = isCurrentDfp5(dev); // 旧版残留分数不展示（前端只认当前版本分数）
                      return <Opt key={d} on={f.dev.includes(d)} onClick={() => toggle('dev', d)}>{rated ? '🍁 ' : ''}{d}</Opt>;
                    })}
                  </div>
                </div>
                <div className="pp-fgroup">
                  <h4>社区<em>（{commOpts.length} 个 · ★=热门）</em></h4>
                  <div className="pp-opts pp-opts-wrap">
                    {commOpts.map((a) => {
                      const c = getCommunity(a);
                      return <Opt key={a} on={f.comm.includes(a)} onClick={() => toggle('comm', a)}>{c && c.isHot ? '★ ' : ''}{a}</Opt>;
                    })}
                  </div>
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
