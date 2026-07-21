// ============================================================
// 引导式对话采集 · 问题树纯数据（脚本引擎唯一真相）
// ------------------------------------------------------------
// 设计规格：引导式对话采集-交互设计v1_2026-07-06.md
// 顾问身份「子枫」（丹枫投顾助理，红枫叶头像）。
//
// 本文件只含「问什么、给哪些选项、答案怎么写 profile、何时分支」的
// 纯声明式数据；渲染/回退/进度/收尾动画由 components/ConversationFlow.jsx 承载。
// 第三步换 LLM 时，本文件可整体替换为「LLM 返回的下一步指令」，UI 外壳复用。
//
// 选项文案一律引用 lib/options.js（单一真相），禁止另抄字符串——否则与
// lib/match.js 的正则解耦，会导致过滤/打分错位。
// profile 契约（与 AdvisorProvider 初值、runMatch 完全一致）：
//   budget, budgetAED, goal, city, regions[], types[], beds[], risk,
//   handover, payment[], prefs[]
// 「暂不确定」写入的默认值即引擎中性值（见规格 §5 映射总表）。
// ============================================================
import {
  BUDGET_BANDS, GOALS, CITIES, REGIONS, TYPES, BEDS, HANDOVERS, PAYMENTS, PREFS,
} from './options';

// 「暂不确定」跳过胶囊统一文案。
export const SKIP_LABEL = '暂不确定';

// 单选/多选题的选项包装：value 即写入 profile 的原文（来自 options.js）。
const opt = (v) => ({ label: v, value: v });

// 顾问身份（渲染层用）。
export const ADVISOR = {
  name: '子枫',
  title: '丹枫投顾助理',
  en: 'UAE OFF-PLAN ADVISOR',
};

// 开场白（与 AdvisorProvider OPENING 同步 · 首页十点定稿）。
export const INTRO_TEXT =
  '您好，我是丹枫智能投顾「子枫 Dan」。跟我说说您的预算和目的，我来帮您匹配房产项目、生成投资报告。';

// 收尾生成动画气泡（顺序播放，纯展示，不写 profile、不发请求）。
// 文案要素务必真实：项目数由 catalog 动态取（PROJECTS.length），加权维度与引擎一致。
// {N} 占位由渲染层用 PROJECTS.length 回填（规格里的「271 个 Emaar」为过时错误）。
export const FINALE_LINES = [
  '正在读取您的投资画像…',
  '从 {N} 个精选期房项目中筛选适配项目…',
  '按预算贴合、增值潜力、黄金签证适配等维度加权排序…',
  '已为您生成专属匹配报告，请见{where}。',
];

// —— 主干题 / 分支题 / 追加题：节点数组（含话术、选项、映射、分支条件）——
// 每个节点：
//   id        唯一标识（用于回退定位、分支管理）
//   phase     'main' 主干 | 'branch' 条件分支 | 'addon' 追加偏好 | 'fork' 路由
//   kind      'single' 单选 | 'multi' 多选 | 'region' 社区多选下拉
//             | 'info' 纯信息气泡（不提问）| 'fork' 二选一路由
//   field     写入的 profile 字段（info/fork 无）
//   question  顾问话术（≤30 字）
//   options   选项数组（single/multi/fork）
//   skip      是否提供「暂不确定」胶囊
//   skipValue 跳过时写入 field 的中性值（省略=不写值 / 多选清空）
//   confirm   多选题的确认键文案（点它才回显汇总气泡并进下一题）
//   budgetInput  Q1 专属：是否挂「✎ 填写精确预算」内联数字框
//   showWhen  (ctx)=>bool 该节点是否应出现（分支条件；缺省=总出现）
//   dependsOn 改答重算时：本节点依赖哪些字段（用于分支智能增删）
//   infoText  (ctx)=>string info 节点的气泡文案

