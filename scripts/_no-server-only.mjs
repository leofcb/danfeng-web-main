// ESM loader 钩子（仅供 scripts/ai-eval.mjs --live 在 node 直跑时用；生产/Next 构建不经此文件）。
// 干两件事，让 lib/*.js 能脱离 Next 运行时被 node 直接 import：
//   1) 把 `server-only`/`client-only` 守卫替换为空模块；
//   2) 兜底无扩展名/目录相对导入（Next 允许 `./catalog`；node 原生 ESM 不补 .js）。
const EMPTY = 'data:text/javascript,export%20%7B%7D';

export async function resolve(specifier, context, next) {
  if (specifier === 'server-only' || specifier === 'client-only') {
    return { url: EMPTY, shortCircuit: true };
  }
  try {
    return await next(specifier, context);
  } catch (e) {
    // Next 风格无扩展名相对导入 → 逐个补 .js / .mjs / /index.js
    if ((e?.code === 'ERR_MODULE_NOT_FOUND' || e?.code === 'ERR_UNSUPPORTED_DIR_IMPORT')
        && (specifier.startsWith('./') || specifier.startsWith('../'))) {
      for (const cand of [specifier + '.js', specifier + '.mjs', specifier + '/index.js']) {
        try { return await next(cand, context); } catch { /* try next candidate */ }
      }
    }
    throw e;
  }
}
