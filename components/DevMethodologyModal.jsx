'use client';

// ============================================================
// DevMethodologyModal — DFP-5 方法论弹层（设计规格 §3）
// 公开到「维度级」权重与数据来源，指标级参数不披露（保护方法论资产）。
// MethodologyContent 为纯展示体，同时供锚点页 /developers/methodology 复用。
// 受控组件：<DevMethodologyModal open onClose/>，多处触发共享一个 open 态。
// ============================================================

import { useEffect } from 'react';

// 五维 + 维度级权重（对客公开；指标级阈值不公开）。
const PILLARS = [
  ['a', '交付履约', 30, '交付规模、工期表现与准时率'],
  ['b', '市场表现', 30, '转售增值与期房去化（DXB Interact 交易口径）'],
  ['c', '规模趋势', 20, '在建规模与销售动能（YTD）'],
  ['d', '法律合规', 10, '监管账户注册率（合规口径，非资金安全承诺）'],
  ['e', '历史背景', 10, '实体背景与经营时长'],
];

export function MethodologyContent() {
  return (
    <div className="dmm-body">
      <p className="dmm-lead">
        <b>DFP-5（Danfeng Five-Pillar）</b> 是丹枫内部的开发商研究评级，定位为「研究所口径」——
        每一分都可复算，原始数据来自 <b>Dubai Land Department 登记</b> 与 <b>DXB Interact 交易口径</b>，
        辅以丹枫内部研究整理。取数日随每次评级版本标注。
      </p>

      <h4 className="dmm-h">五维十指标框架 · 维度级权重</h4>
      <div className="dmm-pillars">
        {PILLARS.map(([k, label, w, desc]) => (
          <div className="dmm-pillar" key={k}>
            <div className="dmm-pl-head">
              <span className="dmm-pl-k">{k.toUpperCase()}</span>
              <span className="dmm-pl-name">{label}</span>
              <span className="dmm-pl-w">{w}%</span>
            </div>
            <div className="dmm-pl-bar"><i style={{ width: w * 2.6 + '%' }} /></div>
            <div className="dmm-pl-desc">{desc}</div>
          </div>
        ))}
      </div>
      <p className="dmm-note">
        权重公开到维度级；每维之下约两个指标，<b>指标级具体阈值与归一公式属丹枫研究资产，不予披露</b>
        （避免被逆向刷分）。
      </p>

      <h4 className="dmm-h">打分方式</h4>
      <p>
        零基客观打分：各维归一到 0–100，按上表权重加权得综合分（0–100），再机械映射为 🍁×N 徽标
        （每 20 分 1 片、每 10 分半片，满分 5 片）。分数与徽标一一对应，不做人工微调。
      </p>

      <h4 className="dmm-h">置信度 / 覆盖率</h4>
      <p>
        <b>覆盖率</b> = 可得数据占应得数据的比例；<b>置信度</b> = 样本充分度（High / Medium / Low）。
        样本不足处如实标注、不硬凑分数。
      </p>

      <h4 className="dmm-h">NR（未评级）的含义</h4>
      <p>
        NR = 尚未纳入 DFP-5 评级覆盖，多因公开数据不足；<b>不代表负面评价</b>。NR 家仍提供完整的
        公开市场事实（交易量 / 销售额 / 资本增值 / 去化 / 在建规模），评级覆盖持续扩容中。
      </p>

      <p className="dmm-compliance">
        DFP-5 为丹枫内部研究评分，仅供研究参考，<b>非信用违约评级</b>，不构成投资建议，不担保任何回报。
      </p>
    </div>
  );
}

export default function DevMethodologyModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="dmm-mask" onClick={onClose}>
      <div className="dmm-panel" role="dialog" aria-modal="true" aria-label="DFP-5 方法论" onClick={(e) => e.stopPropagation()}>
        <div className="dmm-head">
          <div>
            <span className="dmm-eyebrow">方法论 · Methodology</span>
            <h3>DFP-5 独立开发商评级 · 如何计算</h3>
          </div>
          <button className="dmm-x" onClick={onClose} aria-label="关闭">✕</button>
        </div>
        <div className="dmm-scroll">
          <MethodologyContent />
        </div>
      </div>
    </div>
  );
}
