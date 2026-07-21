// ============================================================
// MapleRating — DFP-5 枫叶评分对客组件（方法论第六章 · 6.1）
// ------------------------------------------------------------
// 主视觉 = 🍁×N + 分数 + "DFP-5"。枫叶数由分数机械映射（每 20 分 1 片、
// 每 10 分半片、满分 5 片）。内联 SVG 枫叶，不引外部图标库。
//   - fill="full"  整片（品牌金 #AD8E5F）
//   - fill="half"  半片（左半金、右半灰，linearGradient 硬边 stop 实现）
//   - fill="empty" 空位（灰 #D8CFBE）
// NR / 非 Rated → 组件不渲染任何评分痕迹（返回 null，由调用方处理）。
// 旧版本残留分数（Rated 但 version 非当前）同样返回 null——前端只认
// 当前版本分数（首席官裁决 2026-07-09）；该状态的中性态「评分更新中」
// 文案由调用方在需要展示处自行渲染（见 DevelopersClient 研究库列表 /
// DeveloperRatingCard 详情页评级面板），本组件不越权代言。
//
// 颜色决策（返回首席官备案）：第六章 6.1 未逐字指定叶片用金还是红，
// 仅声明「枫叶符号🍁本身即品牌标识」。据任务约定「若未指定则选金色并
// 说明」——此处叶片采用品牌金 #AD8E5F（墨金红体系里的金），与红色
// CTA/警示语脱开，避免金红同屏抢焦点；文字分数用墨黑、"DFP-5" 用金。
// ============================================================

import { isCurrentDfp5Score } from '@/lib/catalog';

const LEAF_GOLD = '#AD8E5F';
const LEAF_GOLD_DK = '#96784B'; // 描边/暗部，增加叶片辨识度
const LEAF_EMPTY = '#D8CFBE';

// 单枚枫叶 SVG（写实枫叶轮廓路径，viewBox 0 0 24 24）。
// half 用一个渐变：50% 处硬切金→灰。每枚叶用唯一 gradient id 防冲突。
function MapleLeaf({ fill = 'full', size = 18, idx = 0 }) {
  const gid = `mlg-${idx}-${fill}`;
  const leafPath =
    'M12 2.2c.4 1.9.9 3.1 1.9 3.9.5-.5.9-1.2 1-2 .5 1.3.4 2.6-.1 3.7 1-.2 1.9-.7 2.6-1.5' +
    '-.1 1.4-.8 2.6-1.8 3.4 1 .1 2 0 2.9-.5-.7 1.2-1.9 2-3.2 2.3l.6.9 2.6-.3-1.4 1.7' +
    '.7 1.7-2.6-.6-.3 2.9-1.6-2-1.6 2-.3-2.9-2.6.6.7-1.7-1.4-1.7 2.6.3.6-.9' +
    'c-1.3-.3-2.5-1.1-3.2-2.3.9.5 1.9.6 2.9.5-1-.8-1.7-2-1.8-3.4.7.8 1.6 1.3 2.6 1.5' +
    '-.5-1.1-.6-2.4-.1-3.7.1.8.5 1.5 1 2 1-.8 1.5-2 1.9-3.9z';

  let leafFill;
  if (fill === 'full') leafFill = LEAF_GOLD;
  else if (fill === 'empty') leafFill = LEAF_EMPTY;
  else leafFill = `url(#${gid})`; // half

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      {fill === 'half' && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="50%" stopColor={LEAF_GOLD} />
            <stop offset="50%" stopColor={LEAF_EMPTY} />
          </linearGradient>
        </defs>
      )}
      <path
        d={leafPath}
        fill={leafFill}
        stroke={fill === 'empty' ? LEAF_EMPTY : LEAF_GOLD_DK}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 5 槽位枫叶行：按 leaves 值（0.5–5，半片粒度）填充 full/half/empty。
export function MapleLeaves({ leaves, size = 18 }) {
  const n = Math.max(0, Math.min(5, Number(leaves) || 0));
  const full = Math.floor(n);
  const half = n - full >= 0.5 ? 1 : 0;
  const slots = [];
  for (let i = 0; i < 5; i++) {
    let fill = 'empty';
    if (i < full) fill = 'full';
    else if (i === full && half) fill = 'half';
    slots.push(<MapleLeaf key={i} fill={fill} size={size} idx={i} />);
  }
  return (
    <span className="mpl-row" role="img" aria-label={`DFP-5 评分 ${n} 片枫叶`}>
      {slots}
    </span>
  );
}

// 完整一行式评分：🍁×N + 分数 + "DFP-5"。第六章 6.1 主视觉。
// variant="mini" → 仅叶+分、无 "DFP-5" 文字（用于项目卡开发商名旁）。
export default function MapleRating({ dfp5, variant = 'full', size = 18 }) {
  if (!isCurrentDfp5Score(dfp5)) return null; // NR / 旧版残留分数均不展示评分痕迹
  const score = Number(dfp5.score);
  const leaves = Number(dfp5.leaves);
  if (!Number.isFinite(leaves)) return null;
  const scoreTxt = Number.isFinite(score) ? (Math.round(score * 10) / 10).toFixed(1) : null;

  if (variant === 'mini') {
    return (
      <span className="mpl mpl-mini" title={`丹枫内部研究评分 DFP-5：${scoreTxt} 分`}>
        <MapleLeaves leaves={leaves} size={size} />
        {scoreTxt && <span className="mpl-score-mini">{scoreTxt}</span>}
      </span>
    );
  }

  return (
    <span className="mpl mpl-full">
      <MapleLeaves leaves={leaves} size={size} />
      {scoreTxt && <span className="mpl-score">{scoreTxt} 分</span>}
      <span className="mpl-model">DFP-5</span>
    </span>
  );
}
