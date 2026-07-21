// ============================================================
// ai-eval.mjs — 子枫 AI 回归评测集运行器（枫智首单，2026-07-19）。
// ------------------------------------------------------------
// 双模式：
//   [默认 · 离线结构检查] 不花钱、沙盒可跑、部署门禁：
//     A) 源码不变量——把历史6类事故+边界固化为对 lib/*.js 源文本的静态断言；
//     B) cases.json 良构 + 事故分类全覆盖矩阵。
//     任一断言失败 → 退出码 1（= 不准部署）。
//   [--live · 实调模式] 需 ANTHROPIC_API_KEY，真跑对话断言输出（LEO 本机）：
//     用真实 systemPrompt/tools/haiku 驱动 cases.json，校验 must/mustNot/工具时机，
//     结束打印实测 token 花费。
//
// 运行：
//   node scripts/ai-eval.mjs            # 离线结构门禁（默认，不花钱，沙盒/CI 可跑）
//   --live 实调：打本机真实 /api/chat（测真链路，含工具循环/SSE/降级/限流）。分两终端：
//     终端①  cd danfeng-web && NEXT_PUBLIC_ENABLE_AI_CHAT=true npm run dev
//            （.env.local 里放 ANTHROPIC_API_KEY=sk-...；dev 会自动读 .env.local）
//     终端②  node scripts/ai-eval.mjs --live
//   附加：--only=GV,INJ 只跑某些 id 前缀； --case=INJ-02 只跑单例；
//        EVAL_BASE_URL=http://localhost:3001 换端口。
// 说明：live 走 HTTP，不再 import lib，故彻底无 server-only / Next 解析问题；
//       _no-server-only.mjs 已弃用（可删）。
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const argv = process.argv.slice(2);
const LIVE = argv.includes('--live');
const onlyArg = (argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';
const caseArg = (argv.find((a) => a.startsWith('--case=')) || '').split('=')[1] || '';
const ONLY = onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter(Boolean) : [];

let failed = 0;
const ok = (cond, msg) => { if (cond) console.log('  ✓', msg); else { failed++; console.error('  ✗', msg); } };
const rx = (s) => new RegExp(s, 'iu');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// —— 载入用例集 —————————————————————————————————————————————
let SUITE;
try { SUITE = JSON.parse(read('tests/ai-evals/cases.json')); }
catch (e) { console.error('✗ 无法读取/解析 tests/ai-evals/cases.json：', e.message); process.exit(1); }
let CASES = SUITE.cases || [];
if (ONLY.length) CASES = CASES.filter((c) => ONLY.some((p) => c.id.startsWith(p)));
if (caseArg) CASES = CASES.filter((c) => c.id === caseArg);

// ============================================================
// 离线 A) 源码不变量——每条对应一类历史事故 / 硬边界
// ============================================================
function offlineStructural() {
  console.log('\n[A] 源码不变量（把事故档案钉进 lib/*.js）');
  const sp = read('lib/systemPrompt.js');
  const tl = read('lib/tools.js');
  const vc = read('lib/voiceCore.js');

  // A1 硬事实卡·黄金签证门槛
  ok(/AED\s*2,?000,?000|2,000,000/.test(sp), 'A1 systemPrompt 明示门槛 AED 2,000,000');
  ok(/绝不.*250|不.*说成.*250/.test(sp), 'A1 systemPrompt 显式禁止“250万”口误');

  // A2 业务边界·不导流金融/非房产签证路径
  ok(/绝不.*(引导|主动).*(基金|存款|理财|保险|股票)/.test(sp), 'A2 systemPrompt 禁止导流基金/理财等非房产路径');
  ok(/超出.*(丹枫)?.*服务范围|持牌财务顾问/.test(sp), 'A2 systemPrompt 备有中性婉拒话术');

  // A3 数字纪律·先取真数再引用
  ok(/getCommunity/.test(sp) && /标注来源|据我们收录|标注.*来源/.test(sp), 'A3 systemPrompt 要求社区数字先调 getCommunity 且标来源');
  ok(/绝不凭(记忆|训练).*(报|百分比|价格)|不可编造/.test(sp), 'A3 systemPrompt 禁止凭记忆报数字');

  // A4 人设边界 & 简体
  ok(/子枫（Dan）|自称.*子枫/.test(sp), 'A4 systemPrompt 定人设「子枫（Dan）」');
  ok(/简体中文/.test(sp), 'A4 systemPrompt 要求简体中文输出');
  ok(/简体铁律|无论.*(繁体|简繁).*简体|绝不输出繁体/.test(sp), 'A4 systemPrompt 含「简体铁律」（繁体输入也一律简体作答）');

  // A5 项目层面·不到单元 & 不担保
  ok(/绝不.*(涉及|到).*(单元|楼层|朝向|房源)/.test(sp), 'A5 systemPrompt 只到项目层面、不碰单元/楼层');
  ok(/不担保.*回报|不构成.*(投资|法律|税务).*意见/.test(sp), 'A5 systemPrompt 不担保回报/不构成投资意见');

  // A6 runMatch 口头预告 & 触发门槛
  ok(/runMatch.*(前|先).*(口头)?预告|从库里筛一轮/.test(sp), 'A6 systemPrompt 要求 runMatch 前口头预告');

  // A7 四工具齐备
  for (const t of ['searchProjects', 'getDeveloper', 'getCommunity', 'runMatch']) {
    ok(new RegExp(`name:\\s*'${t}'`).test(tl), `A7 tools.js 定义了工具 ${t}`);
  }

  // A8 售罄盘不入检索（searchProjects 过滤 sold）
  ok(/filter\([^)]*!\/sold\/i\.test/.test(tl) || /!\/sold\/i\.test\(p\.status/.test(tl), 'A8 doSearch 过滤 sold 项目');

  // A9 白名单防泄漏——分函数体扫禁字段（第二道闸）
  const slice = (from, to) => {
    const i = tl.indexOf(from); if (i < 0) return '';
    const j = to ? tl.indexOf(to, i + from.length) : tl.length;
    return tl.slice(i, j < 0 ? tl.length : j);
  };
  const projBody = slice('function pickProjectSummary', 'function pickDeveloper');
  const commBody = slice('function pickCommunity', 'function handoverHit');
  ok(projBody && !/priceAED|psf|\bPSF\b|unitsSold|去化|佣金|commission|配额|quota|primary/i.test(projBody),
    'A9 pickProjectSummary 不外泄实时价/PSF/去化/佣金/配额/内部字段');
  ok(commBody && /ALLOW_COMM_PRICES/.test(commBody),
    'A9 pickCommunity 的社区参考价受 ALLOW_COMM_PRICES 门控（可一键收回）');
  ok(commBody && !/psf|\bPSF\b|priceAED|佣金|commission|去化/i.test(commBody),
    'A9 pickCommunity 不外泄 PSF/佣金/去化');
  ok(/website 不给模型|website.*不.*(展示|给)/.test(tl), 'A9 tools.js 显式不把开发商官网外链交给模型');

  // A10 STT 简体偏置 + 领域词（语音转写繁体事故）
  ok(/STT_PROMPT\s*=/.test(vc), 'A10 voiceCore 定义 STT_PROMPT');
  ok(/简体中文/.test(vc) && /黄金签证|迪拉姆|户型/.test(vc), 'A10 STT_PROMPT 含简体偏置 + 地产领域词');
  ok(/language\s*=\s*'zh'|language = 'zh'/.test(vc), 'A10 STT 默认 language=zh（中英混说）');
}

// ============================================================
// 离线 B) cases.json 良构 + 事故分类全覆盖
// ============================================================
function offlineCases() {
  console.log('\n[B] cases.json 良构与覆盖矩阵');
  ok(Array.isArray(SUITE.cases) && SUITE.cases.length >= 20, `B1 用例数 ≥ 20（当前 ${SUITE.cases?.length ?? 0}）`);
  const ids = new Set();
  let wellformed = true;
  for (const c of SUITE.cases) {
    if (!c.id || ids.has(c.id)) { wellformed = false; break; }
    ids.add(c.id);
    if (!c.category || !c.input) { wellformed = false; break; }
    for (const k of ['must', 'mustNot']) {
      if (c[k] && !Array.isArray(c[k])) { wellformed = false; break; }
      for (const p of c[k] || []) { try { rx(p); } catch { wellformed = false; } }
    }
  }
  ok(wellformed, 'B2 每例有唯一 id/category/input，且 must/mustNot 正则可编译');

  const present = new Set(SUITE.cases.map((c) => c.category));
  const required = SUITE.meta?.categoriesRequired || [];
  const missing = required.filter((r) => !present.has(r));
  ok(missing.length === 0, `B3 事故分类全覆盖（缺：${missing.join('、') || '无'}）`);

  // B4 关键防线至少各有一例
  const need = { 'gv-threshold': 2, 'business-boundary': 2, 'prompt-injection': 3, 'number-discipline': 1 };
  for (const [cat, n] of Object.entries(need)) {
    const got = SUITE.cases.filter((c) => c.category === cat).length;
    ok(got >= n, `B4 分类「${cat}」用例数 ≥ ${n}（当前 ${got}）`);
  }
}

// ============================================================
// --live 实调
// ============================================================
const TRAD = /[請問報樓價錢區資買賣證顧適個門檻項長體產經雙灣號]/; // 繁体判别（简体输出纪律）
function assertCase(c, out) {
  const fails = [];
  const text = out.text || '';
  for (const p of c.must || []) if (!rx(p).test(text)) fails.push(`must 未命中 /${p}/`);
  for (const p of c.mustNot || []) if (rx(p).test(text)) fails.push(`mustNot 命中 /${p}/`);
  if (c.expectTool && !out.toolsCalled.includes(c.expectTool)) fails.push(`未调用应调工具 ${c.expectTool}`);
  if (c.forbidTool && out.toolsCalled.includes(c.forbidTool)) fails.push(`调用了禁用工具 ${c.forbidTool}`);
  if (typeof c.maxQuestions === 'number') {
    const q = (text.match(/？|\?/g) || []).length;
    if (q > c.maxQuestions) fails.push(`本轮追问 ${q} 个 > 上限 ${c.maxQuestions}`);
  }
  if (TRAD.test(text)) fails.push('输出疑似繁体（违反简体纪律）');
  return fails;
}

const BASE = process.env.EVAL_BASE_URL || 'http://localhost:3000';

// 打真实 /api/chat：一次 POST = 一个用户轮（服务端跑完整工具循环并 SSE 流式回）。
// 前端契约同 route.js：body={messages:[{role,content}...]}；非 SSE 的 JSON 响应=降级信号。
async function chatTurn(messages) {
  let res;
  try {
    res = await fetch(BASE + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    return { netErr: String(e.message).split('\n')[0] };
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const j = await res.json().catch(() => ({}));
    return { degrade: j.reason || `http_${res.status}` };
  }
  const raw = await res.text(); // 顺序执行，读到流关闭即得完整轮
  const out = { text: '', chips: [], tools: [], brief: null, degrade: null };
  for (const line of raw.split('\n')) {
    const s = line.trim();
    if (!s.startsWith('data:')) continue;
    let e; try { e = JSON.parse(s.slice(5).trim()); } catch { continue; }
    if (e.type === 'text') out.text += (out.text ? '\n' : '') + (e.text || '');
    else if (e.type === 'status') out.tools.push(e.tool);
    else if (e.type === 'brief') out.brief = e.data;
    else if (e.type === 'chips') out.chips.push(...(e.chips || []));
    else if (e.type === 'degrade') out.degrade = e.reason;
  }
  return out;
}

async function preflight() {
  console.log(`\n[live] 目标端点：${BASE}/api/chat`);
  const r = await chatTurn([{ role: 'user', content: '你好' }]);
  if (r.netErr) {
    console.error(`  ✗ 连不上 ${BASE}：${r.netErr}`);
    console.error('    先在另一个终端启动本机服务：');
    console.error('      cd danfeng-web && NEXT_PUBLIC_ENABLE_AI_CHAT=true npm run dev');
    console.error('    并确保 .env.local 里有 ANTHROPIC_API_KEY。换端口用 EVAL_BASE_URL=http://localhost:3001 前缀。');
    process.exit(1);
  }
  if (r.degrade) {
    console.error(`  ✗ 接口降级（reason=${r.degrade}）——AI 对话未真正启用，无法做行为断言。`);
    if (r.degrade === 'rate_limit') console.error('    命中限流（默认 60 次/小时）：稍等一会再跑，或临时调 lib/ratelimit.js。');
    else console.error('    .env.local 需 ANTHROPIC_API_KEY=sk-... 且启动带 NEXT_PUBLIC_ENABLE_AI_CHAT=true，然后重启 npm run dev。');
    process.exit(1);
  }
  console.log('  ✓ 端点在线且 AI 对话已启用');
}

async function runLive() {
  await preflight();
  console.log(`\n[live] 实调 ${CASES.length} 例（真链路 /api/chat · SSE）\n`);
  const records = [];
  for (const c of CASES) {
    const turns = Array.isArray(c.input) ? c.input : [c.input];
    const convo = [];
    const out = { text: '', toolsCalled: [], degrade: null };
    for (const t of turns) {
      convo.push({ role: 'user', content: String(t) });
      const r = await chatTurn(convo);
      if (r.netErr) { out.degrade = 'net:' + r.netErr; break; }
      if (r.degrade) { out.degrade = r.degrade; break; }
      out.text = r.text;                       // 断言作用于最后一轮的合并作答
      out.toolsCalled.push(...r.tools);        // 工具调用跨轮累计
      convo.push({ role: 'assistant', content: r.text || '' });
    }
    const fails = out.degrade ? [`接口降级/异常：${out.degrade}`] : assertCase(c, out);
    records.push({ id: c.id, category: c.category, title: c.title, ok: fails.length === 0, fails, tools: out.toolsCalled, text: out.text, degrade: out.degrade });
    if (fails.length === 0) console.log(`  ✓ ${c.id} ${c.title}`);
    else {
      failed++;
      console.error(`  ✗ ${c.id} ${c.title}`);
      for (const f of fails) console.error('      · ' + f);
      // 失败即回放子枫原话 + 实调工具，便于判断“真犯规”还是“断言太死”。
      console.error('      ┈ 实际作答：' + (out.text ? out.text.replace(/\s*\n\s*/g, ' ⏎ ').slice(0, 300) : '(空)'));
      console.error('      ┈ 实调工具：' + (out.toolsCalled.length ? out.toolsCalled.join(', ') : '(无)'));
    }
  }
  // 全量落盘（含每例子枫原话），供离线复盘/回归对比。
  try {
    const dir = join(ROOT, 'agent-logs');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'ai-eval-last.json'), JSON.stringify({ when: new Date().toISOString(), base: BASE, total: CASES.length, failed, records }, null, 2));
    console.log(`\n[live] 明细已落盘：agent-logs/ai-eval-last.json（含每例子枫原话，可直接发我复盘）`);
  } catch (e) { console.error('  ⚠ 落盘失败：', String(e.message).split('\n')[0]); }

  // —— 花费估算（HTTP 链路不回传 usage，按经验值粗估；以 Anthropic 账单为准）——
  const perCaseTok = 3500;                     // 估：system+tools(缓存后)~2K in + 工具回合 + 输出 ≈ 3.5K/例
  const P_BLEND = 2.0, USD_CNY = 7.3;          // 假设 Haiku 混合单价 ~$2/百万tok；汇率 7.3
  const usd = (CASES.length * perCaseTok / 1e6) * P_BLEND;
  console.log(`\n[live] 花费粗估：约 ¥${(usd * USD_CNY).toFixed(2)}（${CASES.length} 例 × ~${perCaseTok} tok × 假设 $${P_BLEND}/百万tok；仅估算，精确成本看 Anthropic 后台本次用量）`);
}

// ============================================================
// 主流程
// ============================================================
console.log(`丹枫 · 子枫 AI 回归评测集 v${SUITE.meta?.version || '?'}  |  模式：${LIVE ? 'LIVE 实调' : '离线结构检查'}  |  用例 ${CASES.length}`);
if (!LIVE) {
  offlineStructural();
  offlineCases();
  console.log('\n[提示] 离线模式只验证“护栏结构在场”，不验证模型真实措辞。');
  console.log('       行为断言在本机跑：终端①启动 NEXT_PUBLIC_ENABLE_AI_CHAT=true npm run dev，终端② node scripts/ai-eval.mjs --live');
} else {
  await runLive();
}
console.log('\n' + (failed === 0 ? '✅ 全绿' : `❌ ${failed} 项失败`));
process.exit(failed === 0 ? 0 : 1);
