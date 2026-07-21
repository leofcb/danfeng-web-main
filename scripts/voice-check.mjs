// ============================================================
// voice-check.mjs — 语音输入(STT) 校验：
//   [A] SWC 单文件编译（新旧组件 + 路由 + 纯逻辑层）——沙盒缺 SWC 二进制时优雅跳过（须 Mac 复跑）。
//   [B] voiceCore 纯逻辑 node 单测（mock fetch）：正常 / 无 key / 超大文件 / 限流 / 兜底降级 / 空文本。
// 运行：node scripts/voice-check.mjs      任一断言失败 → 退出码 1。
// ============================================================
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let failed = 0;
const ok = (cond, msg) => { if (cond) { console.log('  ✓', msg); } else { failed++; console.error('  ✗', msg); } };

// ————— A) SWC 单文件编译 —————
console.log('\n[A] SWC 单文件编译（新旧组件 / 路由 / 纯逻辑层）');
const jsxTargets = [
  'components/VoiceInput.jsx',
  'components/Console.jsx',
];
const jsTargets = [
  'lib/voiceCore.js',
  'lib/voiceDetect.js',
  'app/api/voice/route.js',
];
// 注意：next 的 SWC 加载器在找不到本平台原生二进制时会 process.exit(1)（无法 try/catch），
// 会直接杀掉整个测试进程。故先按 platform/arch 判断对应 @next/swc-* 包是否存在，缺则跳过（不触碰 SWC）。
let swc = null;
{
  const NEXT_SWC_DIR = join(ROOT, 'node_modules', '@next');
  const prefix = `swc-${process.platform}-${process.arch}`;
  let hasBinary = false;
  try { hasBinary = readdirSync(NEXT_SWC_DIR).some((d) => d.startsWith(prefix)); } catch { hasBinary = false; }
  if (!hasBinary) {
    console.log(`  ⚠ 本平台(${process.platform}/${process.arch}) 无 @next/swc 原生二进制（沙盒仅带 darwin-arm64）——编译校验跳过，须在 Mac 复跑 \`node scripts/voice-check.mjs\``);
  } else {
    try {
      swc = require('next/dist/build/swc');
      swc.transformSync('const a=1;', { filename: 'probe.js', jsc: { parser: { syntax: 'ecmascript' } } });
    } catch (e) {
      console.log('  ⚠ SWC 加载失败：' + String(e.message).split('\n')[0] + ' —— 编译校验跳过');
      swc = null;
    }
  }
}
if (swc) {
  for (const rel of jsxTargets) {
    try {
      swc.transformSync(readFileSync(join(ROOT, rel), 'utf8'), {
        filename: rel, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
      });
      ok(true, `编译通过 ${rel}`);
    } catch (e) { ok(false, `编译失败 ${rel}: ${String(e.message).split('\n')[0]}`); }
  }
  for (const rel of jsTargets) {
    try {
      swc.transformSync(readFileSync(join(ROOT, rel), 'utf8'), {
        filename: rel, jsc: { parser: { syntax: 'ecmascript', jsx: false }, target: 'es2020' },
      });
      ok(true, `编译通过 ${rel}`);
    } catch (e) { ok(false, `编译失败 ${rel}: ${String(e.message).split('\n')[0]}`); }
  }
}

// ————— B) voiceCore 纯逻辑单测 —————
console.log('\n[B] voiceCore 纯逻辑单测（mock fetch）');
const core = await import('../lib/voiceCore.js');
const { validateAudio, audioFilename, voiceRateLimit, voiceClientIp, runTranscription, _resetVoiceBuckets, MAX_BYTES } = core;

// 构造一个 mock Response
const mockRes = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});
const smallAudio = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

// 1) 正常转写
{
  let sawUrl = '', sawModel = '';
  const fetchImpl = async (url, opts) => {
    sawUrl = url;
    // 从 FormData 读回 model 字段（node 环境 FormData 支持 get）
    try { sawModel = opts.body.get('model'); } catch { sawModel = ''; }
    return mockRes(200, { text: '两百万迪拉姆预算，想办黄金签证' });
  };
  const text = await runTranscription({ apiKey: 'sk-test', bytes: smallAudio, contentType: 'audio/webm;codecs=opus', fetchImpl });
  ok(text === '两百万迪拉姆预算，想办黄金签证', '正常分支：返回转写文本');
  ok(/openai\.com\/v1\/audio\/transcriptions/.test(sawUrl), '正常分支：命中 OpenAI 转写端点');
  ok(sawModel === 'gpt-4o-mini-transcribe', '正常分支：主模型 gpt-4o-mini-transcribe');
}

