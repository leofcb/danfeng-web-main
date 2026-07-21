// ============================================================
// guardrail-check.mjs — 价格护栏 + 开发商 CRM 护栏断言
// ------------------------------------------------------------
// A) 项目护栏：扫描 catalog.json 与 raw-board.json，断言不含市场敏感
//    字段键/值模式：primaryPrice / primaryPsf / unitsSold / soldRate /
//    currentPrice / currentPsf / areaPsf（大小写不敏感，含 snake_case 变体）。
// B) 开发商护栏：扫描 developers.json 与 raw-developers.json，断言不含
//    商务 CRM / 内部评级：Registration Status / RENEW STATUS / Priority /
//    四个 rating 列 / Contacts·Deals 关系及 Count / Office Location /
//    DLD SPVs。以「禁列 id」+「禁键名」两层断言（禁词仅作键名匹配，
//    不误伤 trackRecord/blurbCn 自由文本里的英文单词如 operating→rating、
//    build quality、serviced-residence）。
// 任何命中 → 退出码 1 并打印位置。
// ============================================================
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'lib', 'data');
const CONTENT_PROJECTS = join(__dirname, '..', 'content', 'projects');
const CONTENT_DEVELOPERS = join(__dirname, '..', 'content', 'developers');

// 敏感 token（归一化后：去掉 _ - 空格，转小写）
const FORBIDDEN = [
  'primaryprice',
  'primarypsf',
  'unitssold',
  'soldrate',
  'currentprice',
  'currentpsf',
  'areapsf',
];
// 也拦截 Monday 原始敏感列 id
const FORBIDDEN_COLIDS = ['numeric_mm4e8mqe', 'numeric1', 'numeric_mm4es19f'];

function normalize(s) {
  return String(s).toLowerCase().replace(/[_\-\s]/g, '');
}

// —— 开发商 CRM 禁列 id（Monday 板 6350528756 上不得导出的列）——
const DEV_FORBIDDEN_COLIDS = [
  'color8',              // Registration Status
  'color_mkrw9d6g',      // RENEW STATUS
  'dup__of_stage',       // Priority
  'rating_mksmk3jc',     // rating 列
  'rating_mksmzgrw',
  'rating_mksmzrd7',
  'rating_mksmytev',
];
// —— 开发商 CRM 禁词（仅作「键名」匹配，归一化后）——
//    禁词出现在自由文本值里是安全的（英文单词），只有作为字段键
//    才代表 CRM/评级列泄漏。
const DEV_FORBIDDEN_KEYS = [
  'registration', 'registrationstatus',
  'renew', 'renewstatus',
  'priority',
  'rating', 'reputation', 'quality', 'service', 'constructionscore',
  'deal', 'deals', 'dealscount',
  'contact', 'contacts', 'contactscount',
  'commission',
  'officelocation', 'dldspvs',
];

let hits = 0;

// —— 项目护栏（价格敏感）——————————————————————————————
// 全文 token + 列 id + 递归键，三层扫描（原逻辑保持不变）。
const PRICE_FILES = ['catalog.json', 'raw-board.json'];

for (const file of PRICE_FILES) {
  let text;
  try {
    text = readFileSync(join(DATA, file), 'utf8');
  } catch {
    console.error(`[护栏] 缺少文件: ${file}`);
    hits++;
    continue;
  }
  const data = JSON.parse(text);
  const norm = normalize(text);

  // 1) 归一化全文扫描敏感 token
  for (const bad of FORBIDDEN) {
    let idx = norm.indexOf(bad);
    while (idx !== -1) {
      hits++;
      console.error(`[护栏命中] ${file}: 发现敏感模式 "${bad}" (归一化位置 ${idx})`);
      idx = norm.indexOf(bad, idx + 1);
    }
  }

  // 2) 原始文本扫描 Monday 敏感列 id
  for (const cid of FORBIDDEN_COLIDS) {
    if (text.includes(cid)) {
      hits++;
      console.error(`[护栏命中] ${file}: 发现敏感列 id "${cid}"`);
    }
  }

  // 3) 递归 key 扫描（结构层面，防止键名变体）
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        if (FORBIDDEN.includes(normalize(k))) {
          hits++;
          console.error(`[护栏命中] ${file}: 敏感键名 "${k}" @ ${path}`);
        }
        walk(node[k], `${path}.${k}`);
      }
    }
  };
  walk(data, file.replace('.json', ''));

  console.log(`[护栏] 扫描 ${file}: ${Array.isArray(data) ? data.length : '?'} 条`);
}

