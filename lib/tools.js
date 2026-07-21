// ============================================================
// 子枫四检索工具（服务端实现）—— 规格 v2 §4.2。
// 读 lib/catalog 三库 + 复用 lib/match.runMatch，返回施加「AI 可读白名单」
// 后的紧凑 JSON。护栏双保险：即使源数据混入敏感字段，本层显式 pick 也不外泄。
//   · 绝不返回 Primary/PSF/Units Sold/项目级去化率/实时价/佣金/配额/内部评级
//   · 社区级 marketData（户型参考价）默认不返回，待 LEO 客显签核后由
//     环境开关 ENABLE_COMMUNITY_PRICES=true 放行（规格待拍板项①）。
// 每次返回控制在 ~1–2K token；searchProjects 最多 8 条摘要字段。
// ============================================================
import 'server-only';
import { PROJECTS, getDeveloper, getCommunity, EMIRATES } from './catalog';
import { runMatch } from './match';
import { createReport } from './reportStore';

// LEO 已授权三库对外（含社区级公开参考价）：门控默认打开，
// 仅当显式 ENABLE_COMMUNITY_PRICES=false 时关闭。让 getCommunity 返回
// 户型级 ROI/参考价（带 source/护栏标注），子枫有真数可引即不会凭记忆编造。
const ALLOW_COMM_PRICES =
  String(process.env.ENABLE_COMMUNITY_PRICES ?? 'true').toLowerCase() !== 'false';

// —— 工具定义（Anthropic tool schema）——
export const TOOL_DEFS = [
  {
    name: 'searchProjects',
    description:
      '按条件检索丹枫在售期房项目库（迪拜为主）。用于收窄某类项目/片区/预算适配。只返回项目级摘要字段，绝不含实时价格或房态。',
    input_schema: {
      type: 'object',
      properties: {
        emirate: { type: 'string', enum: ['dubai', 'abudhabi', 'sharjah', 'rak'], description: '酋长国' },
        area: { type: 'string', description: '片区/社区名（模糊匹配，拉丁原名）' },
        developer: { type: 'string', description: '开发商名（模糊匹配）' },
        types: { type: 'array', items: { type: 'string' }, description: '物业类型：公寓/别墅/联排/办公' },
        budgetMaxAED: { type: 'number', description: '起价上限（AED），按开盘起价过滤' },
        gvFit: { type: 'boolean', description: '仅返回黄金签证适配项目' },
        handover: { type: 'string', description: '交付档关键词，如 2027 / 已交付' },
        limit: { type: 'number', description: '返回条数，默认 8，最多 8' },
      },
    },
  },
  {
    name: 'getDeveloper',
    description:
      '取开发商维表与 DFP-5 评级（丹枫内部研究评分，非信用违约评级、不担保收益）。用于回答开发商是否靠谱/交付履约/评级。',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: '开发商名（含常见别名，如 Damac/wasl）' } },
      required: ['name'],
    },
  },
  {
    name: 'getCommunity',
    description:
      '取社区画像（定位/标签/交通/配套/生活方式）及社区级公开参考价 marketData（户型级 salePrice/rent/roi，带 source）。回答某社区怎么样时调用；尤其在谈任何片区的租金回报率/参考价之前必须先调本工具取真数，绝不凭记忆报数字。',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: '社区/片区名（含多平台别名）' } },
      required: ['name'],
    },
  },
  {
    name: 'runMatch',
    description:
      '根据客户画像生成匹配报告（2–3 个项目 + 理由 + 黄金签证路径），并分配报告编号。画像基本齐（预算/目的/城市至少其二）且客户有推荐意向时调用。调用前先口头预告"我从库里筛一轮"。',
    input_schema: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          description: '从对话提炼的客户画像',
          properties: {
            budgetAED: { type: 'number' },
            goal: { type: 'string' },
            city: { type: 'string' },
            regions: { type: 'array', items: { type: 'string' } },
            types: { type: 'array', items: { type: 'string' } },
            beds: { type: 'array', items: { type: 'string' } },
            handover: { type: 'string' },
            payment: { type: 'array', items: { type: 'string' } },
            prefs: { type: 'array', items: { type: 'string' } },
            risk: { type: 'string' },
          },
        },
        freeText: { type: 'string', description: '客户自由表达的补充需求原文' },
      },
      required: ['profile'],
    },
  },
];

// tools 数组末条标 cache_control（命中 prompt caching：工具定义整体缓存）。
export function toolsForApi() {
  const t = TOOL_DEFS.map((d) => ({ ...d }));
  t[t.length - 1] = { ...t[t.length - 1], cache_control: { type: 'ephemeral' } };
  return t;
}

// —— 白名单 pick（显式构造，绝不 spread 源对象）——
function pickProjectSummary(p) {
  const e = EMIRATES[p.emirate] || ['', p.emirate];
  return {
    name: p.name,
    cn: p.cn || undefined,
    emirate: e[1],
    area: p.area,
    developer: p.developer,
    types: p.types,
    handover: p.handover || undefined,
    startHint: p.startHint || undefined, // 开盘起价示意（非实时报价）
    gv: p.gv || undefined,
    status: p.status || undefined,
  };
}