// 2) 无 key
{
  let threw = null;
  try { await runTranscription({ apiKey: '', bytes: smallAudio, contentType: 'audio/webm', fetchImpl: async () => mockRes(200, { text: 'x' }) }); }
  catch (e) { threw = e; }
  ok(threw && threw.code === 'no_key', '无 key 分支：抛 no_key（路由据此返回 501）');
}

// 3) 超大文件
{
  const v = validateAudio(MAX_BYTES + 1);
  ok(!v.ok && v.status === 413 && v.error === 'too_large', '超大文件分支：validateAudio → 413 too_large');
  const okv = validateAudio(1024);
  ok(okv.ok === true, '正常大小：validateAudio 通过');
  const empty = validateAudio(0);
  ok(!empty.ok && empty.status === 400, '空文件：validateAudio → 400 empty');
}

// 4) 限流
{
  _resetVoiceBuckets();
  const ip = '203.0.113.7';
  let lastOk = true;
  let firstBlockAt = -1;
  for (let i = 0; i < 20; i++) {
    const r = voiceRateLimit(ip);
    if (!r.ok && firstBlockAt < 0) firstBlockAt = i;
    lastOk = r.ok;
  }
  ok(firstBlockAt >= 1 && firstBlockAt <= 12, `限流分支：第 ${firstBlockAt + 1} 次被挡（默认 12/分）`);
  ok(lastOk === false, '限流分支：超额请求被拒');
  // 不同 IP 独立计数
  _resetVoiceBuckets();
  ok(voiceRateLimit('a').ok && voiceRateLimit('b').ok, '限流分支：不同 IP 独立桶');
}

// 5) 兜底降级：主模型 5xx → whisper-1 成功
{
  let n = 0; let models = [];
  const fetchImpl = async (url, opts) => {
    n++;
    try { models.push(opts.body.get('model')); } catch { /* noop */ }
    if (n === 1) return mockRes(500, 'upstream error');
    return mockRes(200, { text: '兜底转写成功' });
  };
  const text = await runTranscription({ apiKey: 'sk-test', bytes: smallAudio, contentType: 'audio/mp4', fetchImpl });
  ok(text === '兜底转写成功', '兜底分支：主模型 5xx → whisper-1 成功');
  ok(models[0] === 'gpt-4o-mini-transcribe' && models[1] === 'whisper-1', '兜底分支：模型顺序 主→whisper-1');
}

// 6) 鉴权错误不浪费兜底（401 直接抛）
{
  let n = 0;
  const fetchImpl = async () => { n++; return mockRes(401, 'invalid key'); };
  let threw = null;
  try { await runTranscription({ apiKey: 'sk-bad', bytes: smallAudio, contentType: 'audio/webm', fetchImpl }); }
  catch (e) { threw = e; }
  ok(threw && threw.status === 401 && n === 1, '鉴权分支：401 直接抛、不重试兜底');
}

// 7) 空文本转写
{
  const fetchImpl = async () => mockRes(200, { text: '   ' });
  const text = await runTranscription({ apiKey: 'sk-test', bytes: smallAudio, contentType: 'audio/webm', fetchImpl });
  ok(text === '', '空文本分支：trim 后为空串（路由回 {text:""}，前端不回填）');
}

// 8) 文件名 / IP 推断
{
  ok(audioFilename('audio/mp4') === 'audio.mp4', 'audioFilename：mp4 → audio.mp4');
  ok(audioFilename('audio/webm;codecs=opus') === 'audio.webm', 'audioFilename：webm → audio.webm');
  const req = { headers: { get: (k) => (k === 'x-forwarded-for' ? '198.51.100.9, 10.0.0.1' : null) } };
  ok(voiceClientIp(req) === '198.51.100.9', 'voiceClientIp：取 x-forwarded-for 首段');
  ok(voiceClientIp({}) === 'unknown', 'voiceClientIp：无 headers → unknown');
}

