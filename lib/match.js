// ============================================================
// 多因子智能匹配引擎 v3（本地、确定性、可解释）
// ------------------------------------------------------------
// 硬过滤（排除 Sold；城市/区域/物业类型偏好，可松弛）
//   → 多维加权打分（预算贴合/黄金签证/片区增值为主，其余维度加权微调）
//   → 分数拉开 + 跨社区去重（MMR）→ 项目专属理由。
// 价格护栏：只用开盘起价（priceAED/startHint），绝不涉及均价/单价/去化率等市场字段。
// 选项与字段定义集中在 lib/options.js，前后端共用。
//
// 开发商实力维（developerStrength）：由 lib/catalog.getDeveloper() 提供的
// **品牌级**维表（tier / DXB 去化率 / 资本增值率 / 交付规模）合成，仅用于
// 「开发商」层面加权与背书理由——不引入任何项目级价格/PSF/去化字段。
// 无维表数据的开发商给中性分（0.6），不惩罚数据缺失。
// ============================================================
import { getDeveloper } from './catalog';

// 距今多少年（以实际完工日期 vs 今天动态计算，精确到天）。
// 负数=已交付/已过完工日期；null=无完工日期。
function yearsUntil(p) {
  const d = p.handoverDate || (/^\d{4}/.test(p.handover || '') ? p.handover.slice(0, 4) + '-12-31' : null);
  if (!d) return null;
  const t = Date.parse(d);
  if (!Number.isFinite(t)) return null;
  return (t - Date.now()) / (365.25 * 24 * 3600 * 1000);
}

// —— 社区分层（增值潜力 / 流动性 / 自住属性）——
const TIER_S = ['Downtown Dubai', 'Dubai Creek Harbour', 'Emaar Beachfront', 'Dubai Marina', 'Rashid Yachts & Marina', 'Business Bay', 'Zabeel', 'Address Al Marjan Island'];
const TIER_A = ['Dubai Hills Estate', 'Arabian Ranches III', 'Grand Polo Club and Resort', 'The Oasis', 'The Heights Country Club and Wellness'];
const FAMILY = ['Dubai Hills Estate', 'Arabian Ranches III', 'The Valley', 'Emaar South', 'The Oasis', 'Grand Polo Club and Resort', 'The Heights Country Club and Wellness'];
const GOLF = ['Dubai Hills Estate', 'Emaar South', 'Grand Polo Club and Resort', 'The Heights Country Club and Wellness'];
const WATER = ['Dubai Creek Harbour', 'Emaar Beachfront', 'Dubai Marina', 'Rashid Yachts & Marina', 'Address Al Marjan Island'];
const CITY_CORE = ['Downtown Dubai', 'Business Bay', 'Zabeel'];

function tierOf(area) {
  if (TIER_S.includes(area)) return 'S';
  if (TIER_A.includes(area)) return 'A';
  return 'B';
}
const tierScore = { S: 1.0, A: 0.8, B: 0.6 };

const EMI_MAP = { '迪拜': 'dubai', '阿布扎比': 'abudhabi', '沙迦': 'sharjah', '哈伊马角': 'rak' };
function emiratePref(s) {
  if (!s || /不限/.test(s)) return null;
  for (const k in EMI_MAP) if (s.includes(k)) return EMI_MAP[k];
  return null;
}

// —— 预算归一（AED）。优先精确输入；否则用 AED 区间档 ——
export function normalizeBudget(profile) {
  const aed = Number(profile.budgetAED);
  if (aed && aed > 0) return { low: aed * 0.65, high: aed, hasBudget: true, label: `AED ${aed.toLocaleString()}` };
  const b = profile.budget || '';
  const W = 10000; // 「万」= AED 1 万
  const m = (lo, hi) => ({ low: lo, high: hi, hasBudget: true, label: b });
  if (/3000.*\+|3000万\+|^3000/.test(b)) return m(3000 * W, Infinity);
  if (/1000.?3000/.test(b)) return m(1000 * W, 3000 * W);
  if (/500.?1000/.test(b)) return m(500 * W, 1000 * W);
  if (/300.?500/.test(b)) return m(300 * W, 500 * W);
  if (/200.?300/.test(b)) return m(200 * W, 300 * W);
  if (/200.?以下|^.*以下/.test(b)) return m(0, 200 * W);
  return { low: 0, high: Infinity, hasBudget: false, label: '' };
}

