'use client';

// ============================================================
// VoiceInput — 对话输入区麦克风按钮（原生 MediaRecorder，无第三方库）。
// ------------------------------------------------------------
// 点按开始录音（再点停止；录音中脉冲动画 + 计时），60 秒硬上限自动停。
// 停止 → 打包 blob → POST /api/voice → 拿纯文本，经 onTranscript 回填输入框
// （不自动发送，客户可改可删）。失败/超时/被拒 → onError(code)（父层 toast）。
//
// 优雅降级三层（文字输入永远兜底，语音故障对对话主链路零影响）：
//   a) 浏览器不支持 MediaRecorder/getUserMedia（老 webview）→ 按钮不渲染。
//   b) 服务端无 key：首屏 GET /api/voice 探活 501 → 隐藏；或 POST 遇 501 后即隐藏。
//   c) 麦克风权限被拒 → onError('mic_denied')，提示去浏览器设置开启。
//
// 2026-07-18 根因修复（iPhone/iOS WebKit 按钮不显示）：
//   旧版在「挂载时能力探测」这一个 effect 里，紧接着同步调用了 pickMimeType()
//   （内部逐个跑 MediaRecorder.isTypeSupported('audio/webm;codecs=opus' 等)），
//   两者写在同一段不受 try/catch 保护的代码里。部分 WebKit 版本对
//   isTypeSupported() 传入某些候选 MIME 串时会抛异常而非返回 false
//   （桌面 Chromium 恒定返回布尔值、从不抛）——一旦抛出，setSupported(true)
//   就再也不会被执行到，按钮永久不渲染，且被吞进 React effect 的未捕获异常里，
//   页面其余部分（聊天主链路）看不出任何异常，非常隐蔽。
//   修复：① 显示判定（detectVoiceSupport）与「选哪个 mimeType」彻底解耦，
//   前者只做零风险的 typeof/属性存在性检查，不再调用 isTypeSupported；
//   ② pickMimeType 挪到真正开始录音那一刻才调用，且每个候选串单独 try/catch，
//   单个候选串出错只跳过、不影响其它候选/不影响按钮是否显示；
//   ③ 两个函数搬进无 JSX 的 lib/voiceDetect.js（纯函数），可在 node 里直接
//   import + mock window/MediaRecorder 单测，无需 SWC/JSX 编译。
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { detectVoiceSupport, pickMimeType } from '@/lib/voiceDetect';

const MAX_MS = 60 * 1000;         // 录音硬上限 60 秒
const MAX_BYTES = 5 * 1024 * 1024; // 与服务端一致
const POST_TIMEOUT_MS = 30 * 1000; // 转写请求超时
const PROBE_RETRY_DELAY_MS = 1200; // 探活首次失败后的一次性重试延迟（iOS 偶发网络抖动兜底）

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="8.5" y1="21" x2="15.5" y2="21" />
    </svg>
  );
}

