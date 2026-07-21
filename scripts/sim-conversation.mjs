// 模拟三条对话路径，产出 profile 跑 runMatch，验证与引擎兼容 + 跳过=中性。
// 复用 lib/conversationScript.js 的分支条件与映射（单一真相），不另抄逻辑。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runMatch } from '../lib/match.js';
import { NODES, buildCtx, visibleNodes, budgetMeetsGV } from '../lib/conversationScript.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG = JSON.parse(readFileSync(join(__dirname, '..', 'lib', 'data', 'catalog.json'), 'utf8'));

const N = (id) => NODES.find((n) => n.id === id);
const emptyProfile = () => ({ budget: '', budgetAED: '', goal: '', city: '', regions: [], types: [], beds: [], risk: '', handover: '', payment: [], prefs: [] });

// answers: { nodeId: <picked option value | '__skip__' | array | '__aed__:NUM'> }
// wantMore: 分叉是否选「更多偏好」。
function drive(answers, wantMore) {
  const p = emptyProfile();
  const route = { wantMore };
  const trail = [];
  // 迭代可见节点序列，逐个应用答案（模拟 advanceTo + answer*）。
  let guard = 0;
  while (guard++ < 60) {
    const ctx = buildCtx(p, route);
    const vis = visibleNodes(ctx);
    // 找第一个尚未处理的节点。
    const done = new Set(trail);
    const cur = vis.find((n) => !done.has(n.id));
    if (!cur) break;
    trail.push(cur.id);
    if (cur.kind === 'info' || cur.kind === 'fork') continue; // fork 由 wantMore 已表达
    const a = answers[cur.id];
    if (a === undefined || a === '__skip__') {
      // 跳过 → 中性默认
      if (cur.field) {
        if (cur.kind === 'multi' || cur.kind === 'region') p[cur.field] = [];
        else p[cur.field] = cur.skipValue != null ? cur.skipValue : '';
      }
      continue;
    }
    if (typeof a === 'string' && a.startsWith('__aed__:')) {
      p.budgetAED = a.split(':')[1]; p.budget = '';
      continue;
    }
    if (cur.kind === 'single') {
      let val = a;
      if (a === '__keep__') val = p[cur.field] || '';
      if (cur.id === 'B1') { p.budget = val; p.budgetAED = ''; }
      else p[cur.field] = val;
    } else if (cur.kind === 'multi' || cur.kind === 'region') {
      p[cur.field] = Array.isArray(a) ? a : [a];
    }
  }
  return { profile: p, trail };
}

function report(label, answers, wantMore) {
  const { profile, trail } = drive(answers, wantMore);
  const r = runMatch(CATALOG, profile);
  console.log(`\n===== ${label} =====`);
  console.log('路径节点:', trail.join(' → '));
  console.log('profile:', JSON.stringify(profile));
  console.log('matches:', r.matches.length, '→', r.matches.map((m) => `${m.name}(${m.matchScore})`).join(' | '));
  console.log('gvPath:', r.gvPath.slice(0, 40) + '…');
  console.log('reasons[0]:', (r.matches[0]?.reasons || []).join(' / '));
  // 断言：至少 1 匹配、分数 45–98、intro 用动态 PROJECTS.length
  const ok = r.matches.length >= 1
    && r.matches.every((m) => m.matchScore >= 45 && m.matchScore <= 98)
    && r.intro.includes(String(CATALOG.length));
  console.log('ASSERT ok:', ok);
  return ok;
}

let all = true;

// 路径 A：最短 5 击（主干全选，不触发分支，Q3=不限 → Q3b 跳过，分叉=直接生成）
all &= report('路径A · 最短(5击)', {
  Q1: '300–500万', Q2: '资本增值', Q3: '不限', Q3b: '__skip__', Q4: '__skip__', Q5: '不限',
}, false);

// 路径 B：黄金签证分支（预算未达 → B1 触发；上调；Q3b 选社区；补充更多偏好）
all &= report('路径B · 黄金签证分支', {
  Q1: 'AED 200万以下', Q2: '黄金签证', B1: '300–500万',
  Q3: '迪拜', Q3b: ['Dubai Creek Harbour', 'Downtown Dubai'],
  Q4: ['公寓'], Q5: '3年以上',
  A1: ['2居', '3居'], A2: ['交付后付款'], A3: ['临海水岸', '品牌豪宅'],
}, true);

// 路径 C：全跳过（每题暂不确定；分叉=直接生成）
all &= report('路径C · 全跳过', {
  Q1: '__skip__', Q2: '__skip__', Q3: '__skip__', Q3b: '__skip__', Q4: '__skip__', Q5: '__skip__',
}, false);

// 额外：租金收益 → B2 持有周期分支验证
all &= report('路径D · 租金收益(B2)', {
  Q1: '200–300万', Q2: '租金收益', B2: '进取', Q3: '迪拜', Q3b: '__skip__', Q4: ['公寓'], Q5: '不限',
}, false);

console.log('\n=========================');
console.log('ALL PATHS OK:', !!all);
process.exit(all ? 0 : 1);