export const NODES = [
  // ---- 主干 Q1 · 预算 ----
  {
    id: 'Q1', phase: 'main', kind: 'single', field: 'budget',
    question: '先看预算区间。您计划投入多少？（AED）',
    options: BUDGET_BANDS.map(opt),
    budgetInput: true, skip: true, skipValue: '',
    echoLabel: '预算',
  },
  // ---- 主干 Q2 · 核心目的 ----
  {
    id: 'Q2', phase: 'main', kind: 'single', field: 'goal',
    question: '这次置业，您最看重什么？',
    options: GOALS.map(opt),
    skip: true, skipValue: '',
    echoLabel: '核心目的',
  },
  // ---- 分支 B1 · 黄金签证门槛校验（预算未达/未填）----
  {
    id: 'B1', phase: 'branch', kind: 'single', field: 'budget',
    question: '黄金签证门槛为 AED 200 万。您的预算可能需上探，是否调整？',
    options: [
      { label: '上调到 200–300万', value: '200–300万' },
      { label: '上调到 300–500万', value: '300–500万' },
      { label: '预算不变，看适配方案', value: '__keep__' },
    ],
    skip: true, skipValue: '__keep__',
    echoLabel: '预算',
    dependsOn: ['goal', 'budget', 'budgetAED'],
    // 仅当 目的=黄金签证 且 预算未达 200 万门槛（或未填）时出现。
    showWhen: (ctx) => ctx.goal === '黄金签证' && !ctx.budgetMeetsGV,
    // 选完后顾问补一句信息气泡。
    followInfo: '明白。报告会优先标出可达门槛的项目，其余以较大户型触达为准。',
  },
  // ---- 分支 B1' · 黄金签证预算已达标（仅肯定气泡，不提问）----
  {
    id: 'B1ok', phase: 'branch', kind: 'info',
    dependsOn: ['goal', 'budget', 'budgetAED'],
    showWhen: (ctx) => ctx.goal === '黄金签证' && ctx.budgetMeetsGV,
    infoText: () => '您的预算已达黄金签证门槛，报告会优先标出一步到位的项目。',
  },
  // ---- 分支 B2 · 持有周期（目的=租金收益 → risk）----
  {
    id: 'B2', phase: 'branch', kind: 'single', field: 'risk',
    question: '计划持有多久？这关系到现金流与增值的取舍。',
    options: [
      { label: '短期出租（≤3年）', value: '稳健' },
      { label: '中期（3–5年）', value: '平衡' },
      { label: '长期持有（5年+）', value: '进取' },
    ],
    skip: true, skipValue: '平衡',
    echoLabel: '持有周期',
    // 回显时把 risk 内值翻回自然语言。
    echoMap: { 稳健: '短期出租（≤3年）', 平衡: '中期（3–5年）', 进取: '长期持有（5年+）' },
    dependsOn: ['goal'],
    showWhen: (ctx) => ctx.goal === '租金收益',
  },
  // ---- 主干 Q3 · 城市 ----
  {
    id: 'Q3', phase: 'main', kind: 'single', field: 'city',
    question: '主要看哪个酋长国？',
    options: CITIES.map(opt),
    skip: true, skipValue: '不限',
    echoLabel: '城市',
  },
  // ---- 分支 B3 · 城市覆盖提示（迪拜以外，信息气泡）----
  {
    id: 'B3', phase: 'branch', kind: 'info',
    dependsOn: ['city'],
    showWhen: (ctx) => ['阿布扎比', '沙迦', '哈伊马角'].includes(ctx.city),
    infoText: (ctx) =>
      `目前项目库以迪拜期房为主，${ctx.city}覆盖有限。我仍会尽力匹配，具体机会由丹枫顾问补充。`,
  },
  // ---- 追问 Q3b · 片区（迪拜/不限路径，可跳过）----
  {
    id: 'Q3b', phase: 'branch', kind: 'region', field: 'regions',
    question: '有心仪的迪拜社区吗？可选，多选。',
    options: REGIONS.map(opt),
    skip: true, // 跳过 = regions 保持 []
    confirm: '完成',
    echoLabel: '社区',
    dependsOn: ['city'],
    showWhen: (ctx) => ['迪拜', '不限', ''].includes(ctx.city),
  },
  // ---- 主干 Q4 · 物业类型（多选）----
  {
    id: 'Q4', phase: 'main', kind: 'multi', field: 'types',
    question: '偏好哪类物业？可多选。',
    options: TYPES.map(opt),
    confirm: '下一步', skip: true,
    echoLabel: '物业类型',
  },
  // ---- 主干 Q5 · 交付时间 ----
  {
    id: 'Q5', phase: 'main', kind: 'single', field: 'handover',
    question: '期望什么时候交付？',
    options: HANDOVERS.map(opt),
    skip: true, skipValue: '不限',
    echoLabel: '交付时间',
  },
  // ---- 分叉 · 是否深入（纯路由，不写 profile）----
  {
    id: 'FORK', phase: 'fork', kind: 'fork',
    question: '主要偏好已了解。是否再补充几项，让匹配更精准？',
    options: [
      { label: '补充更多偏好（约 3 问）', value: 'more' },
      { label: '直接生成报告', value: 'done' },
    ],
  },
  // ---- 追加 A1 · 户型（多选，可跳过）----
  {
    id: 'A1', phase: 'addon', kind: 'multi', field: 'beds',
    question: '需要哪种户型？可多选。',
    options: BEDS.map(opt),
    confirm: '下一步', skip: true,
    echoLabel: '户型',
    showWhen: (ctx) => ctx.wantMore,
  },
  // ---- 追加 A2 · 付款计划（多选，可跳过）----
  {
    id: 'A2', phase: 'addon', kind: 'multi', field: 'payment',
    question: '对付款方式有偏好吗？可多选。',
    options: PAYMENTS.map(opt),
    confirm: '下一步', skip: true,
    echoLabel: '付款计划',
    showWhen: (ctx) => ctx.wantMore,
  },
  // ---- 追加 A3 · 地段/景观（多选，可跳过，末题确认键即触发收尾）----
  {
    id: 'A3', phase: 'addon', kind: 'multi', field: 'prefs',
    question: '最后，环境上有偏好吗？可多选。',
    options: PREFS.map(opt),
    confirm: '生成报告', skip: true,
    echoLabel: '地段/景观',
    showWhen: (ctx) => ctx.wantMore,
  },
];

