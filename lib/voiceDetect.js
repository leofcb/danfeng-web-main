// ============================================================
// voiceDetect.js — VoiceInput 按钮能力探测的纯逻辑层。
// ------------------------------------------------------------
// 单独抽成无 JSX 的纯 JS 文件两个原因：
//   1) 可以直接被 node 单测 import（无需 SWC/JSX 编译），覆盖各 UA mock 场景；
//   2) 让「按钮是否显示」与「录音时选哪个 mimeType」在物理文件层面就分离，
//      不会被同一个 effect/同一段代码意外耦合在一起。
//
// 2026-07-18 根因（iPhone/iOS WebKit 按钮不显示）：
//   旧版把「挂载时能力探测」和 pickMimeType()（内部逐个跑
//   MediaRecorder.isTypeSupported('audio/webm;codecs=opus' 等)）写在同一段
//   没有 try/catch 保护的代码里，且顺序上 pickMimeType() 先于 setSupported(true)。
//   部分 WebKit 版本对某些候选 MIME 串调用 isTypeSupported() 时会抛异常而不是
//   返回 false（桌面 Chromium 恒定返回布尔值、从不抛）——一旦抛出，
//   setSupported(true) 就再也执行不到，按钮永久不渲染；异常被吞进 React effect
//   里，页面其余部分（聊天主链路）完全正常，非常隐蔽，也解释了「桌面 Chrome 正常
//   /iPhone（含 WebKit 内核的 iOS Chrome）不显示」这个跨引擎的显示差异。
// ============================================================

// —— 按钮是否渲染的唯一判据 ——
// 只回答「这个引擎有没有录音能力」，绝不触碰任何具体编码格式/isTypeSupported，
// 因此不会被某个 WebKit 版本对特定候选 MIME 串的探测异常连累。
export function detectVoiceSupport(win) {
  try {
    if (!win || typeof win !== 'object') return false;
    const nav = win.navigator;
    if (!nav || !nav.mediaDevices || typeof nav.mediaDevices.getUserMedia !== 'function') return false;
    if (typeof win.MediaRecorder === 'undefined') return false;
    if (win.isSecureContext === false) return false; // 显式非安全上下文才拦截；未设置时放行（兼容测试 mock）
    return true;
  } catch {
    return false; // 探测本身出岔子 → 保守隐藏，绝不让异常炸穿组件（这正是旧实现的坑）
  }
}

// —— 选一个浏览器支持的音频容器 ——
// 仅在实际开始录音时调用（与按钮是否显示完全解耦）：Chrome/Firefox → webm/opus；
// Safari/iOS WebKit → mp4/aac。每个候选串单独 try/catch：部分 WebKit 版本对个别
// 候选串会抛异常而非返回 false，出错就跳过换下一个，不让整条探测链路中断。
export function pickMimeType(MediaRecorderRef) {
  const Rec = MediaRecorderRef
    || (typeof MediaRecorder !== 'undefined' ? MediaRecorder : undefined);
  if (!Rec || typeof Rec.isTypeSupported !== 'function') return '';
  const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];
  for (const c of cands) {
    try { if (Rec.isTypeSupported(c)) return c; } catch { /* 该候选串探测异常，跳过试下一个 */ }
  }
  return ''; // 全部候选不支持/探测失败 → 交给浏览器默认（new MediaRecorder(stream) 不传 mimeType）
}
