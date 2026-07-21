// ============================================================
// DevRadar — DFP-5 五维雷达图（内联 SVG，不引图表库 · 设计规格 §2.2）
// 五轴 a–e（交付履约/市场表现/规模趋势/法律合规/历史背景），值域 0–100。
// 纯展示组件（无 hooks）。默认配色贴合浅色评级面板（品牌金填充+描边）。
// 无效维度按 0 计（不硬凑），全维缺失则返回 null（调用方降级为条形）。
// ============================================================

const AXES = [
  ['a', '交付履约'],
  ['b', '市场表现'],
  ['c', '规模趋势'],
  ['d', '法律合规'],
  ['e', '历史背景'],
];
const GOLD = '#AD8E5F';
const GRID = '#e0d6c2';

// 极坐标 → 直角坐标（顶点在正上方，顺时针 72° 步进）。
function pt(cx, cy, r, i) {
  const ang = (-90 + i * 72) * (Math.PI / 180);
  return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
}

export default function DevRadar({ dims, size = 240 }) {
  if (!dims) return null;
  const vals = AXES.map(([k]) => {
    const v = Number(dims[k]);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  });
  if (vals.every((v) => v === 0)) return null;

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34; // 留白给标签

  // 网格环（4 圈：25/50/75/100）。
  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    AXES.map((_, i) => pt(cx, cy, maxR * f, i).map((n) => n.toFixed(1)).join(',')).join(' ')
  );
  // 数据多边形。
  const dataPoly = vals
    .map((v, i) => pt(cx, cy, maxR * (v / 100), i).map((n) => n.toFixed(1)).join(','))
    .join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="DFP-5 五维雷达图"
      style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}
    >
      {/* 网格环 */}
      {rings.map((poly, i) => (
        <polygon key={i} points={poly} fill="none" stroke={GRID} strokeWidth="1" />
      ))}
      {/* 轴线 */}
      {AXES.map((_, i) => {
        const [x, y] = pt(cx, cy, maxR, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={GRID} strokeWidth="1" />;
      })}
      {/* 数据面 */}
      <polygon points={dataPoly} fill={GOLD} fillOpacity="0.22" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" />
      {/* 数据点 */}
      {vals.map((v, i) => {
        const [x, y] = pt(cx, cy, maxR * (v / 100), i);
        return <circle key={i} cx={x} cy={y} r="3" fill={GOLD} />;
      })}
      {/* 轴标签 + 分值 */}
      {AXES.map(([k, label], i) => {
        const [lx, ly] = pt(cx, cy, maxR + 20, i);
        const anchor = Math.abs(lx - cx) < 6 ? 'middle' : lx > cx ? 'start' : 'end';
        return (
          <g key={k}>
            <text
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="600"
              fill="#4a4339"
              fontFamily='"Noto Sans SC",sans-serif'
            >
              {label}
            </text>
            <text
              x={lx}
              y={ly + 13}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="10.5"
              fill={GOLD}
              fontFamily='"Manrope",system-ui,sans-serif'
              fontWeight="700"
            >
              {Math.round(vals[i] * 10) / 10}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