// 主干题（用于进度条分母）。
export const MAIN_IDS = NODES.filter((n) => n.phase === 'main').map((n) => n.id);

// 黄金签证门槛（AED）。lib/options.js 的预算档位一律是 AED 口径（万 = AED 1万）。
export const GV_THRESHOLD_AED = 2_000_000;

// 各预算档的「AED 下界」——用于门槛判定（达标 = 档位下界 ≥ 门槛）。
// 与 BUDGET_BANDS 一一对应，禁止用正则从文案里抠数字（脆弱、易误命中）。
//   'AED 200万以下' 下界视为 0（其上界=门槛，整档均 < 门槛）→ 未达
//   '200–300万'     下界 = AED 200万 = 2,000,000 → 恰好达标
export const BUDGET_BAND_FLOOR_AED = {
  'AED 200万以下': 0,
  '200–300万': 2_000_000,
  '300–500万': 3_000_000,
  '500–1000万': 5_000_000,
  '1000–3000万': 10_000_000,
  '3000万+': 30_000_000,
};

// 判断给定预算是否达黄金签证门槛（AED 口径）。
// 优先精确值 budgetAED（已是 AED 数值）；否则按档位下界 ≥ 门槛判定。
// 注意：若上游存在 ¥（人民币）口径，须在写入 profile 前换算 ¥→AED（≈÷1.95），
// 到这里的 budget/budgetAED 契约恒为 AED，本函数不再二次换算。
export function budgetMeetsGV(profile) {
  const aed = Number(profile.budgetAED);
  if (aed && aed > 0) return aed >= GV_THRESHOLD_AED;
  const b = profile.budget || '';
  if (!b) return false; // 未填 → 未达
  const floor = BUDGET_BAND_FLOOR_AED[b];
  if (floor == null) return false; // 未知档位 → 保守未达
  return floor >= GV_THRESHOLD_AED;
}

// 由 profile + 路由态 组装节点可见性上下文。
export function buildCtx(profile, routeState = {}) {
  return {
    goal: profile.goal || '',
    city: profile.city || '',
    budget: profile.budget || '',
    budgetAED: profile.budgetAED || '',
    budgetMeetsGV: budgetMeetsGV(profile),
    wantMore: routeState.wantMore === true,
  };
}

// 按当前 ctx 计算「应出现的节点序列」（含分支智能增删）。
// FORK 之后的 addon 节点仅在 wantMore 时纳入。
export function visibleNodes(ctx) {
  return NODES.filter((n) => (typeof n.showWhen === 'function' ? n.showWhen(ctx) : true));
}
