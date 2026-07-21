// ============================================================
// /projects/[slug] 路由段 layout — Tilal 共享静态样式挂载点（第3棒 CSS 共享化）
// ------------------------------------------------------------
// LEO 2026-07-12 批：全部 1705 个项目详情页统一走 ProjectLandingTilal（见同目录
// page.jsx），此前 TILAL_CSS（约 24KB）以 <style dangerouslySetInnerHTML> 内联
// 注入每次 SSR 输出，等于每页多出一份完整样式表。改为 Next App Router 的路由段
// 级 CSS import：样式只在 /projects/[slug] 及其子路由请求时随 <link> 加载一次
// （浏览器可跨页缓存），不进入全站 globals.css，也不影响 /、/developers、
// /communities 等其他路由的产物体积。
// tilal.css 内容与 components/projectLandingTilal.styles.js 的 TILAL_CSS 逐字节
// 一致（见该文件顶部脚注）；styles.js 保留导出仅供 v5-guardrail 静扫比对，
// 视觉零变化 —— 组件不再内联注入，此 layout 是样式唯一挂载点。
// ============================================================
import './tilal.css';

export default function ProjectSlugLayout({ children }) {
  return children;
}