function year(p) {
  const y = parseInt(String(p.handover || '').slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}
function firstPct(payment) {
  const m = String(payment || '').match(/(\d+)\s*%/);
  return m ? parseInt(m[1], 10) : null;
}
const BED_KEYS = { '工作室': ['工作室'], '1居': ['1居'], '2居': ['2居'], '3居': ['3居'], '4居': ['4居'], '5居+': ['5居', '6居', '7居'] };
function projHasBed(p, bed) {
  return (BED_KEYS[bed] || [bed]).some((k) => (p.unitInfo || '').includes(k));
}
function arr(v) { return Array.isArray(v) ? v.filter((x) => x && !/不限/.test(x)) : []; }

// 交付区间：按"今天 → 完工日期"的实际时长判定（精确到天，随当天动态变化）
//   已交付(现房)：完工日期已过（< 今天）
//   准现房：今天起 1 年内交付（0 ≤ 距今 ≤ 1 年）
//   1–3年：距今 1~3 年
//   3年以上：距今 > 3 年
function inHandoverBand(p, band) {
  if (!band || /不限/.test(band)) return true;
  const yu = yearsUntil(p);
  if (yu == null) return false; // 无完工日期 → 不归入任何明确档
  if (/准现房/.test(band)) return yu >= 0 && yu <= 1;          // 注意：必须在"现房"之前判断
  if (/已交付|现房/.test(band)) return yu < 0;
  if (/1.?3年/.test(band)) return yu > 1 && yu <= 3;
  if (/3年/.test(band)) return yu > 3;
  return true;
}

// 地段/景观偏好检测
function prefMatch(p, pref) {
  const a = p.area;
  const hay = `${p.area} ${p.amenities || ''} ${p.location || ''} ${p.blurb || ''}`.toLowerCase();
  if (/临海|水岸|海/.test(pref)) return WATER.includes(a) || /beach|sea|water|marina|creek|lagoon|harbour|island/.test(hay);
  if (/高尔夫/.test(pref)) return GOLF.includes(a) || /golf/.test(hay);
  if (/市中心/.test(pref)) return CITY_CORE.includes(a) || /downtown|burj/.test(hay);
  if (/公园|绿/.test(pref)) return /park|green|garden/.test(hay) || ['The Valley', 'Dubai Hills Estate', 'Arabian Ranches III', 'The Oasis'].includes(a);
  if (/家庭/.test(pref)) return FAMILY.includes(a);
  if (/品牌|豪宅/.test(pref)) return /address|vida|branded/.test((p.name + ' ' + p.blurb).toLowerCase()) || (tierOf(a) !== 'B' && (p.priceAED || 0) >= 5e6);
  return false;
}

function paymentMatch(p, opt) {
  if (/低首付/.test(opt)) { const fp = firstPct(p.payment); return fp != null && fp <= 10; }
  if (/交付后/.test(opt)) return /交付后|post|handover/i.test(p.payment);
  return false;
}

function gvScore(p) {
  const g = p.gv || '';
  if (/适配/.test(g)) return 1.0;
  if (/部分/.test(g)) return 0.6;
  if (/门槛以下/.test(g)) return 0.2;
  return 0.4;
}

// —— 开发商实力（品牌级，0–1）——
// 合成：tier（S/A/B/C）为主 + DXB 去化率(absorptionPct) + 资本增值率(capitalGainPct)
// + 交付规模量级(deliveredUnits) 微调。全部取自开发商维表的品牌级公开字段，
// 无项目级价格/去化。维表缺失或无实力信号 → 中性 0.6（不惩罚缺失）。
const DEV_TIER_SCORE = { S: 1.0, A: 0.82, B: 0.62, C: 0.45 };
function developerStrengthScore(p) {
  const dev = getDeveloper(p.developer);
  if (!dev) return { score: 0.6, dev: null };
  const dxb = dev.dxb || {};
  const hasTier = typeof dev.tier === 'string' && DEV_TIER_SCORE[dev.tier] != null;
  const hasSignal = hasTier
    || Number.isFinite(dxb.absorptionPct)
    || Number.isFinite(dxb.capitalGainPct)
    || Number.isFinite(dxb.deliveredUnits);
  if (!hasSignal) return { score: 0.6, dev }; // 维表存在但无实力字段 → 中性
  // 基座：tier（70%）。无 tier 时用 0.6 中性基座。
  let base = hasTier ? DEV_TIER_SCORE[dev.tier] : 0.6;
  // 去化率（0–100% → 0–1）。缺失记中性 0.6，避免拉低。
  const absorp = Number.isFinite(dxb.absorptionPct) ? Math.min(1, dxb.absorptionPct / 100) : 0.6;
  // 资本增值率：0–40% 映射到 0–1（40%+ 封顶），负值记 0。
  const gain = Number.isFinite(dxb.capitalGainPct) ? Math.max(0, Math.min(1, dxb.capitalGainPct / 40)) : 0.6;
  // 交付规模量级：log10(deliveredUnits) 归一（~1 套→0，~100k 套→1）。缺失记中性。
  const du = dxb.deliveredUnits;
  const scale = Number.isFinite(du) && du > 0 ? Math.min(1, Math.log10(du) / 5) : 0.55;
  // 加权合成：tier 基座为主，市场表现（去化+增值+规模）微调。
  const score = Math.max(0, Math.min(1, 0.55 * base + 0.18 * absorp + 0.15 * gain + 0.12 * scale));
  return { score, dev };
}

function dims(p, ctx) {
  const { B, goal, tier, isApt, isVilla, isFam, hay } = ctx;
  // 预算贴合
  let budget;
  if (!B.hasBudget) budget = 0.6;
  else if (p.priceAED == null) budget = 0.45;
  else if (p.priceAED > B.high * 1.08) budget = 0;
  else if (p.priceAED > B.high) budget = 0.5;
  else if (p.priceAED >= B.low) budget = 1.0;
  else budget = 0.72 + 0.18 * (p.priceAED / Math.max(B.low, 1));
  const gv = gvScore(p);
  const area = tierScore[tier];
  // 开发商实力（品牌级，缺数据→中性 0.6）
  const devStrength = ctx.devStrength != null ? ctx.devStrength : developerStrengthScore(p).score;

  // 目标维（含新目的）
  let goalFit = 0.6;
  if (/黄金签证/.test(goal)) goalFit = gv;
  else if (/资本增值/.test(goal)) goalFit = tierScore[tier];
  else if (/资产配置/.test(goal)) goalFit = Math.min(1, 0.5 * tierScore[tier] + 0.5 * gv);
  else if (/税务规划/.test(goal)) goalFit = Math.min(1, 0.4 + 0.3 * gv + 0.3 * tierScore[tier]); // UAE 0% 税 + 身份
  else if (/租金|出租|现金流/.test(goal)) goalFit = Math.min(1, (isApt ? 0.6 : 0.3) + (tier === 'S' ? 0.4 : tier === 'A' ? 0.25 : 0.1));
  else if (/商务度假/.test(goal)) goalFit = Math.min(1, (isApt ? 0.5 : 0.25) + (CITY_CORE.includes(p.area) || WATER.includes(p.area) ? 0.45 : 0.15) + (/酒店公寓/.test(p.types) ? 0.1 : 0));
  else if (/刚需自住/.test(goal)) goalFit = Math.min(1, (isFam ? 0.45 : 0.25) + (p.priceAED && p.priceAED <= 3e6 ? 0.35 : 0.1) + (isApt || isVilla ? 0.1 : 0));

  // 交付时间（按"今天 → 完工日期"实际时长）
  const yu = yearsUntil(p);
  let timeline;
  if (ctx.handoverBand && !/不限/.test(ctx.handoverBand)) {
    timeline = inHandoverBand(p, ctx.handoverBand) ? 1.0 : 0.25;
  } else if (yu == null) timeline = 0.6;
  else {
    timeline = yu < 0 ? 0.85 : yu <= 1 ? 0.95 : yu <= 2 ? 1.0 : yu <= 3 ? 0.9 : yu <= 4 ? 0.8 : 0.72;
    if (/进取/.test(ctx.risk) && yu > 3) timeline += 0.08;
    if (/稳健/.test(ctx.risk) && yu <= 1) timeline += 0.06;
    timeline = Math.min(1, timeline);
  }

  // 户型
  let bed = 0.6;
  if (ctx.beds.length) bed = ctx.beds.some((b) => projHasBed(p, b)) ? 1.0 : 0.3;
  // 付款
  let payment = 0.6;
  if (ctx.payments.length) payment = ctx.payments.some((o) => paymentMatch(p, o)) ? 1.0 : 0.3;
  // 地段/景观偏好
  let prefs = 0.6;
  if (ctx.prefs.length) prefs = ctx.prefs.filter((pf) => prefMatch(p, pf)).length / ctx.prefs.length;
  // 自由文本关键词
  let keyword = 0.6;
  if (ctx.kwReq.length) keyword = ctx.kwReq.filter((r) => r.syn.some((s) => hay.includes(s))).length / ctx.kwReq.length;

  return { budget, gv, area, goalFit, timeline, bed, payment, prefs, keyword, devStrength };
}

const KW = [
  { trig: /海|临海|海滩|beach|water/i, syn: ['beach', 'sea', 'waterfront', 'marina', 'creek', 'lagoon', 'island', 'harbour'] },
  { trig: /高尔夫|golf/i, syn: ['golf', 'polo'] },
  { trig: /地铁|交通|通勤|metro/i, syn: ['metro', 'station', 'min to', 'mins to', 'airport'] },
  { trig: /学校|学区|教育|读书|school/i, syn: ['school', 'education', 'nursery', 'academ'] },
  { trig: /家庭|亲子|family/i, syn: ['family', 'playground', 'children'] },
  { trig: /市中心|downtown/i, syn: ['downtown', 'burj', 'business bay'] },
  { trig: /品牌|branded/i, syn: ['branded', 'address', 'vida'] },
];

function weightsFor(goal) {
  // 基线：devStrength 占 8%（从 budget/area 各让出 4%，保持预算/GV/片区为主格局）。
  const w = { budget: 0.20, gv: 0.20, area: 0.18, goalFit: 0.12, timeline: 0.07, bed: 0.05, payment: 0.04, prefs: 0.05, keyword: 0.03, devStrength: 0.08 };
  if (/黄金签证/.test(goal)) { w.gv += 0.10; w.area -= 0.04; }
  else if (/资本增值/.test(goal)) { w.area += 0.09; w.budget -= 0.02; w.devStrength += 0.04; } // 资本增值时上调开发商实力至 ~12%
  else if (/资产配置/.test(goal)) { w.area += 0.05; w.gv += 0.03; w.devStrength += 0.02; }
  else if (/税务规划/.test(goal)) { w.gv += 0.06; w.area += 0.04; }
  else if (/租金|出租|现金流/.test(goal)) { w.goalFit += 0.10; w.area += 0.03; w.gv -= 0.05; }
  else if (/商务度假/.test(goal)) { w.goalFit += 0.08; w.prefs += 0.04; w.gv -= 0.05; }
  else if (/刚需自住/.test(goal)) { w.goalFit += 0.08; w.budget += 0.04; w.gv -= 0.06; }
  let s = 0; for (const k in w) { if (w[k] < 0.01) w[k] = 0.01; s += w[k]; }
  for (const k in w) w[k] /= s;
  return w;
}

const startNum = (p) => String(p.startHint || '').replace(/（.*）/, '').trim();

// 开发商背书句（中文，全部用维表真实数字；无数字项自动省略）。
// cn 缺失时用英文品牌名。仅用品牌级字段，绝不涉及项目级价格/去化。
const round1 = (n) => Math.round(n * 10) / 10;
function developerReason(dev) {
  if (!dev) return null;
  const brand = dev.cn ? `${dev.name}（${dev.cn}）` : dev.name;
  const dxb = dev.dxb || {};
  const facts = [];
  if (dxb.rank === 1) facts.push('迪拜销售额第一的开发商');
  else if (Number.isFinite(dxb.rank) && dxb.rank <= 10) facts.push(`迪拜开发商综合排名第 ${dxb.rank}`);
  if (/上市|Listed/i.test(dev.ownership || '')) facts.push('上市开发商');
  else if (/Government|政府/i.test(dev.ownership || '')) facts.push('政府背景开发商');
  const metrics = [];
  if (Number.isFinite(dxb.capitalGainPct) && dxb.capitalGainPct > 0) metrics.push(`近 12 个月转售中位涨幅 ${round1(dxb.capitalGainPct)}%`);
  if (Number.isFinite(dxb.absorptionPct)) metrics.push(`在建盘去化率 ${round1(dxb.absorptionPct)}%`);
  if (Number.isFinite(dxb.deliveredUnits) && dxb.deliveredUnits > 0) {
    const du = dxb.deliveredUnits;
    const duTxt = du >= 10000 ? `逾 ${Math.floor(du / 10000)} 万套` : `约 ${du.toLocaleString()} 套`;
    metrics.push(`累计交付${duTxt}`);
  }
  // 至少要有一个可用信号才生成背书句；否则退回 tier 描述。
  if (!facts.length && !metrics.length) {
    if (dev.tier === 'S') return `开发商 ${brand} 为迪拜头部（S 级）开发商，品牌与二手流动性表现领先。`;
    if (dev.tier === 'A') return `开发商 ${brand} 为迪拜优质（A 级）开发商，交付与口碑稳健。`;
    return null;
  }
  const lead = facts.length ? `为${facts.join('、')}` : '实力稳健';
  const tail = metrics.length ? `，${metrics.join('，')}` : '';
  return `开发商 ${brand}${lead}${tail}。`;
}

function reasonsFor(p, d, w, B, tier, ctx) {
  const contrib = Object.keys(d).map((k) => ({ k, v: d[k] * (w[k] || 0), s: d[k] }));
  contrib.sort((a, b) => b.v - a.v);
  const out = [];
  const add = (t) => { if (t && out.length < 3 && !out.includes(t)) out.push(t); };
  for (const c of contrib) {
    if (out.length >= 3) break;
    if (c.s < 0.55) continue;
    if (c.k === 'budget' && B.hasBudget && p.priceAED != null) {
      if (p.priceAED >= B.low && p.priceAED <= B.high) add(`起价 ${startNum(p)} 正落在你的预算区间内，性价比高。`);
      else if (p.priceAED < B.low) add(`起价 ${startNum(p)}，低于预算上限，资金更从容、可上探更大户型。`);
    } else if (c.k === 'gv') {
      if (/适配/.test(p.gv)) add('起价已达 AED 200 万黄金签证门槛，可一步规划长期身份。');
      else if (/部分/.test(p.gv)) add('选取较大户型可达黄金签证门槛，建议与顾问核对。');
    } else if (c.k === 'area') {
      if (tier === 'S') add(`位于 ${p.area} 核心/临水板块，流动性与增值预期俱佳。`);
      else if (tier === 'A') add(`${p.area} 成熟优质社区，自住与保值兼顾。`);
      else add(`${p.area} 新兴价值板块，单价更友好、增长空间可期。`);
    } else if (c.k === 'goalFit') {
      add('项目定位贴合你的核心目标，整体契合度高。');
    } else if (c.k === 'timeline') {
      const yu = yearsUntil(p);
      if (yu != null) {
        if (yu < 0) add('已交付现房，即买即用、确定性高。');
        else if (yu <= 1) add('准现房，约 1 年内交付，等待期短。');
        else add(`预计 ${p.handover} 交付，建设期分期，时间与资金更可控。`);
      }
    } else if (c.k === 'bed' && ctx.beds.length) {
      add(`提供你想要的户型（${ctx.beds.join('、')}）。`);
    } else if (c.k === 'payment' && ctx.payments.length) {
      add(/交付后/.test(ctx.payments.join()) && /交付后|post/i.test(p.payment) ? '支持交付后付款，首付与持有压力更低。' : `付款计划首付门槛友好（${p.payment.replace(/付款计划\s*/, '').replace(/（.*）/, '')}）。`);
    } else if (c.k === 'prefs' && ctx.prefs.length) {
      const hit = ctx.prefs.filter((pf) => prefMatch(p, pf));
      if (hit.length) add(`契合你的偏好：${hit.join('、')}。`);
    } else if (c.k === 'keyword') {
      add('片区配套与你描述的需求高度吻合。');
    }
    // 注：devStrength 的背书句在循环后统一注入（保证有维表数据时稳定出现），
    // 此处不在循环内竞争前排理由槽。
  }
  // 开发商背书句：当项目开发商有维表实力数据时，稳定注入为第 2 条理由。
  // 若已满 3 条，替换掉最后一条（背书句通常比末位通用理由更有信息量）。
  const devReason = developerReason(getDeveloper(p.developer));
  if (devReason && !out.includes(devReason)) {
    if (out.length >= 3) out[2] = devReason;
    else out.splice(Math.min(1, out.length), 0, devReason);
  }
  if (out.length < 2 && p.blurb) add(p.blurb);
  if (out.length === 0) add(`${p.area}${p.developer ? `，${p.developer} 出品` : ''}，项目级匹配。`);
  return out.slice(0, 3);
}

export function runMatch(PROJECTS, profile) {
  const goal = profile.goal || '';
  const freeText = profile.freeText || '';
  const B = normalizeBudget(profile);
  const emi = emiratePref(profile.city || profile.emirate);
  const regions = arr(profile.regions);
  const typesW = arr(profile.types);
  const beds = arr(profile.beds);
  const payments = arr(profile.payment);
  const prefs = arr(profile.prefs);
  const kwReq = KW.filter((k) => k.trig.test(freeText));

  // 硬过滤（含松弛）
  let pool = PROJECTS.filter((p) => !/sold/i.test(p.status || ''));
  if (emi) { const f = pool.filter((p) => p.emirate === emi); if (f.length >= 3) pool = f; }
  if (regions.length) { const f = pool.filter((p) => regions.includes(p.area)); if (f.length >= 1) pool = f; }
  if (typesW.length) { const f = pool.filter((p) => typesW.some((t) => p.types.includes(t))); if (f.length >= 3) pool = f; }
  if (B.hasBudget && B.high !== Infinity) {
    const f = pool.filter((p) => p.priceAED == null || p.priceAED <= B.high * 1.08);
    if (f.length >= 3) pool = f;
  }
  // 交付时间档：按"今天→完工日期"实际时长严格过滤（不放宽——宁可少也要准）
  if (profile.handover && !/不限/.test(profile.handover)) {
    pool = pool.filter((p) => inHandoverBand(p, profile.handover));
  }

  const w = weightsFor(goal);
  const scored = pool.map((p) => {
    const tier = tierOf(p.area);
    const hay = `${p.area} ${p.amenities || ''} ${p.location || ''} ${p.blurb || ''}`.toLowerCase();
    const d = dims(p, {
      B, goal, tier, hay, beds, payments, prefs, kwReq,
      handoverBand: profile.handover || '', risk: profile.risk || '',
      isApt: p.types.includes('公寓'), isVilla: /别墅|联排/.test(p.types), isFam: FAMILY.includes(p.area),
    });
    let raw = 0; for (const k in w) raw += w[k] * (d[k] || 0);
    const score = Math.max(45, Math.min(98, Math.round(45 + 53 * Math.pow(raw, 1.15))));
    return { p, d, score, tier };
  }).sort((a, b) => b.score - a.score);

  const picked = []; const usedComm = new Set();
  for (const c of scored) { if (picked.length >= 3) break; if (usedComm.has(c.p.area)) continue; picked.push(c); usedComm.add(c.p.area); }
  for (const c of scored) { if (picked.length >= 3) break; if (!picked.includes(c)) picked.push(c); }

  const ctx = { beds, payments, prefs };
  const matches = picked.map((o) => ({ name: o.p.name, matchScore: o.score, reasons: reasonsFor(o.p, o.d, w, B, o.tier, ctx) }));

  const anyGV = picked.some((o) => /适配/.test(o.p.gv));
  const gvPath = anyGV
    ? '匹配结果中已有项目起价达 AED 200 万黄金签证门槛，可一步到位；其余项目选取较大户型亦有机会达标，具体资格、流程以丹枫顾问及官方为准。'
    : '当前匹配项目多为黄金签证门槛以下；如以身份规划为先，建议上探更大户型或别墅类项目。具体资格、流程以丹枫顾问及官方为准。';

  return {
    intro: `根据你的画像（${B.hasBudget ? B.label + '、' : ''}目标与片区偏好），已从 ${PROJECTS.length} 个期房中为你筛选并排序出最匹配的项目：`,
    matches,
    gvPath,
  };
}
