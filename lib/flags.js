// ============================================================
// 特性开关（1.0 简化改造 · 三步走）
// ------------------------------------------------------------
// NEXT_PUBLIC_* 前缀 → 同时对前端与服务端可见（编译期内联）。
// 默认策略（1.0 上线态，省 API 成本）：
//   · AI 自由对话      = 关（第三步重新接 AI 时置 true）
//   · 内容板块(精选/VIP) = 关（第二步开放内容时置 true）
// 核心投资漏斗（需求表单 → 本地引擎 → 报告 → 留资）永远在线，不受开关影响。
//
// 判定：显式为字符串 'true' 才启用；未设置 / 其它值 → 关（安全默认）。
// ============================================================
const on = (v) => String(v).toLowerCase() === 'true';

// AI 自由对话（Console 聊天框 / /api/chat / /api/report 的 Dify 路径）
export const ENABLE_AI_CHAT = on(process.env.NEXT_PUBLIC_ENABLE_AI_CHAT);

// 内容板块（精选期房 Projects / VIP 会员 Vip）
export const ENABLE_CONTENT_SECTIONS = on(process.env.NEXT_PUBLIC_ENABLE_CONTENT_SECTIONS);

// ============================================================
// 紧急整改开关（LEO 2026-07-10 定，见 memory 待补 / agent-logs）
// ------------------------------------------------------------
// 常量非 env 驱动：这两项是内容合规问题（非成本/灰度开关），
// 不希望通过环境变量被误开，恢复须显式改代码 + 过评审。
// ============================================================

// 开发商官网 / 项目官网外链展示。LEO 2026-07-10 定，暂不对外展示
// 开发商官网/项目官网外链（landingUrl / developer.website 等）。
// 不含 DXB Interact「查看开发商市场数据」外链（dxb.link）——那是
// 第三方公开市场数据源引用，不属本开关管控范围，继续展示。
export const SHOW_EXTERNAL_DEV_LINKS = false;

// 「下载楼书」按钮。LEO 2026-07-10 定，原实现曾引用内部 Dropbox 资料库链接
// （已从数据层彻底清除）。2026-07-10 素材管线上线后恢复为 true，但**仅当
// assets-manifest.json 有本地 brochure（/brochures/…）时才渲染**——楼书一律
// 走站内本地托管，catalog 的 brochureUrl（可能残留 bit.ly 等外链）不再进入渲染。
// 详见 app/projects/[slug]/page.jsx、components/ReportPage.jsx、ReportCard.jsx。
export const SHOW_BROCHURE = true;
