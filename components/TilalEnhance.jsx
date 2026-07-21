'use client';
// ============================================================
// TilalEnhance — Tilal 暗调影院母版交互增强（母版原 <script> 的 React 安全实现）
// ------------------------------------------------------------
// 母版原方案：IntersectionObserver 让 .reveal 进入视口时加 .in 上滑淡入。
// 纯 DOM、无任何数据/catalog 依赖，故拆为独立 client 组件（不把 catalog 打进
// 客户端包）。作用域限定在 .tilal 容器内，不影响全站其它元素。
// ============================================================
import { useEffect } from 'react';

export default function TilalEnhance() {
  useEffect(() => {
    const root = document.querySelector('.tilal');
    const els = root ? root.querySelectorAll('.reveal') : [];
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      els.forEach((el) => io.observe(el));
    } else {
      els.forEach((el) => el.classList.add('in'));
    }
    return () => { if (io) io.disconnect(); };
  }, []);
  return null;
}
