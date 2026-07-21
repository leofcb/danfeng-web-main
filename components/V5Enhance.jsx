'use client';
// ============================================================
// V5Enhance — v5 落地页交互增强（忠实移植 v5 内联 <script>）
// ------------------------------------------------------------
// ①滚动 >18px 给 .cwv5 nav 加 .scrolled 描边；②IntersectionObserver
// 让 .reveal 进入视口时加 .in 上滑淡入。纯 DOM，无任何数据/catalog 依赖，
// 故拆为独立 client 组件，避免把 catalog.json 打进客户端包。
// 作用域限定在 .cwv5 容器内，不影响全站其它元素。
// ============================================================
import { useEffect } from 'react';

export default function V5Enhance() {
  useEffect(() => {
    const root = document.querySelector('.cwv5');
    const nav = root && root.querySelector('nav');
    const onScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 18); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const els = root ? root.querySelectorAll('.reveal') : [];
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.1 });
      els.forEach((el) => io.observe(el));
    } else {
      els.forEach((el) => el.classList.add('in'));
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (io) io.disconnect();
    };
  }, []);
  return null;
}