// ————— C) voiceDetect 前端能力探测纯逻辑单测（mock window / MediaRecorder）—————
// 2026-07-18 补：iPhone/iOS WebKit 按钮不显示 根因修复的回归校验。
console.log('\n[C] voiceDetect 按钮显示判据单测（mock window，覆盖各 UA 场景）');
const { detectVoiceSupport, pickMimeType } = await import('../lib/voiceDetect.js');

const mockGUM = () => Promise.resolve({});

// C1) 完全不支持（老 webview）：无 navigator.mediaDevices → 隐藏
{
  const win = { navigator: {} };
  ok(detectVoiceSupport(win) === false, 'C1：无 mediaDevices → 不支持');
}

// C2) 无 MediaRecorder（如仍不支持录音能力的引擎）→ 隐藏
{
  const win = { navigator: { mediaDevices: { getUserMedia: mockGUM } } }; // 无 window.MediaRecorder
  ok(detectVoiceSupport(win) === false, 'C2：navigator.mediaDevices 有但无 window.MediaRecorder → 不支持');
}

// C3) 有 MediaRecorder 但 isTypeSupported 对所有候选串都返回 false（如仅支持某种小众格式）
//     ——显示判据必须与「支不支持某个具体 mimeType」完全无关：只要 API 存在就显示。
{
  class MR3 { static isTypeSupported() { return false; } }
  const win = { navigator: { mediaDevices: { getUserMedia: mockGUM } }, MediaRecorder: MR3, isSecureContext: true };
  ok(detectVoiceSupport(win) === true, 'C3：MediaRecorder 存在但所有候选 mimeType 均不支持 → 仍然显示（旧 bug 场景）');
  ok(pickMimeType(MR3) === '', 'C3：pickMimeType 全不支持 → 空串，交给浏览器默认');
}

// C4) 回归 iOS WebKit 真实场景：isTypeSupported 对 webm 系列直接抛异常（而非返回 false），
//     对 mp4 返回 true —— 这正是导致旧版按钮永久不渲染的触发条件。
{
  class MR4 {
    static isTypeSupported(t) {
      if (String(t).startsWith('audio/webm')) throw new TypeError('WebKit: type not recognized');
      return t === 'audio/mp4';
    }
  }
  const win = { navigator: { mediaDevices: { getUserMedia: mockGUM } }, MediaRecorder: MR4, isSecureContext: true };
  ok(detectVoiceSupport(win) === true, 'C4：webm 探测抛异常也不影响显示判据（新版按钮仍渲染）');
  ok(pickMimeType(MR4) === 'audio/mp4', 'C4：pickMimeType 吞掉 webm 异常、跳到 mp4（iOS 落点正确）');
}

// C5) 全支持（桌面 Chrome 场景）→ 显示 + 优先选 webm/opus
{
  class MR5 { static isTypeSupported(t) { return t === 'audio/webm;codecs=opus' || t === 'audio/webm'; } }
  const win = { navigator: { mediaDevices: { getUserMedia: mockGUM } }, MediaRecorder: MR5, isSecureContext: true };
  ok(detectVoiceSupport(win) === true, 'C5：全支持场景 → 显示');
  ok(pickMimeType(MR5) === 'audio/webm;codecs=opus', 'C5：pickMimeType 优先选 webm;codecs=opus');
}

// C6) 非安全上下文（HTTP，非 localhost）→ 隐藏
{
  const win = { navigator: { mediaDevices: { getUserMedia: mockGUM } }, MediaRecorder: class { static isTypeSupported() { return true; } }, isSecureContext: false };
  ok(detectVoiceSupport(win) === false, 'C6：isSecureContext===false → 不支持（避免非 HTTPS 下误显示后 getUserMedia 必失败）');
}

// C7) detectVoiceSupport 探测自身异常也不炸穿（防御性兜底）
{
  const win = { navigator: { get mediaDevices() { throw new Error('boom'); } } };
  ok(detectVoiceSupport(win) === false, 'C7：探测过程本身抛异常 → 兜底返回 false，不向上抛');
}

console.log('\n' + (failed === 0 ? '✓ 全部通过' : `✗ ${failed} 项失败`));
process.exit(failed === 0 ? 0 : 1);
