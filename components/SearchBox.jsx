'use client';

// ============================================================
// 列表页搜索框（/projects /developers /communities 共用 · 纯客户端）
// ------------------------------------------------------------
// value/onChange 走「防抖」：本地 state 即时回显输入，200ms 后才把值
// 上抛给父组件（父组件驱动过滤 + URL ?q= 保态），避免每敲一下键就触发
// 一次全量过滤 + history.replaceState。
// ============================================================

import { useEffect, useRef, useState } from 'react';

export default function SearchBox({ value, onChange, placeholder, className = '' }) {
  const [local, setLocal] = useState(value || '');
  const timer = useRef(null);

  // 外部值变化（如「重置」按钮清空 f.q）时同步本地回显。
  useEffect(() => { setLocal(value || ''); }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocal(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 200);
  };
  const clear = () => {
    setLocal('');
    if (timer.current) clearTimeout(timer.current);
    onChange('');
  };

  return (
    <div className={'pp-search ' + className}>
      <svg className="pp-search-ic" viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.6" />
        <line x1="13.2" y1="13.2" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        inputMode="search"
        className="pp-search-input"
        value={local}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {local && (
        <button type="button" className="pp-search-clear" onClick={clear} aria-label="清空搜索">×</button>
      )}
    </div>
  );
}
