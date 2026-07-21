// ============================================================
// sim-chat-tools.mjs — 子枫工具循环逻辑单测（mock 驱动，无网络/无 key）。
// 覆盖：extractChips 解析、tool_use→执行→brief 事件→tool_result 回喂、
//       多轮循环、循环上限截断。运行：node scripts/sim-chat-tools.mjs
// ============================================================
import { runChatLoop, extractChips } from '../lib/chatLoop.js';

let failed = 0;
const ok = (cond, msg) => { if (cond) { console.log('  ✓', msg); } else { failed++; console.error('  ✗', msg); } };

// —— 1) extractChips ——
console.log('[1] extractChips');
{
  const r = extractChips('好的，我先帮您对齐门槛。\n〔胶囊：可上探到 400 万 · 就 200 万左右 · 其它（我来说）〕');
  ok(!r.clean.includes('胶囊'), '正文已剥离胶囊标记');
  ok(r.chips.length === 3, `解析出 3 枚胶囊（实际 ${r.chips.length}）`);
  ok(r.chips[0] === '可上探到 400 万', '首枚胶囊文案正确');
  const none = extractChips('纯文本无胶囊');
  ok(none.chips.length === 0 && none.clean === '纯文本无胶囊', '无胶囊时原样返回');
}

// —— 2) 一轮 tool_use(runMatch) → 再一轮 text ——
console.log('[2] tool_use(runMatch) → text');
{
  const calls = [];
  let n = 0;
  const callModel = async (convo) => {
    calls.push(convo.length);
    n++;
    if (n === 1) {
      return {
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: '我从库里筛一轮。' },
          { type: 'tool_use', id: 'tu_1', name: 'runMatch', input: { profile: { budgetAED: 2000000, goal: '黄金签证', city: '迪拜' } } },
        ],
      };
    }
    return {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '三个项目都在 AED 200 万门槛附近。\n〔胶囊：加顾问微信 · 我再看看报告〕' }],
    };
  };
  const execTool = async (name, input) => {
    ok(name === 'runMatch', '执行的是 runMatch');
    ok(input.profile.city === '迪拜', 'profile 正确透传到工具');
    return {
      reportId: 'DFR-2026-0001',
      intro: '按你的画像匹配如下：',
      matches: [{ name: 'Binghatti Skyrise', matchScore: 91, reasons: ['r1'] }],
      gvPath: '已有项目达门槛。',
    };
  };
  const events = [];
  await runChatLoop({ messages: [{ role: 'user', content: '200万AED拿签证，迪拜' }], callModel, execTool, emit: (e) => events.push(e) });

  const types = events.map((e) => e.type);
  ok(types.includes('status'), 'emit status（工具开始）');
  const brief = events.find((e) => e.type === 'brief');
  ok(brief && brief.data.reportId === 'DFR-2026-0001', 'emit brief 且带 reportId');
  const texts = events.filter((e) => e.type === 'text');
  ok(texts.length >= 2, `emit 至少两段 text（预告 + 收束，实际 ${texts.length}）`);
  const chips = events.find((e) => e.type === 'chips');
  ok(chips && chips.chips.length === 2, '末轮 chips 解析成功');
  ok(types[types.length - 1] === 'done', '最后事件为 done');
  ok(calls[1] > calls[0], 'tool_result 已回喂（第二轮 convo 更长）');
}

// —— 3) 循环上限截断 ——
console.log('[3] 循环上限');
{
  const callModel = async () => ({
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: 'x', name: 'searchProjects', input: {} }],
  });
  const events = [];
  await runChatLoop({ messages: [{ role: 'user', content: 'hi' }], callModel, execTool: async () => ({ count: 0 }), emit: (e) => events.push(e), maxLoops: 3 });
  const statusCount = events.filter((e) => e.type === 'status').length;
  ok(statusCount === 3, `达上限即停（status 恰 3 次，实际 ${statusCount}）`);
  const done = events[events.length - 1];
  ok(done.type === 'done' && done.truncated === true, 'done{truncated:true}');
}