export default function VoiceInput({ onTranscript, onError, disabled = false }) {
  const [supported, setSupported] = useState(false);
  const [available, setAvailable] = useState(null); // null 探测中 / true 可用 / false 隐藏
  const [state, setState] = useState('idle');        // idle | recording | processing
  const [elapsed, setElapsed] = useState(0);

  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const capRef = useRef(null);
  const mimeRef = useRef('');
  const startAtRef = useRef(0);

  const fail = useCallback((code) => { if (typeof onError === 'function') onError(code); }, [onError]);

  // —— 降级 a：能力探测（不支持则整颗按钮不渲染）——
  // 只调用零风险的 detectVoiceSupport；不在这里选 mimeType，避免被
  // isTypeSupported() 在个别 WebKit 版本上的异常连累（详见文件头根因说明）。
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(detectVoiceSupport(window));
  }, []);

  // —— 降级 b：服务端探活（无 key → 501 → 隐藏）——
  // 首次失败（网络抖动/iOS 偶发 fetch 失败）重试一次，再失败才判定隐藏，
  // 避免把瞬时网络问题误判成「服务端无 key」。
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    let retried = false;
    const probe = () => {
      fetch('/api/voice', { method: 'GET' })
        .then((r) => { if (!cancelled) setAvailable(r.ok); })
        .catch(() => {
          if (cancelled) return;
          if (!retried) { retried = true; setTimeout(probe, PROBE_RETRY_DELAY_MS); }
          else setAvailable(false);
        });
    };
    probe();
    return () => { cancelled = true; };
  }, [supported]);

  const cleanup = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (capRef.current) { clearTimeout(capRef.current); capRef.current = null; }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
      streamRef.current = null;
    }
    recRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const transcribe = useCallback(async (blob) => {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), POST_TIMEOUT_MS);
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'content-type': blob.type || 'audio/webm' },
        body: blob,
        signal: ctrl.signal,
      });
      if (res.status === 501) { setAvailable(false); return; } // key 被撤 → 静默隐藏
      if (!res.ok) { fail(res.status === 429 ? 'rate_limit' : 'failed'); return; }
      const data = await res.json().catch(() => null);
      const text = data && typeof data.text === 'string' ? data.text.trim() : '';
      if (text) { if (typeof onTranscript === 'function') onTranscript(text); }
      else fail('empty');
    } catch {
      fail('failed'); // 超时(abort)/网络错误统一走 toast
    } finally {
      clearTimeout(to);
      setState('idle');
    }
  }, [onTranscript, fail]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch { /* noop */ } }
  }, []);

  const start = useCallback(async () => {
    if (state !== 'idle' || disabled) return;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      fail('mic_denied'); // 降级 c：权限被拒
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    mimeRef.current = pickMimeType(); // 真正开录这一刻才选编码格式，与按钮显示判定彻底解耦

    let rec;
    try {
      rec = mimeRef.current
        ? new MediaRecorder(stream, { mimeType: mimeRef.current })
        : new MediaRecorder(stream);
    } catch {
      try { rec = new MediaRecorder(stream); } catch { cleanup(); fail('failed'); return; }
    }
    recRef.current = rec;

    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      cleanup();
      const type = mimeRef.current || (chunksRef.current[0] && chunksRef.current[0].type) || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      if (!blob.size) { setState('idle'); return; }
      if (blob.size > MAX_BYTES) { setState('idle'); fail('too_large'); return; }
      setState('processing');
      await transcribe(blob);
    };

    setElapsed(0);
    startAtRef.current = Date.now();
    try { rec.start(); } catch { cleanup(); fail('failed'); return; }
    setState('recording');
    tickRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startAtRef.current) / 1000));
    }, 250);
    capRef.current = setTimeout(() => stop(), MAX_MS); // 60s 硬上限自动停
  }, [state, disabled, fail, cleanup, transcribe, stop]);

  const onClick = useCallback(() => {
    if (state === 'recording') stop();
    else if (state === 'idle') start();
  }, [state, stop, start]);

  // 降级 a / b：不支持或无 key → 不渲染（对话主链路零影响）。
  if (!supported || available === false) return null;

  const rec = state === 'recording';
  const proc = state === 'processing';
  const label = rec ? '停止录音' : proc ? '识别中' : '语音输入';
  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <button
      type="button"
      className={'voice-btn' + (rec ? ' recording' : '') + (proc ? ' processing' : '')}
      onClick={onClick}
      disabled={disabled || proc || available === null}
      aria-label={label}
      aria-pressed={rec}
      title={label}
    >
      {proc ? (
        <span className="voice-spin" aria-hidden="true" />
      ) : rec ? (
        <span className="voice-live">
          <span className="voice-dot" aria-hidden="true" />{`${mm}:${ss}`}
        </span>
      ) : (
        <MicIcon />
      )}
    </button>
  );
}