// —— 开发商护栏（CRM / 内部评级）——————————————————————
// 禁列 id 全文扫描 + 禁键名递归扫描（禁词不误伤自由文本值）。
const DEV_FILES = ['developers.json', 'raw-developers.json'];

for (const file of DEV_FILES) {
  let text;
  try {
    text = readFileSync(join(DATA, file), 'utf8');
  } catch {
    console.error(`[护栏] 缺少文件: ${file}`);
    hits++;
    continue;
  }
  const data = JSON.parse(text);

  // 1) 原始文本扫描 Monday CRM 禁列 id（任何残留即失败）
  for (const cid of DEV_FORBIDDEN_COLIDS) {
    if (text.includes(cid)) {
      hits++;
      console.error(`[护栏命中] ${file}: 发现 CRM 禁列 id "${cid}"`);
    }
  }

  // 2) 递归键名扫描（禁词只作键名匹配，避免误伤 trackRecord/blurbCn）
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        if (DEV_FORBIDDEN_KEYS.includes(normalize(k))) {
          hits++;
          console.error(`[护栏命中] ${file}: CRM 禁键名 "${k}" @ ${path}`);
        }
        walk(node[k], `${path}.${k}`);
      }
    }
  };
  walk(data, file.replace('.json', ''));

  console.log(`[护栏] 扫描 ${file}: ${Array.isArray(data) ? data.length : '?'} 条`);
}

// —— 社区护栏（🔒 市场统计 / CRM / 内部）——————————————
// 板 18420441803 设计原则：AI-readable identity vs 🔒 market 分区。
// 断言：communities.json / raw-communities.json 不含任何 🔒 市场列
//   id（成交量/YoY/中位PSF/去化率/收益率/上新供应/Thin Market），
//   也不含 CRM/内部键名。marketData 子块（户型级公开参考价，待 LEO
//   确认对客展示）暂标记放行——仅校验其为受控结构（有 source/note 标记），
//   不校验其数值键。
const COMM_FILES = ['communities.json', 'raw-communities.json'];

// 🔒 市场列 id（Monday 板 18420441803 上不得导出的列）
const COMM_FORBIDDEN_COLIDS = [
  'color_mm4xkmw4',   // 🔒 Thin Market
  'numeric_mm4x7qrn', // 🔒 Transactions (12M)
  'numeric_mm4xy1ea', // 🔒 Transactions YoY %
  'numeric_mm4xjj7d', // 🔒 Median PSF (AED)
  'numeric_mm4xtesk', // 🔒 Median PSF YoY %
  'numeric_mm4x55md', // 🔒 Upcoming Supply Units
  'numeric_mm4x2k84', // 🔒 Gross Yield %
  'numeric_mm4x7hcg', // 🔒 Gross Yield YoY (pp)
  'numeric_mm4xf4qk', // Sold %(Absorption Rate)—未🔒但属市场统计，同禁
];
// 社区 CRM/内部禁键名（归一化后作键名匹配；不误伤自由文本值，
// 如 blurb/lifestyle 里的英文单词 yield/transaction 等）。
// 注意：marketData 子块内的 salePrice/rent/roi 是 LEO 待确认的公开
// 参考价，不在禁键内（放行）；但顶层若出现 medianpsf/absorption/
// transactions 等市场统计键名即判泄漏。
const COMM_FORBIDDEN_KEYS = [
  'thinmarket',
  'medianpsf', 'medianpsfyoy',
  'transactions', 'transactionsyoy',
  'upcomingsupply', 'supplyunits',
  'grossyield', 'grossyieldyoy', 'absorption', 'absorptionrate', 'soldpct', 'sold',
];