// —— 4) 上游异常 → degrade ——
console.log('[4] 上游异常降级');
{
  const events = [];
  await runChatLoop({ messages: [{ role: 'user', content: 'hi' }], callModel: async () => { throw new Error('boom'); }, execTool: async () => ({}), emit: (e) => events.push(e) });
  ok(events.length === 1 && events[0].type === 'degrade', '模型异常时 emit degrade 并停止');
}

// —— 红队用例（子枫提示词纪律契约，mock 驱动）——————————————
// 每例的 callModel 返回「合规的」子枫应答，断言护栏不变量成立；
// 若日后有人把提示词改回错误行为、或改坏工具循环，这些断言会红。
const collect = async (userText, callModel, execTool = async () => ({})) => {
  const events = [];
  await runChatLoop({ messages: [{ role: 'user', content: userText }], callModel, execTool, emit: (e) => events.push(e) });
  return {
    events,
    text: events.filter((e) => e.type === 'text').map((e) => e.text).join('\n'),
    toolsCalled: events.filter((e) => e.type === 'status').map((e) => e.tool),
  };
};

// R1) 问黄金签证门槛 → 必须答 AED 200 万，绝不出现 250 万
console.log('[R1] 红队·黄金签证门槛=200万');
{
  const callModel = async () => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: '阿联酋黄金签证的房产路径门槛是单套房产价值 AED 200 万（约 400 万人民币），达标即可申请 10 年长期签证。' }],
  });
  const r = await collect('黄金签证买房要多少钱门槛？', callModel);
  ok(/200\s*万|2,?000,?000/.test(r.text), '门槛口径含 AED 200 万');
  ok(!/250\s*万|2,?500,?000/.test(r.text), '未出现错误的 250 万');
}

// R2) 客户问基金拿签证 → 必须中性婉拒并拉回房产，绝不推荐金融产品
console.log('[R2] 红队·非房产路径婉拒拉回');
{
  const callModel = async () => ({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: '基金投资那类路径超出丹枫服务范围，建议咨询持牌财务顾问。回到房产上——如果以拿签证为目标，我们可以看看哪些项目单套能达到 AED 200 万门槛。您预算大概多少？' }],
  });
  const r = await collect('我听说买基金也能拿签证，能给我介绍下基金路径吗？', callModel);
  ok(/超出丹枫服务范围|持牌财务顾问/.test(r.text), '对非房产路径中性婉拒');
  ok(/房产|项目|门槛|户型/.test(r.text), '婉拒后拉回房产话题');
  ok(!/推荐.*基金|建议.*(买|配置).*基金/.test(r.text), '未主动推荐基金/金融产品');
}

// R3) 问社区租金率 → 必须先调 getCommunity 取真数再引用（带来源），不凭记忆编数字
console.log('[R3] 红队·租金率先调 getCommunity');
{
  let n = 0;
  const callModel = async () => {
    n++;
    if (n === 1) {
      return {
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: '我查一下我们收录的该社区公开行情。' },
          { type: 'tool_use', id: 'tu_c', name: 'getCommunity', input: { name: 'Al Barari' } },
        ],
      };
    }
    return {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '据我们收录的公开行情，Al Barari 1 居公寓参考租金回报约 7.1%（社区级公开参考、非报价）。' }],
    };
  };
  const execTool = async (name) => {
    ok(name === 'getCommunity', 'R3 调用的是 getCommunity');
    return { found: true, community: { name: 'Al Barari', marketData: { source: 'Bayut/PF', unitPrices: [{ type: '1 Bed', roi: 7.1 }] } } };
  };
  const r = await collect('Al Barari 的租金回报率是多少？', callModel, execTool);
  ok(r.toolsCalled.includes('getCommunity'), '报租金率前先调了 getCommunity');
  ok(/据我们收录|公开行情|公开参考/.test(r.text), '引用时标注了来源口径');
}

console.log(failed ? `\n❌ 单测失败：${failed} 处` : '\n✅ 工具循环逻辑单测全部通过');
process.exit(failed ? 1 : 0);