function pickDeveloper(d) {
  const dxb = d.dxb || {};
  const dfp5 = d.dfp5 || {};
  return {
    name: d.name,
    cn: d.cn || undefined,
    ownership: d.ownership || undefined,
    founded: d.founded || undefined,
    country: d.country || undefined,
    // website 不给模型（LEO 2026-07-10：站内不展示开发商官网外链，AI 口述同口径）
    dxb: {
      rank: dxb.rank,
      transactionsYtd: dxb.transactionsYtd,
      salesValueBn: dxb.salesValueBn,
      capitalGainPct: dxb.capitalGainPct,
      absorptionPct: dxb.absorptionPct,
      ucProjects: dxb.ucProjects,
      ucUnits: dxb.ucUnits,
      deliveredProjects: dxb.deliveredProjects,
      deliveredUnits: dxb.deliveredUnits,
      asOf: dxb.asOf,
    },
    dfp5:
      dfp5.status === 'Rated'
        ? {
            status: dfp5.status,
            score: dfp5.score,
            leaves: dfp5.leaves,
            coverage: dfp5.coverage,
            confidence: dfp5.confidence,
            ratedDate: dfp5.ratedDate,
            version: dfp5.version,
            dims: dfp5.dims,
          }
        : { status: dfp5.status || 'Unrated' },
    blurbCn: d.blurbCn || undefined,
  };
}

function pickCommunity(c) {
  const prof = c.profile || {};
  const out = {
    name: c.name,
    cn: c.cn || undefined,
    communityId: c.communityId || undefined,
    classification: c.classification || undefined,
    area: c.area
      ? { dldArea: c.area.dldArea, masterProject: c.area.masterProject }
      : undefined,
    profile: {
      blurbCn: prof.blurbCn || undefined,
      tags: prof.tags || undefined,
      location: prof.location || undefined,
      amenities: prof.amenities || undefined,
      lifestyle: prof.lifestyle || undefined,
    },
  };
  // 社区级参考价：默认不返回（🔒 待 LEO 客显签核）。放行时仅带公开参考价 + 来源/护栏。
  if (ALLOW_COMM_PRICES && c.marketData && Array.isArray(c.marketData.unitPrices)) {
    out.marketData = {
      source: c.marketData.source,
      note: '社区级公开参考、非报价、非收益承诺',
      unitPrices: c.marketData.unitPrices.map((u) => ({
        type: u.type,
        propertyType: u.propertyType,
        salePrice: u.salePrice,
        rent: u.rent,
        roi: u.roi,
      })),
    };
  }
  return out;
}

// —— 交付档模糊匹配（宽松 substring）——
function handoverHit(p, band) {
  if (!band) return true;
  const b = String(band);
  const h = String(p.handover || '');
  if (/已交付|现房/.test(b)) return /已交付/.test(p.status || '') || /202[0-5]/.test(h);
  const m = b.match(/20\d{2}/);
  if (m) return h.includes(m[0]);
  return true;
}

// ============================================================
// executeTool — 统一执行入口，返回紧凑 JSON（对象）。
// ============================================================
export function executeTool(name, input = {}) {
  if (name === 'searchProjects') return doSearch(input);
  if (name === 'getDeveloper') return doGetDeveloper(input);
  if (name === 'getCommunity') return doGetCommunity(input);
  if (name === 'runMatch') return doRunMatch(input);
  return { error: 'unknown_tool', name };
}

function doSearch(input) {
  const lim = Math.max(1, Math.min(8, Number(input.limit) || 8));
  const areaQ = String(input.area || '').toLowerCase().trim();
  const devQ = String(input.developer || '').toLowerCase().trim();
  const types = Array.isArray(input.types) ? input.types : [];
  let pool = PROJECTS.filter((p) => !/sold/i.test(p.status || ''));
  if (input.emirate) pool = pool.filter((p) => p.emirate === input.emirate);
  if (areaQ) pool = pool.filter((p) => String(p.area || '').toLowerCase().includes(areaQ));
  if (devQ) pool = pool.filter((p) => String(p.developer || '').toLowerCase().includes(devQ));
  if (types.length) pool = pool.filter((p) => types.some((t) => String(p.types || '').includes(t)));
  if (Number.isFinite(Number(input.budgetMaxAED))) {
    const cap = Number(input.budgetMaxAED) * 1.08;
    pool = pool.filter((p) => p.priceAED == null || p.priceAED <= cap);
  }
  if (input.gvFit) pool = pool.filter((p) => /适配/.test(p.gv || ''));
  if (input.handover) pool = pool.filter((p) => handoverHit(p, input.handover));
  const count = pool.length;
  const projects = pool.slice(0, lim).map(pickProjectSummary);
  return { count, returned: projects.length, projects };
}

function doGetDeveloper(input) {
  const dev = getDeveloper(input.name);
  if (!dev) return { found: false, query: String(input.name || '') };
  return { found: true, developer: pickDeveloper(dev) };
}

function doGetCommunity(input) {
  const c = getCommunity(input.name);
  if (!c) return { found: false, query: String(input.name || '') };
  return { found: true, community: pickCommunity(c) };
}

function doRunMatch(input) {
  const profile = input.profile || {};
  const freeText = String(input.freeText || '');
  let result;
  try {
    result = runMatch(PROJECTS, { ...profile, freeText });
  } catch (e) {
    return { error: 'match_failed' };
  }
  // 编号只在真正生成匹配时分配（简报卡与完整报告共用）。
  const matches = (result.matches || []).map((m) => ({
    name: m.name,
    matchScore: m.matchScore,
    reasons: m.reasons,
  }));
  const reportId = createReport({ profile, intro: result.intro, matches, gvPath: result.gvPath });
  // profile 一并回传前端：供简报卡/完整报告页做客户画像 §1 与本地持久化
  // （画像为对话提炼、非敏感；项目/开发商/社区详情由落地页从三库现场取）。
  return { reportId, intro: result.intro, matches, gvPath: result.gvPath, profile };
}