for (const file of COMM_FILES) {
  let text;
  try {
    text = readFileSync(join(DATA, file), 'utf8');
  } catch {
    console.error(`[护栏] 缺少文件: ${file}`);
    hits++;
    continue;
  }
  const data = JSON.parse(text);

  // 1) 原始文本扫描 🔒 市场列 id（任何残留即失败）
  for (const cid of COMM_FORBIDDEN_COLIDS) {
    if (text.includes(cid)) {
      hits++;
      console.error(`[护栏命中] ${file}: 发现 🔒 市场列 id "${cid}"`);
    }
  }

  // 2) 递归键名扫描（禁词只作键名匹配；marketData 子块内价键放行）
  let mdBlocks = 0;
  const walk = (node, path, inMarketData) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`, inMarketData));
    } else if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        const isMd = k === 'marketData';
        if (isMd) {
          mdBlocks++;
          // marketData 子块须带 source/note 标记（受控放行的结构证据）
          const md = node[k];
          if (!md || !md.source || !md.note) {
            hits++;
            console.error(`[护栏命中] ${file}: marketData 子块缺 source/note 标记 @ ${path}.${k}`);
          }
        }
        // 在 marketData 子块内不对价键（salePrice/rent/roi）报警
        if (!inMarketData && !isMd && COMM_FORBIDDEN_KEYS.includes(normalize(k))) {
          hits++;
          console.error(`[护栏命中] ${file}: 市场统计禁键名 "${k}" @ ${path}`);
        }
        walk(node[k], `${path}.${k}`, inMarketData || isMd);
      }
    }
  };
  walk(data, file.replace('.json', ''), false);

  console.log(`[护栏] 扫描 ${file}: ${Array.isArray(data) ? data.length : '?'} 条${file === 'communities.json' ? `（marketData 子块 ${mdBlocks} 个，标记放行）` : ''}`);
}

// —— 素材台账护栏（assets-manifest.json · LEO 2026-07-10 素材管线上线）——————
// 台账内 heroImages/cardImage/brochure 一律只允许「站内本地路径」：
//   · 图片以 /img/ 开头；楼书以 /brochures/ 开头。
//   · 任意 http(s):// 外链 / 协议相对 //host / 非上述前缀 → 判泄漏（防热链开发商
//     图床、防 catalog 残留 bit.ly 等外链混入渲染）。Dropbox 另由下方全量扫描兜底。
const MANIFEST_FILE = join(DATA, 'assets-manifest.json');
if (existsSync(MANIFEST_FILE)) {
  let man;
  try { man = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')); }
  catch { man = null; hits++; console.error('[护栏命中] assets-manifest.json: 解析失败'); }
  if (man) {
    const projs = man.projects || {};
    const isExternal = (v) => typeof v === 'string' && /^(https?:)?\/\//i.test(v);
    const badPrefix = (v, want) => typeof v === 'string' && v.length > 0 && !v.startsWith(want);
    let imgN = 0, broN = 0, vidN = 0;
    const chk = (v, want, kind, slug) => {
      if (v == null) return;
      if (isExternal(v) || badPrefix(v, want)) {
        hits++;
        console.error(`[护栏命中] assets-manifest.json: 非本地 ${kind} "${v}" @ ${slug}（须以 ${want} 开头，禁外链）`);
      }
    };
    for (const [slug, a] of Object.entries(projs)) {
      for (const src of (a.heroImages || [])) { imgN++; chk(src, '/img/', 'heroImage', slug); }
      for (const src of (a.detailImages || [])) { imgN++; chk(src, '/img/', 'detailImage', slug); }
      for (const src of (a.areaImages || [])) { imgN++; chk(src, '/img/', 'areaImage', slug); }
      chk(a.cardImage, '/img/', 'cardImage', slug);
      chk(a.brochureCover, '/img/', 'brochureCover', slug);
      if (a.brochure != null) { broN++; chk(a.brochure, '/brochures/', 'brochure', slug); }
      // —— 路线一：项目氛围短片 heroVideo（src/poster 必须站内本地 /video/ 路径，禁外链）——
      if (a.heroVideo) {
        vidN++;
        chk(a.heroVideo.src, '/video/', 'heroVideo.src', slug);
        chk(a.heroVideo.poster, '/video/', 'heroVideo.poster', slug);
      }
    }
    // —— 开发商段（logo / logoOriginal / 可选 heroImages）——
    const devs = man.developers || {};
    let devLogoN = 0;
    for (const [slug, a] of Object.entries(devs)) {
      if (a.logo != null) { devLogoN++; chk(a.logo, '/img/', 'developer.logo', slug); }
      chk(a.logoOriginal, '/img/', 'developer.logoOriginal', slug);
      for (const src of (a.heroImages || [])) { imgN++; chk(src, '/img/', 'developer.heroImage', slug); }
    }
    // —— 社区段（heroImages / cardImage）——
    const comms = man.communities || {};
    for (const [slug, a] of Object.entries(comms)) {
      for (const src of (a.heroImages || [])) { imgN++; chk(src, '/img/', 'community.heroImage', slug); }
      chk(a.cardImage, '/img/', 'community.cardImage', slug);
    }
    console.log(`[护栏] 扫描 assets-manifest.json: 项目 ${Object.keys(projs).length} 盘 / 开发商 ${Object.keys(devs).length}（logo ${devLogoN}）/ 社区 ${Object.keys(comms).length} · 合计 ${imgN} 图 / ${broN} 楼书 / ${vidN} 短片（图·楼书须 /img·/brochures，短片须 /video）`);
  }
} else {
  console.log('[护栏] assets-manifest.json 不存在，跳过素材台账护栏（管线未跑）');
}

// —— 路线二：项目视频 videoUrl 护栏（catalog.json · 仅放行 youtube 域）——————————
//   catalog.videoUrl 只允许 youtube.com / youtu.be / youtube-nocookie.com；其它域名
//   （尤其 dropbox 内部资料链接）判泄漏、退出码 1。dropbox 另由下方全库全文扫描兜底。
const CATALOG_FILE = join(DATA, 'catalog.json');
if (existsSync(CATALOG_FILE)) {
  let cat = [];
  try { cat = JSON.parse(readFileSync(CATALOG_FILE, 'utf8')); } catch { cat = []; }
  let vUrlN = 0;
  const YT_RE = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;
  for (const p of (Array.isArray(cat) ? cat : [])) {
    if (p && p.videoUrl != null && String(p.videoUrl) !== '') {
      vUrlN++;
      if (!YT_RE.test(String(p.videoUrl))) {
        hits++;
        console.error(`[护栏命中] catalog.json: videoUrl 非 youtube 域 "${p.videoUrl}" @ ${p.name}（路线二只放行 youtube.com/youtu.be，禁 dropbox 等外链）`);
      }
    }
  }
  console.log(`[护栏] 扫描 catalog.json videoUrl: ${vUrlN} 条（均须 youtube 域 · dropbox 键/值另由全库扫描兜底）`);
}

// —— 富内容项目页护栏（content/projects/*.json）——————————————
// 内容官生成的富内容 JSON 只允许「开盘起价示意」口径；断言不含
// 价格敏感 token（primaryPrice/primaryPsf/currentPrice/currentPsf/
// unitsSold/soldRate/areaPsf）与 Monday 敏感列 id。允许 startFromAED /
// startFromLabel（起价示意）——不在禁词内。
if (existsSync(CONTENT_PROJECTS)) {
  const files = readdirSync(CONTENT_PROJECTS).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const text = readFileSync(join(CONTENT_PROJECTS, file), 'utf8');
    const norm = normalize(text);
    const data = JSON.parse(text);

    for (const bad of FORBIDDEN) {
      let idx = norm.indexOf(bad);
      while (idx !== -1) {
        hits++;
        console.error(`[护栏命中] content/projects/${file}: 发现敏感模式 "${bad}"`);
        idx = norm.indexOf(bad, idx + 1);
      }
    }
    for (const cid of FORBIDDEN_COLIDS) {
      if (text.includes(cid)) {
        hits++;
        console.error(`[护栏命中] content/projects/${file}: 发现敏感列 id "${cid}"`);
      }
    }
    const walk = (node, path) => {
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
      } else if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) {
          if (FORBIDDEN.includes(normalize(k))) {
            hits++;
            console.error(`[护栏命中] content/projects/${file}: 敏感键名 "${k}" @ ${path}`);
          }
          walk(node[k], `${path}.${k}`);
        }
      }
    };
    walk(data, file.replace('.json', ''));
    console.log(`[护栏] 扫描 content/projects/${file}: hero ${Array.isArray(data.hero) ? data.hero.length : 0} 图、户型 ${Array.isArray(data.unitTypes) ? data.unitTypes.length : 0} 项（仅起价示意口径）`);
  }
}

// —— 开发商内容层护栏（content/developers/*.json）——————————————
// 内容官生成的叙事内容层只承载研究事实，断言四不：
//   ① 无价格敏感 token（FORBIDDEN）/ Monday 敏感列 id（价格列）；
//   ② 无开发商 CRM 禁列 id / 禁键名（DEV_FORBIDDEN_*）；
//   ③ 无任何外链（http(s):// —— 官网/PF/Bayut/第三方 URL 一律不入内容层，
//      站内互链走 librarySlug → /projects，不含协议头，安全）；
//   ④ 无 dropbox（下方 Dropbox 段一并覆盖）。命中即退出码 1。
if (existsSync(CONTENT_DEVELOPERS)) {
  const files = readdirSync(CONTENT_DEVELOPERS).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const text = readFileSync(join(CONTENT_DEVELOPERS, file), 'utf8');
    const norm = normalize(text);
    const data = JSON.parse(text);

    // ① 价格敏感 token（全文归一化）
    for (const bad of FORBIDDEN) {
      let idx = norm.indexOf(bad);
      while (idx !== -1) {
        hits++;
        console.error(`[护栏命中] content/developers/${file}: 发现价格敏感模式 "${bad}"`);
        idx = norm.indexOf(bad, idx + 1);
      }
    }
    // 价格列 id + 开发商 CRM 禁列 id（全文包含即命中）
    for (const cid of [...FORBIDDEN_COLIDS, ...DEV_FORBIDDEN_COLIDS]) {
      if (text.includes(cid)) {
        hits++;
        console.error(`[护栏命中] content/developers/${file}: 发现敏感列 id "${cid}"`);
      }
    }
    // ③ 外链断言
    if (/https?:\/\//i.test(text)) {
      hits++;
      console.error(`[护栏命中] content/developers/${file}: 发现外链 "http(s)://"（内容层禁止任何外部 URL）`);
    }
    // ② 敏感键名（价格 token + 开发商 CRM 禁键，归一化键名匹配）
    const walk = (node, path) => {
      if (Array.isArray(node)) {
        node.forEach((v, i) => walk(v, `${path}[${i}]`));
      } else if (node && typeof node === 'object') {
        for (const k of Object.keys(node)) {
          const nk = normalize(k);
          if (FORBIDDEN.includes(nk) || DEV_FORBIDDEN_KEYS.includes(nk)) {
            hits++;
            console.error(`[护栏命中] content/developers/${file}: 敏感键名 "${k}" @ ${path}`);
          }
          walk(node[k], `${path}.${k}`);
        }
      }
    };
    walk(data, file.replace('.json', ''));
    console.log(`[护栏] 扫描 content/developers/${file}: 里程碑 ${Array.isArray(data.milestones) ? data.milestones.length : 0} 条、代表作 ${Array.isArray(data.flagships) ? data.flagships.length : 0} 个（叙事事实层 · 零价格 · 零外链）`);
  }
} else {
  console.log('[护栏] content/developers 目录不存在，跳过开发商内容层护栏');
}

// —— Dropbox 内部资料护栏（LEO 2026-07-10 紧急整改指令）——————————
// Dropbox 链接=内部资料库，绝不允许出现在前端数据层任何文件：
//   1) 全文包含 "dropbox.com"（不区分大小写，覆盖任意字段值里的直链残留）；
//   2) 任意 JSON 键名归一化后等于 "dropbox"（即便值已清空，键名本身也代表
//      内部列泄漏进前端数据层，一律不允许——彻底移除该键，而非仅清空）。
// 扫描范围：lib/data/*.json（顶层导出文件，跳过 .tmp-*/_export_v2/_raw_parts*
// 等已 gitignore 的构建期临时目录）+ content/projects/*.json。
const dataTopLevelJson = readdirSync(DATA).filter((f) => f.endsWith('.json'));
function scanDropbox(fullPath, label) {
  let text;
  try {
    text = readFileSync(fullPath, 'utf8');
  } catch {
    return;
  }
  if (/dropbox\.com/i.test(text)) {
    hits++;
    console.error(`[护栏命中] ${label}: 发现 "dropbox.com" 内部资料链接残留`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return; // 非 JSON 文件 / 解析失败，键名扫描跳过（全文扫描已覆盖）
  }
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node && typeof node === 'object') {
      for (const k of Object.keys(node)) {
        if (normalize(k) === 'dropbox') {
          hits++;
          console.error(`[护栏命中] ${label}: 发现 "dropbox" 键名 @ ${path}.${k}（应彻底删除该键，而非仅清空值）`);
        }
        walk(node[k], `${path}.${k}`);
      }
    }
  };
  walk(data, label);
}
for (const file of dataTopLevelJson) scanDropbox(join(DATA, file), `lib/data/${file}`);
if (existsSync(CONTENT_PROJECTS)) {
  for (const file of readdirSync(CONTENT_PROJECTS).filter((f) => f.endsWith('.json'))) {
    scanDropbox(join(CONTENT_PROJECTS, file), `content/projects/${file}`);
  }
}
if (existsSync(CONTENT_DEVELOPERS)) {
  for (const file of readdirSync(CONTENT_DEVELOPERS).filter((f) => f.endsWith('.json'))) {
    scanDropbox(join(CONTENT_DEVELOPERS, file), `content/developers/${file}`);
  }
}
console.log(`[护栏] Dropbox 内部资料扫描: lib/data/*.json ${dataTopLevelJson.length} 个 + content/projects/*.json + content/developers/*.json`);

if (hits > 0) {
  console.error(`\n❌ 护栏断言失败：命中 ${hits} 处敏感字段。`);
  process.exit(1);
}
console.log('\n✅ 护栏断言通过：无市场敏感字段（起价/PSF/去化率）+ 无开发商 CRM/评级列 + 无社区 🔒 市场统计列（marketData 户型参考价子块已标记放行，待 LEO 确认对客展示）+ 无 Dropbox 内部资料链接/键名。');
