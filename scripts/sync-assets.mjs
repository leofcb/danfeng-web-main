// ============================================================
// sync-assets.mjs — 丹枫素材同步管线（本地缓存优先 + Monday 台账对账）
// ------------------------------------------------------------
// 三类素材（2026-07-11 扩展）：
//   · 项目：图 + 楼书 PDF   → public/img/projects/<slug>/ + public/brochures/
//   · 开发商：logo(+可选 hero) → public/img/developers/<slug>/
//   · 社区：图片            → public/img/communities/<slug>/
//
// 在 LEO 的 Mac 上运行（有外网 + 可落盘 + 已 `npm i`）：
//   · 本地模式（默认）      : node scripts/sync-assets.mjs
//   · Monday 对账模式       : node scripts/sync-assets.mjs --from-monday
//   · 强制重压（忽略缓存）  : 追加 --force
//
// 【素材缓存目录约定】（可用环境变量覆盖，详见 ASSETS-README.md）
//   emaar-ingest/downloads/<项目名>/          项目图（<category>__…）+ 楼书 PDF
//   emaar-ingest/developers/<品牌名>/          logo.png|jpg|svg|webp（+ 可选 hero-*.jpg）
//   emaar-ingest/communities/<社区名>/         *.jpg|png|webp（建议 01_ 02_ 命名定序）
//
// 【本地模式】文件夹名（下划线→空格）模糊匹配对应维表（既有归一/别名思路）：
//   项目→catalog.json / 开发商→developers.json / 社区→communities.json；失配列报告，不硬配。
//   · 项目图：hero 1920w q80 / card 640w q75 webp；楼书 PDF ≤15MB（gs /ebook 兜底）。
//   · 开发商 logo：png/jpg 压 240w webp（保留 alpha 透明底）+ 保留原格式一份；svg 原样拷贝；
//     可选 hero 图走项目同规则（1920w q80）。
//   · 社区图：hero 1920w q80 + card 640w q75 webp（同 ProjectCard 模式）。
//   · 生成/更新 lib/data/assets-manifest.json（三段 projects/developers/communities，幂等可重跑）。
//
// 【Monday 对账模式 --from-monday】三板分别分页对账（需环境变量 MONDAY_TOKEN，仅 Mac 端可跑）：
//   · 项目板 3916277144：Hero Images=file_mm54knz0 / Brochure=file_mm54anat（既有）。
//   · 开发商板 6350528756 / 社区板 18420441803：文件列 id 运行时探测（get_board_info /
//     columns 找 type=file 的列）；找不到该板文件列 → 报告「板上素材列未建」并跳过。
//   public_url 有时效，脚本内立即下载 → 走与本地模式同一压缩管线。
//
// 护栏：manifest 内只写站内本地路径（/img/… 与 /brochures/…），绝不写外链/Dropbox
//   （三段 projects/developers/communities 均由 scripts/guardrail-check.mjs 断言）。
// ============================================================
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync,
  statSync, copyFileSync, rmSync, renameSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');                       // danfeng-web/
const DATA = join(ROOT, 'lib', 'data');
const CATALOG_JSON = join(DATA, 'catalog.json');
const DEVELOPERS_JSON = join(DATA, 'developers.json');
const COMMUNITIES_JSON = join(DATA, 'communities.json');
const MANIFEST_JSON = join(DATA, 'assets-manifest.json');
const PUBLIC_IMG = join(ROOT, 'public', 'img', 'projects');
const PUBLIC_IMG_DEV = join(ROOT, 'public', 'img', 'developers');
const PUBLIC_IMG_COMM = join(ROOT, 'public', 'img', 'communities');
const PUBLIC_BRO = join(ROOT, 'public', 'brochures');
const LOG_DIR = join(ROOT, 'agent-logs');
// 素材缓存根：emaar-ingest 与 danfeng-web 同级（各类可用专属环境变量覆盖）。
const INGEST_ROOT = process.env.DANFENG_INGEST || join(ROOT, '..', 'emaar-ingest');
const DOWNLOADS = process.env.DANFENG_DOWNLOADS || join(INGEST_ROOT, 'downloads');
const DEVELOPERS_DIR = process.env.DANFENG_DEVELOPERS || join(INGEST_ROOT, 'developers');
const COMMUNITIES_DIR = process.env.DANFENG_COMMUNITIES || join(INGEST_ROOT, 'communities');

// ============================================================
// 2026-07-12 内容官落盘结构适配 —— downloads/ 下的非「项目子文件夹」素材
// ------------------------------------------------------------
// 内容官的实际落盘和 ASSETS-README 原始约定（一项目一文件夹）不同：
//   · 开发商 logo：downloads/dev-logos/ 下是「一品牌一文件」的扁平目录
//     （如 azizi.png、al_habtoor.png），不是 emaar-ingest/developers/<品牌>/logo.*
//     的老约定（那个目录当前并不存在）。
//   · 社区图：downloads/community-heroes*（6 个来源文件夹）也是扁平文件，
//     不是 emaar-ingest/communities/<社区>/ 的老约定（同样不存在）。
//   · 部分开发商官网/图库素材（azizi、binghatti、damac、damac-gallery、
//     ellington、meraas、sobha）落在 downloads/ 顶层，但内部不是「项目子
//     文件夹」，而是各源站自己的原始文件名（部分含项目名线索，部分不含）。
// 下面的常量 + runLocalDevLogosFlat / runLocalCommunityHeroesFlat /
// runLocalDamacFolder / runLocalBinghattiFolder 是新增的专用管线；
// NONPROJECT_TOPLEVEL_DIRS 让 runLocal()（项目段扫描）跳过这些文件夹，
// 不再把它们当「未匹配到 catalog 项目」的失配噪音上报。
// ============================================================
const DEV_LOGOS_DIRNAME = 'dev-logos';
// 优先级从高到低（同一社区多来源撞图时，前者胜出——见 runLocalCommunityHeroesFlat 注释）：
//   1) community-heroes            —— 无 ID 后缀的早期手工精选批次（26 张，覆盖热门社区，
//                                      判断为人工把关过的首选图，质量与取景优先信任）
//   2) community-heroes-developer  —— 开发商项目页抓取（一手资料，186 张，覆盖面最广）
//   3) community-heroes-bayut      —— Bayut 门户社区图（7 张，第三方但专业地产媒体）
//   4) community-heroes-provident  —— Provident 门户社区图（仅 1 张，样本太少排后）
//   5) community-heroes-wiki       —— 维基百科配图（仅 1 张，版式/清晰度不一定适合官网）
//   6) community-heroes-unsplash   —— Unsplash 通用图库（29 张，非实景，纯兜底）
const COMMUNITY_HERO_DIRNAMES = [
  'community-heroes',
  'community-heroes-developer',
  'community-heroes-bayut',
  'community-heroes-provident',
  'community-heroes-wiki',
  'community-heroes-unsplash',
];
// 文件名规则足够确定、值得解析后并入项目段扫描的开发商图库文件夹：
const DAMAC_DIRNAME = 'damac';                   // projects-<slug>.jpg / communities-<c>-projects-<slug>.jpg（规则单一、确定性强）
const BINGHATTI_DIRNAME = 'binghatti';           // <project-token>-<category>-<n>.ext（前缀 token 可精确匹配 catalog）
// 侦察后判定「文件名规则不统一 / 仅远程 URL 清单 / 缺 ID 映射」，暂不解析，
// 仅在 NONPROJECT_TOPLEVEL_DIRS 里跳过噪音 + 报告写清楚原因（不強配）：
const SKIP_TOPLEVEL_NOTES = {
  azizi: 'azizi/ 只有 project-image-map.json（项目名→远程 URL 清单），没有已下载的本地图片文件；需先落盘再同步，暂跳过',
  sobha: 'sobha/ 同上：仅 project-image-map.json 远程 URL 清单，无本地文件，暂跳过',
  ellington: 'ellington/ 本地文件名为 ellington-<PF-ID>-<裁切代号>.ext（如 ellington-8113289466-highgrove.jpg 尚可读，但更多是 as-1/sd/l3-1 这类裁切代号），无法从文件名可靠解析项目名；配套 project-image-map.json 是 name→slug→远程URL，但未带本地文件 ID，两者未打通；建议后续按 project-image-map 的 name 落盘为「项目名/图1.jpg」子文件夹（与现有项目段扫描天然兼容）后重跑，暂跳过',
  meraas: 'meraas/ 同 ellington：本地文件名多为营销文案/裁切代号（如 Villa_Amalfi_-_TG___4、BWR_-_TG___2、l3-1），非规范项目名，自动解析误配风险高，暂跳过；建议同样改走 project-image-map 落盘规范',
  'damac-gallery': 'damac-gallery/ 文件名规则不统一（damac-<id>-<n>-<Name>-Gallery-<n> 与 <id>-<slug>-Amenities-<n>-<desc> 等至少 3 种模式混杂，1330 个文件），强行单一正则解析误配风险高，暂跳过；已按确定性规则解析的 damac/ 文件夹（projects-<slug> 命名）已并入项目段，见 runLocalDamacFolder',
  'pf-brochures': 'pf-brochures/covers/<PF监听ID>/0..5.jpg 是 Property Finder 楼书封面截图；当前无 PF-ID→项目 slug 对照表，暂跳过；如需接入需先补映射',
  'dxb-supply': 'dxb-supply/ 文件名为 dxb-<ID>--<...>.ext（DXB 供给追踪器图），文件名不含项目名/slug 线索，暂跳过；如需接入需先补 DXB-ID→项目映射',
};
const NONPROJECT_TOPLEVEL_DIRS = new Set([
  DEV_LOGOS_DIRNAME, ...COMMUNITY_HERO_DIRNAMES,
  DAMAC_DIRNAME, BINGHATTI_DIRNAME,
  ...Object.keys(SKIP_TOPLEVEL_NOTES),
]);

const ARGS = new Set(process.argv.slice(2));
const FROM_MONDAY = ARGS.has('--from-monday');
const FORCE = ARGS.has('--force');
// 仅处理单个文件夹（如 `--only=Altan`）；缺省处理全部。
const ONLY_ARG = [...ARGS].find((a) => a.startsWith('--only='));
const ONLY = ONLY_ARG ? ONLY_ARG.split('=').slice(1).join('=').trim() : null;

const MAX_BROCHURE_MB = 15;
const MAX_HERO = 12;
// —— 分类感知（2026-07-11）：按文件名前缀 `<category>__…` 落位到不同 manifest 键 ——
//   hero_carousel / exterior          → heroImages（首屏图集，轮播序号优先）
//   interior / feature_block          → detailImages（产品细节章图文块）
//   attraction_district               → areaImages（地段/社区生活章配图）
//   brochure_cover                    → brochureCover（楼书封面单键，不入图集）
//   card.webp                         → hero_carousel 第一张（无则首张 hero）
//   无前缀旧文件夹（Creek Waters 等）  → 全部进 heroImages（保持既有行为，不回归）
const HERO_CATS = ['hero_carousel', 'exterior'];
const DETAIL_CATS = ['interior', 'feature_block'];
const AREA_CATS = ['attraction_district'];
const COVER_CATS = ['brochure_cover'];
const NONGALLERY_CATS = new Set([...COVER_CATS, 'og_image']); // 封面/OG 不进 hero 兜底
const IMG_RE = /\.(jpe?g|png|webp)$/i;
// 开发商 logo / hero 文件识别（本地文件夹约定）。
const LOGO_RE = /^logo\.(png|jpe?g|svg|webp)$/i;
const DEV_HERO_RE = /^hero[-_].*\.(jpe?g|png|webp)$/i;

// —— 路线一：项目首屏氛围短片（自托管）——（2026-07-13）
//   项目文件夹内 `video_hero_*.{mp4,mov,webm}` → ffmpeg 转码静音 720p h264 +faststart，
//   目标 ≤5MB（crf 自适应，28 起步），抽首帧出 poster.webp；落
//   public/video/<slug>/hero.mp4 + poster.webp，manifest 项目条目加
//   heroVideo:{src,poster}（均站内本地 /video/ 路径，护栏断言）。
//   护栏门槛：源视频 > 60 秒，或转码后仍 > 8MB → 跳过并报告建议剪辑（同楼书 15MB 上限思路）。
const VIDEO_HERO_RE = /^video_hero_.*\.(mp4|mov|webm)$/i;
const VIDEO_MAX_SECONDS = 60;      // 源片 > 60s 判过长，跳过并建议剪辑
const VIDEO_TARGET_MB = 5;         // 转码目标体积（crf 自适应逼近）
const VIDEO_HARD_MB = 8;           // 转码后仍 > 8MB → 跳过并报告
const PUBLIC_VIDEO = join(ROOT, 'public', 'video');

// —— 压缩后端：sharp 优先（Mac 端 `npm i` 后原生可用），缺失则回退 ImageMagick
//    `convert`（沙盒/受限环境无 sharp 时仍能实跑压图）；两者皆无 → map-only 干跑。——
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  // 回退：用 createRequire 解析（会参考 NODE_PATH），便于受限环境验证。
  try {
    const { createRequire } = await import('node:module');
    sharp = createRequire(import.meta.url)('sharp');
  } catch { sharp = null; }
}
let hasConvert = false;
if (!sharp) {
  try { execSync('command -v convert', { stdio: 'ignore' }); hasConvert = true; } catch { hasConvert = false; }
}
const ENCODER = sharp ? 'sharp' : (hasConvert ? 'imagemagick' : null);
const DRY = !ENCODER;

// —— 视频后端：ffmpeg / ffprobe（沙盒自带；Mac 端若缺则 `brew install ffmpeg`）——
//    与 sharp 干跑同思路：缺 ffmpeg 时不转码（不写 heroVideo），并在报告里提示安装命令。
let hasFfmpeg = false;
let hasFfprobe = false;
try { execSync('command -v ffmpeg', { stdio: 'ignore' }); hasFfmpeg = true; } catch { hasFfmpeg = false; }
try { execSync('command -v ffprobe', { stdio: 'ignore' }); hasFfprobe = true; } catch { hasFfprobe = false; }

// ============================================================
// slug 归一 —— 与 lib/catalog.js 完全一致（slugify + 去重后缀）
// ============================================================
function slugify(name) {
  return String(name || '')
    .toLowerCase().trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}
const CATALOG = JSON.parse(readFileSync(CATALOG_JSON, 'utf8'));
const _bySlug = new Map();       // slug -> project
const _byName = new Map();       // 归一名 -> slug
const normName = (s) => String(s || '').toLowerCase().replace(/[\s_]+/g, ' ').trim();
for (const p of CATALOG) {
  let s = slugify(p.name);
  if (_bySlug.has(s)) {
    let i = 2;
    while (_bySlug.has(`${s}-${i}`)) i++;
    s = `${s}-${i}`;
  }
  p.__slug = s;
  _bySlug.set(s, p);
  _byName.set(normName(p.name), s);
}

// 文件夹名 → 项目 slug（1 精确名 → 2 slugify → 失配）。
function matchFolder(folder) {
  const candName = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const byName = _byName.get(normName(candName));
  if (byName) return byName;
  const s = slugify(candName);
  if (_bySlug.has(s)) return s;
  return null;
}

// ============================================================
// 开发商归一 —— 与 lib/catalog.js 的 getDeveloper / developerSlug 一致
// ============================================================
const DEVELOPERS = JSON.parse(readFileSync(DEVELOPERS_JSON, 'utf8'));
const _devBySlug = new Map();    // slug -> dev
const _devByName = new Map();    // 小写名 -> dev
for (const d of DEVELOPERS) {
  let s = slugify(d.name);
  if (_devBySlug.has(s)) {
    let i = 2;
    while (_devBySlug.has(`${s}-${i}`)) i++;
    s = `${s}-${i}`;
  }
  d.__slug = s;
  _devBySlug.set(s, d);
  _devByName.set(String(d.name || '').toLowerCase().trim(), d);
}
// 与 catalog.js DEV_ALIAS 同步（catalog developer 值变体 → 维表 name）。
const DEV_ALIAS = {
  damac: 'Damac',
  wasl: 'Wasl Properties',
  'wasl properties': 'Wasl Properties',
  deyaar: 'DEYAAR',
  leos: 'LEOS',
  octa: 'OCTA',
};
// 文件夹名（品牌名）→ 开发商 slug（精确名 → 别名 → slugify → 失配）。
function matchDeveloperFolder(folder) {
  const cand = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const k = cand.toLowerCase().trim();
  if (_devByName.has(k)) return _devByName.get(k).__slug;
  const alias = DEV_ALIAS[k];
  if (alias) {
    const d = _devByName.get(String(alias).toLowerCase().trim());
    if (d) return d.__slug;
  }
  const s = slugify(cand);
  if (_devBySlug.has(s)) return _devBySlug.get(s).__slug;
  return null;
}

// ============================================================
// 社区归一 —— 与 lib/catalog.js 的多键索引 + COMM_ALIAS + communitySlug 一致
// ============================================================
const COMMUNITIES = JSON.parse(readFileSync(COMMUNITIES_JSON, 'utf8'));
const _normComm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
const COMM_ALIAS = {
  dubaiharbor: 'Dubai Harbour',
  palmjumeriah: 'Palm Jumeirah',
  dubaidowntown: 'Downtown Dubai',
  dmc: 'Dubai Maritime City',
  bluewaters: 'Bluewaters Island',
  dip: 'Dubai Investment Park First',
  tradecenter: 'Trade Center First',
  tradecentre: 'Trade Center First',
  ummsuqeim: 'Um Suqaim Third',
  jbr: 'Jumeirah Beach Residence',
  jvt: 'Jumeirah Village Triangle',
  zabeel: "Za'abeel 1",
  zabeel1: "Za'abeel 1",
  zaabeelsecond: "Za'abeel 2",
  mbrcity: 'Hadaeq Sheikh Mohammed Bin Rashid',
  districtone: 'Hadaeq Sheikh Mohammed Bin Rashid',
  expoliving: 'Expo City',
};
// 多键索引「优先级去碰撞」（与 catalog.js 同逻辑：身份名先占位，别名按营销富集度归营销版）。
const _commByKey = new Map();
const _commRich = (c) =>
  (c.display ? 8 : 0) + (c.isHot ? 4 : 0) + (c.marketData ? 2 : 0)
  + (c.profile && c.profile.blurbCn ? 1 : 0);
(function () {
  const reg = (key, c) => {
    const k = _normComm(key);
    if (k && !_commByKey.has(k)) _commByKey.set(k, c);
  };
  for (const c of COMMUNITIES) {
    reg(c.name, c);
    if (c.enName) reg(c.enName, c);
  }
  for (const c of [...COMMUNITIES].sort((a, b) => _commRich(b) - _commRich(a))) {
    if (c.names) {
      reg(c.names.bayut, c);
      reg(c.names.pf, c);
      reg(c.names.dxb, c);
      for (const a of c.names.alias || []) reg(a, c);
    }
  }
})();
const _commBySlug = new Map();
for (const c of COMMUNITIES) {
  let s = slugify(c.name) || (c.area && c.area.slug ? String(c.area.slug).toLowerCase().trim() : 'community');
  if (_commBySlug.has(s)) {
    let i = 2;
    while (_commBySlug.has(`${s}-${i}`)) i++;
    s = `${s}-${i}`;
  }
  c.__slug = s;
  _commBySlug.set(s, c);
}
function getCommunityByName(name) {
  const k = _normComm(name);
  if (!k) return null;
  if (_commByKey.has(k)) return _commByKey.get(k);
  const alias = COMM_ALIAS[k];
  if (alias) {
    const ak = _normComm(alias);
    if (_commByKey.has(ak)) return _commByKey.get(ak);
  }
  return null;
}
// 文件夹名（社区名）→ 社区 slug（归一/别名 → 失配）。
function matchCommunityFolder(folder) {
  const cand = folder.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  const c = getCommunityByName(cand);
  return c ? c.__slug : null;
}

// ============================================================
// 素材文件分类（文件名前缀 `<category>__…`）
// ============================================================
function categoryOf(filename) {
  const i = filename.indexOf('__');
  return i === -1 ? '' : filename.slice(0, i);
}
// 排序序号：…_<n>_<hash>.<ext>（无序号回落 999）
function orderIndex(filename) {
  const m = filename.match(/_(\d+)_[0-9a-f]{6,}\.[a-z0-9]+$/i);
  return m ? parseInt(m[1], 10) : 999;
}

// 文件夹内图片 → 分类素材束 {hero,detail,area,cover,cardSrc}（绝对路径）。
//   · 无前缀旧文件夹：全部进 hero（保持既有行为，不回归）。
//   · 有前缀：hero=hero_carousel+exterior、detail=interior+feature_block、
//     area=attraction_district、cover=brochure_cover（首张）；未知前缀/混入无前缀
//     图兜底追加进 hero（仅排除封面/OG），保证不漏图。card=hero_carousel 第一张。
function classifyFolder(dir, imgs) {
  const abs = (f) => join(dir, f);
  const byOrder = (a, b) => orderIndex(a) - orderIndex(b);
  const anyPrefixed = imgs.some((f) => categoryOf(f) !== '');
  if (!anyPrefixed) {
    const hero = imgs.slice().sort((a, b) => a.localeCompare(b, 'en')).map(abs);
    return { hero, detail: [], area: [], cover: null, cardSrc: hero[0] || null };
  }
  const pick = (list) => {
    const out = [];
    for (const cat of list) for (const f of imgs.filter((x) => categoryOf(x) === cat).sort(byOrder)) out.push(abs(f));
    return out;
  };
  const hero = pick(HERO_CATS);
  const detail = pick(DETAIL_CATS);
  const area = pick(AREA_CATS);
  const coverFiles = imgs.filter((f) => COVER_CATS.includes(categoryOf(f))).sort(byOrder);
  const cover = coverFiles.length ? abs(coverFiles[0]) : null;
  const knownGallery = new Set([...HERO_CATS, ...DETAIL_CATS, ...AREA_CATS]);
  for (const f of imgs) {
    const c = categoryOf(f);
    if (knownGallery.has(c) || NONGALLERY_CATS.has(c)) continue;
    hero.push(abs(f)); // 未知前缀 / 无前缀混入 → 兜底进 hero
  }
  const firstCarousel = imgs.filter((f) => categoryOf(f) === 'hero_carousel').sort(byOrder)[0];
  const cardSrc = firstCarousel ? abs(firstCarousel) : (hero[0] || null);
  return { hero, detail, area, cover, cardSrc };
}

// —— 通用 webp 压缩 + 幂等（dev/community 复用；projects 保留内联逻辑）——
const upToDate = (dest, src) =>
  !FORCE && existsSync(dest) && statSync(dest).mtimeMs >= statSync(src).mtimeMs;
async function toWebp(src, dest, width, quality, rotate = true) {
  if (!existsSync(dirname(dest))) mkdirSync(dirname(dest), { recursive: true });
  if (sharp) {
    let s = sharp(src);
    if (rotate) s = s.rotate();                     // 依 EXIF 自动摆正（照片有效，logo 无副作用）
    // webp 默认保留 alpha（logo 透明底安全）。
    await s.resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(dest);
    return;
  }
  // ImageMagick 兜底：-auto-orient≈EXIF 摆正；-resize 'W x>' 仅缩不放大；webp 保留 alpha。
  const args = [src];
  if (rotate) args.push('-auto-orient');
  args.push('-resize', `${width}x>`, '-quality', String(quality), dest);
  const r = spawnSync('convert', args, { stdio: 'ignore' });
  if (r.status !== 0) throw new Error(`convert 压缩失败: ${basename(src)} → ${basename(dest)}`);
}

// 从「分类素材束 cats + 可选 PDF」产出 webp/pdf 并返回 manifest 段（分类感知）。
//   cats = { hero:[abs…], detail:[abs…], area:[abs…], cover: abs|null, cardSrc: abs|null }
async function processProject(slug, name, cats, pdfPath, report) {
  const rec = { kind: 'project', folderName: name, slug, name: (_bySlug.get(slug)?.name) || name };
  const outDir = join(PUBLIC_IMG, slug);
  const entry = { heroImages: [], cardImage: null };
  const hero = cats.hero || [];
  const detail = cats.detail || [];
  const area = cats.area || [];
  const cover = cats.cover || null;
  const cardSrc = cats.cardSrc || hero[0] || null;
  if (!DRY && (hero.length || detail.length || area.length || cover) && !existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  // 通用批量：files → <prefix>-<n>.webp（幂等；DRY 只出路径不写图）。
  const emit = async (files, prefix, width, quality) => {
    const arr = [];
    let n = 0;
    for (const src of files.slice(0, MAX_HERO)) {
      n += 1;
      if (!DRY) {
        const dest = join(outDir, `${prefix}-${n}.webp`);
        if (!upToDate(dest, src)) await toWebp(src, dest, width, quality);
      }
      arr.push(`/img/projects/${slug}/${prefix}-${n}.webp`);
    }
    return arr;
  };

  entry.heroImages = await emit(hero, 'hero', 1920, 80);
  const detailImages = await emit(detail, 'detail', 1600, 80);
  const areaImages = await emit(area, 'area', 1600, 80);
  if (detailImages.length) entry.detailImages = detailImages;   // 产品细节章
  if (areaImages.length) entry.areaImages = areaImages;         // 地段/社区章

  // card = hero_carousel 第一张（无则首张 hero）640w q75。
  if (cardSrc) {
    if (!DRY) {
      const cardDest = join(outDir, 'card.webp');
      if (!upToDate(cardDest, cardSrc)) await toWebp(cardSrc, cardDest, 640, 75);
    }
    entry.cardImage = `/img/projects/${slug}/card.webp`;
  }
  // 楼书封面 brochure_cover → 单键 brochureCover（不入图集）。
  if (cover) {
    if (!DRY) {
      const covDest = join(outDir, 'brochure-cover.webp');
      if (!upToDate(covDest, cover)) await toWebp(cover, covDest, 900, 82);
    }
    entry.brochureCover = `/img/projects/${slug}/brochure-cover.webp`;
  }

  rec.heroCount = entry.heroImages.length;
  rec.detailCount = detailImages.length;
  rec.areaCount = areaImages.length;
  rec.card = !!entry.cardImage;
  rec.cover = !!entry.brochureCover;

  // —— 楼书 PDF ——
  if (pdfPath && existsSync(pdfPath)) {
    let srcPdf = pdfPath;
    let mb = statSync(srcPdf).size / (1024 * 1024);
    // 超限先试 ghostscript /ebook 压缩（存在时）。
    if (mb > MAX_BROCHURE_MB && hasGhostscript()) {
      const tmp = join(PUBLIC_BRO, `.${slug}.gs.pdf`);
      const ok = gsCompress(srcPdf, tmp);
      if (ok && existsSync(tmp)) {
        const nmb = statSync(tmp).size / (1024 * 1024);
        if (nmb < mb) { srcPdf = tmp; mb = nmb; }
        else { try { rmSync(tmp); } catch {} }
      }
    }
    if (mb <= MAX_BROCHURE_MB) {
      if (!existsSync(PUBLIC_BRO)) mkdirSync(PUBLIC_BRO, { recursive: true });
      const destPdf = join(PUBLIC_BRO, `${slug}.pdf`);
      if (!DRY) copyFileSync(srcPdf, destPdf);
      if (srcPdf.endsWith('.gs.pdf')) { try { rmSync(srcPdf); } catch {} }
      entry.brochure = `/brochures/${slug}.pdf`;
      rec.brochure = `copied (${mb.toFixed(1)}MB)${DRY ? ' [dry]' : ''}`;
    } else {
      rec.brochure = `skipped (${mb.toFixed(1)}MB > ${MAX_BROCHURE_MB}MB 上限；建议 gs 压缩后重跑)`;
    }
  } else {
    rec.brochure = 'none';
  }

  report.matched.push(rec);
  return entry;
}

// —— 路线一：项目氛围短片转码（video_hero_* → public/video/<slug>/hero.mp4 + poster.webp）——
//   返回 { src, poster } | null；rec.video 记录处理结果供报告展示。
//   缺 ffmpeg：若产物已在盘则复用并出路径（幂等），否则跳过并提示 brew install（同 sharp 干跑思路）。
function probeDurationSec(src) {
  if (!hasFfprobe) return null;
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', src], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const s = parseFloat(String(r.stdout || '').trim());
  return Number.isFinite(s) && s > 0 ? s : null;
}
async function processProjectVideo(slug, videoPath, report, rec) {
  const outDir = join(PUBLIC_VIDEO, slug);
  const outMp4 = join(outDir, 'hero.mp4');
  const outPoster = join(outDir, 'poster.webp');
  const manifestVal = { src: `/video/${slug}/hero.mp4`, poster: `/video/${slug}/poster.webp` };

  // 缺 ffmpeg：复用已有产物，否则跳过并提示安装（Mac 端 brew install ffmpeg）。
  if (!hasFfmpeg) {
    if (existsSync(outMp4) && existsSync(outPoster)) { rec.video = 'kept (ffmpeg 缺失·复用已有产物)'; return manifestVal; }
    report.notes.push(`项目 ${slug}: 检测到 ${basename(videoPath)} 但缺 ffmpeg，跳过视频转码。Mac 端请 \`brew install ffmpeg\` 后重跑 npm run sync-assets（同 sharp 干跑思路）。`);
    rec.video = 'skipped (缺 ffmpeg · brew install ffmpeg)';
    return null;
  }
  // 幂等：产物比源新则跳过重转（--force 例外）。
  if (existsSync(outMp4) && existsSync(outPoster) && !FORCE && statSync(outMp4).mtimeMs >= statSync(videoPath).mtimeMs) {
    rec.video = `up-to-date (${(statSync(outMp4).size / (1024 * 1024)).toFixed(1)}MB)`;
    return manifestVal;
  }
  // 时长门槛：> 60s 判过长，跳过并建议剪辑。
  const dur = probeDurationSec(videoPath);
  if (dur != null && dur > VIDEO_MAX_SECONDS) {
    report.notes.push(`项目 ${slug}: ${basename(videoPath)} 时长 ${dur.toFixed(0)}s > ${VIDEO_MAX_SECONDS}s 上限，跳过；建议剪辑到 ${VIDEO_MAX_SECONDS}s 内的氛围短片后重跑。`);
    rec.video = `skipped (${dur.toFixed(0)}s > ${VIDEO_MAX_SECONDS}s·建议剪辑)`;
    return null;
  }

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const tmpMp4 = join(outDir, '.hero.tmp.mp4');
  // 静音(-an)、缩至 720p（不放大）、h264、+faststart；crf 自适应逼近 5MB 目标（28 起步，超则加压）。
  const encode = (crf) => {
    const r = spawnSync('ffmpeg', [
      '-y', '-i', videoPath, '-an',
      '-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-preset', 'veryfast', '-crf', String(crf), '-movflags', '+faststart', tmpMp4,
    ], { stdio: 'ignore' });
    return r.status === 0 && existsSync(tmpMp4);
  };
  let ok = false; let mb = Infinity;
  for (const crf of [28, 32, 36]) {
    ok = encode(crf);
    if (!ok) break;
    mb = statSync(tmpMp4).size / (1024 * 1024);
    if (mb <= VIDEO_TARGET_MB) break;
  }
  if (!ok) {
    try { rmSync(tmpMp4, { force: true }); } catch {}
    report.notes.push(`项目 ${slug}: ${basename(videoPath)} ffmpeg 转码失败，跳过。`);
    rec.video = 'skipped (ffmpeg 转码失败)';
    return null;
  }
  if (mb > VIDEO_HARD_MB) {
    try { rmSync(tmpMp4, { force: true }); } catch {}
    report.notes.push(`项目 ${slug}: ${basename(videoPath)} 转码后仍 ${mb.toFixed(1)}MB > ${VIDEO_HARD_MB}MB 硬上限，跳过；建议剪短时长/降低画面复杂度后重剪。`);
    rec.video = `skipped (${mb.toFixed(1)}MB > ${VIDEO_HARD_MB}MB 上限·建议剪辑)`;
    return null;
  }
  renameSync(tmpMp4, outMp4);
  // 抽首帧出 poster.webp：先 ffmpeg 出 png 首帧，再走通用 toWebp 压（无 sharp 则 ImageMagick）。
  const framePng = join(outDir, '.poster.tmp.png');
  const rf = spawnSync('ffmpeg', ['-y', '-i', outMp4, '-frames:v', '1', '-q:v', '2', framePng], { stdio: 'ignore' });
  if (rf.status === 0 && existsSync(framePng)) {
    try { await toWebp(framePng, outPoster, 1280, 78, false); } catch {}
    try { rmSync(framePng, { force: true }); } catch {}
  }
  if (!existsSync(outPoster)) {
    spawnSync('ffmpeg', ['-y', '-i', outMp4, '-frames:v', '1', '-vf', "scale='min(1280,iw)':-1", outPoster], { stdio: 'ignore' });
  }
  rec.video = `encoded (${mb.toFixed(1)}MB${dur != null ? ` · ${dur.toFixed(0)}s` : ''})`;
  return existsSync(outPoster) ? manifestVal : { src: manifestVal.src };
}

// —— logo 资产生成（png/jpg 压 240w webp 保留 alpha + 原格式一份；svg 原样拷贝；webp 原样压）——
//    复用于 processDeveloper（目录里的 logo.*）与 runLocalDevLogosFlat（dev-logos/ 扁平文件）。
async function makeLogoAsset(outDir, src, ext) {
  if (ext === 'svg') {
    if (!DRY) {
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      copyFileSync(src, join(outDir, 'logo.svg'));
    }
    return { logo: 'logo.svg', kind: 'svg' };
  }
  if (ext === 'webp') {
    const dest = join(outDir, 'logo.webp');
    if (!DRY && !upToDate(dest, src)) await toWebp(src, dest, 240, 90, false);
    return { logo: 'logo.webp', kind: 'webp' };
  }
  const webpDest = join(outDir, 'logo.webp');
  const origDest = join(outDir, `logo.${ext}`);
  if (!DRY) {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    if (!upToDate(webpDest, src)) await toWebp(src, webpDest, 240, 90, false);
    copyFileSync(src, origDest);
  }
  return { logo: 'logo.webp', logoOriginal: `logo.${ext}`, kind: ext };
}

// —— 开发商素材处理：logo（240w webp + 保留原格式/svg 原样）+ 可选 hero ——
async function processDeveloper(slug, folderName, dir, report) {
  const rec = { kind: 'developer', folderName, slug, name: _devBySlug.get(slug)?.name || folderName };
  const outDir = join(PUBLIC_IMG_DEV, slug);
  const files = readdirSync(dir).filter((f) => !f.startsWith('_') && !f.startsWith('.'));
  const entry = {};

  // —— logo ——
  const logoFile = files.find((f) => LOGO_RE.test(f));
  if (logoFile) {
    const ext = logoFile.split('.').pop().toLowerCase();
    const src = join(dir, logoFile);
    const res = await makeLogoAsset(outDir, src, ext);
    entry.logo = `/img/developers/${slug}/${res.logo}`;
    if (res.logoOriginal) entry.logoOriginal = `/img/developers/${slug}/${res.logoOriginal}`;
    rec.logo = res.kind;
  } else {
    rec.logo = 'none';
  }

  // —— 可选 hero 图（hero-*.jpg 等，走项目同规则 1920w q80）——
  const heroSrc = files.filter((f) => DEV_HERO_RE.test(f)).sort((a, b) => a.localeCompare(b, 'en'));
  if (heroSrc.length) {
    const heroImages = [];
    let n = 0;
    for (const f of heroSrc.slice(0, MAX_HERO)) {
      n += 1;
      const src = join(dir, f);
      const dest = join(outDir, `hero-${n}.webp`);
      if (!DRY && !upToDate(dest, src)) await toWebp(src, dest, 1920, 80);
      heroImages.push(`/img/developers/${slug}/hero-${n}.webp`);
    }
    entry.heroImages = heroImages;
    rec.heroCount = heroImages.length;
  } else {
    rec.heroCount = 0;
  }

  if (entry.logo || entry.heroImages) {
    report.matched.push(rec);
    return entry;
  }
  report.mismatched.push({ kind: 'developer', folder: folderName, reason: '文件夹无 logo/hero 素材' });
  return null;
}

// —— 社区图资产生成：hero 1920w + card 640w（同 ProjectCard 模式）——
//    复用于 processCommunity（COMMUNITIES_DIR 目录）与 runLocalCommunityHeroesFlat
//    （community-heroes* 扁平多来源文件夹，2026-07-12 新增）。files 为绝对路径数组。
async function makeCommunityAssets(outDir, files) {
  const entry = { heroImages: [], cardImage: null };
  let n = 0;
  for (const src of files.slice(0, MAX_HERO)) {
    n += 1;
    const dest = join(outDir, `hero-${n}.webp`);
    if (!DRY && !upToDate(dest, src)) await toWebp(src, dest, 1920, 80);
    entry.heroImages.push(`hero-${n}.webp`);
  }
  if (files[0]) {
    const cardDest = join(outDir, 'card.webp');
    if (!DRY && !upToDate(cardDest, files[0])) await toWebp(files[0], cardDest, 640, 75);
    entry.cardImage = 'card.webp';
  }
  return entry;
}

// —— 社区素材处理（老约定：COMMUNITIES_DIR/<社区>/ 一社区一文件夹）——
const COMM_IMG_RE = /\.(jpe?g|png|webp)$/i;
async function processCommunity(slug, folderName, dir, report) {
  const rec = { kind: 'community', folderName, slug, name: _commBySlug.get(slug)?.name || folderName };
  const outDir = join(PUBLIC_IMG_COMM, slug);
  const files = readdirSync(dir)
    .filter((f) => !f.startsWith('_') && !f.startsWith('.') && COMM_IMG_RE.test(f))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((f) => join(dir, f));
  if (!files.length) {
    report.mismatched.push({ kind: 'community', folder: folderName, reason: '文件夹无图片素材' });
    return null;
  }
  const base = await makeCommunityAssets(outDir, files);
  const entry = {
    heroImages: base.heroImages.map((f) => `/img/communities/${slug}/${f}`),
    cardImage: base.cardImage ? `/img/communities/${slug}/${base.cardImage}` : null,
  };
  rec.heroCount = entry.heroImages.length;
  rec.card = !!entry.cardImage;
  report.matched.push(rec);
  return entry;
}

// ============================================================
// 2026-07-12 新增 —— 开发商 logo 扁平目录（dev-logos/<品牌>.ext）
// ============================================================
async function runLocalDevLogosFlat(manifest, report) {
  const dir = join(DOWNLOADS, DEV_LOGOS_DIRNAME);
  if (!existsSync(dir)) { report.notes.push(`开发商 logo 扁平目录不存在: ${dir}（跳过 ${DEV_LOGOS_DIRNAME} 段）`); return; }
  const files = readdirSync(dir).filter((f) => /\.(png|jpe?g|svg|webp)$/i.test(f) && !f.startsWith('.') && !f.startsWith('_'));
  const claimed = new Map(); // slug -> file（去重）
  for (const f of files) {
    const base = f.replace(/\.(png|jpe?g|svg|webp)$/i, '');
    const slug = matchDeveloperFolder(base); // 复用既有归一/别名逻辑：下划线→空格→精确名/别名/slugify
    if (!slug) { report.mismatched.push({ kind: 'developer', folder: `${DEV_LOGOS_DIRNAME}/${f}`, reason: '未匹配到 developers.json 开发商（文件名品牌未识别）' }); continue; }
    if (claimed.has(slug)) { report.duplicates.push({ kind: 'developer', folder: `${DEV_LOGOS_DIRNAME}/${f}`, slug, keptFolder: claimed.get(slug) }); continue; }
    claimed.set(slug, `${DEV_LOGOS_DIRNAME}/${f}`);

    const ext = f.split('.').pop().toLowerCase();
    const outDir = join(PUBLIC_IMG_DEV, slug);
    const res = await makeLogoAsset(outDir, join(dir, f), ext);
    const prev = manifest.developers[slug] || {};
    manifest.developers[slug] = {
      ...prev,
      logo: `/img/developers/${slug}/${res.logo}`,
      ...(res.logoOriginal ? { logoOriginal: `/img/developers/${slug}/${res.logoOriginal}` } : {}),
    };
    report.matched.push({
      kind: 'developer', folderName: `${DEV_LOGOS_DIRNAME}/${f}`, slug,
      name: _devBySlug.get(slug)?.name || slug, logo: res.kind,
      heroCount: prev.heroImages?.length || 0, updated: !!prev.logo,
    });
  }
}

// ============================================================
// 2026-07-12 新增 —— 社区图多来源扁平目录（community-heroes*）
// ------------------------------------------------------------
// 文件名两种形态：
//   · community-<bayut社区ID>-<slug>.ext  （bayut/developer/provident/wiki 四个来源）
//   · <slug>.ext                          （community-heroes 无后缀curated批次 + unsplash）
// 按 COMMUNITY_HERO_DIRNAMES 定义的优先级顺序遍历来源；同一社区只要被更高优先级
// 来源占位过，后面来源的同社区图直接跳过（不追加、不覆盖）——避免同社区混插低质
// 兜底图，也避免『谁最后跑谁生效』的不确定性。
// opts.onlySourceDir：--only=<来源目录名> 时只跑这一个来源（验证用）。
// opts.onlySlug：--only=<社区名> 时只处理这一个社区（跨来源仍按优先级取最优，验证用）。
// ============================================================
async function runLocalCommunityHeroesFlat(manifest, report, opts = {}) {
  const IDSLUG_RE = /^community-\d+-(.+)\.(jpe?g|png|webp)$/i;
  const bucket = new Map(); // commSlug -> { files:[abs...], sourceDir }
  for (const dirName of COMMUNITY_HERO_DIRNAMES) {
    if (opts.onlySourceDir && dirName.toLowerCase() !== opts.onlySourceDir.toLowerCase()) continue;
    const dir = join(DOWNLOADS, dirName);
    if (!existsSync(dir)) { report.notes.push(`社区图来源目录不存在: ${dir}（跳过 ${dirName}）`); continue; }
    const files = readdirSync(dir).filter((f) => COMM_IMG_RE.test(f));
    const hereBySlug = new Map();
    for (const f of files) {
      const m = f.match(IDSLUG_RE);
      const slugPart = m ? m[1] : f.replace(/\.(jpe?g|png|webp)$/i, '');
      const c = getCommunityByName(slugPart.replace(/-/g, ' '));
      if (!c) { report.mismatched.push({ kind: 'community', folder: `${dirName}/${f}`, reason: '未匹配到 communities.json 社区' }); continue; }
      if (!hereBySlug.has(c.__slug)) hereBySlug.set(c.__slug, []);
      hereBySlug.get(c.__slug).push(join(dir, f));
    }
    for (const [slug, list] of hereBySlug) {
      if (bucket.has(slug)) continue; // 已被更高优先级来源占位
      bucket.set(slug, { files: list, sourceDir: dirName });
    }
  }
  for (const [slug, { files, sourceDir }] of bucket) {
    if (opts.onlySlug && slug !== opts.onlySlug) continue;
    const outDir = join(PUBLIC_IMG_COMM, slug);
    const base = await makeCommunityAssets(outDir, files);
    const prev = manifest.communities[slug] || {};
    manifest.communities[slug] = {
      ...prev,
      heroImages: base.heroImages.map((f) => `/img/communities/${slug}/${f}`),
      cardImage: base.cardImage ? `/img/communities/${slug}/${base.cardImage}` : (prev.cardImage || null),
    };
    report.matched.push({
      kind: 'community', folderName: `${sourceDir}/*`, slug,
      name: _commBySlug.get(slug)?.name || slug,
      heroCount: base.heroImages.length, card: !!base.cardImage,
      source: sourceDir, updated: !!prev.heroImages,
    });
  }
}

// ============================================================
// 2026-07-12 新增 —— 项目图库文件级并入（damac/ · binghatti/）
// ------------------------------------------------------------
// 这两个开发商图库文件夹不是「一项目一子文件夹」，而是扁平文件、文件名带
// 项目名线索。用各自确定性规则把文件分组到 catalog 项目 slug，再作为「第二
// 项目根」的补充图追加进该项目已有的 heroImages（不覆盖 DOWNLOADS/<项目> 主
// 扫描产出的图，只追加，命名加 gallery-<来源>-<n> 前缀避免撞档名）。
// ============================================================
function matchProjectCandidates(cands) {
  for (const c of cands) {
    const s = matchFolder(c);
    if (s) return s;
  }
  return null;
}

async function appendProjectGalleryImages(manifest, slug, files, report, sourceLabel) {
  const outDir = join(PUBLIC_IMG, slug);
  const existing = manifest.projects[slug] || { heroImages: [], cardImage: null };
  const room = Math.max(0, MAX_HERO - (existing.heroImages?.length || 0));
  const covers = files.filter((f) => /brochure[-_]cover/i.test(basename(f)));
  const rest = files.filter((f) => !/brochure[-_]cover/i.test(basename(f)));
  if (room === 0 && !covers.length) {
    report.notes.push(`${sourceLabel} → ${slug}：项目已有 ${existing.heroImages?.length || 0} 张 hero（达上限 ${MAX_HERO}），跳过 ${files.length} 张补充图`);
    return;
  }
  const picked = rest.slice(0, room);
  const added = [];
  let n = (existing.heroImages || []).length;
  for (const src of picked) {
    n += 1;
    const dest = join(outDir, `gallery-${sourceLabel}-${n}.webp`);
    if (!DRY && !upToDate(dest, src)) await toWebp(src, dest, 1920, 80);
    added.push(`/img/projects/${slug}/gallery-${sourceLabel}-${n}.webp`);
  }
  const heroImages = [...(existing.heroImages || []), ...added];
  const merged = { ...existing, heroImages };
  if (!merged.cardImage && picked.length) {
    const cardDest = join(outDir, 'card.webp');
    if (!DRY && !upToDate(cardDest, picked[0])) await toWebp(picked[0], cardDest, 640, 75);
    merged.cardImage = `/img/projects/${slug}/card.webp`;
  }
  if (covers.length && !merged.brochureCover) {
    const covDest = join(outDir, 'brochure-cover.webp');
    if (!DRY && !upToDate(covDest, covers[0])) await toWebp(covers[0], covDest, 900, 82);
    merged.brochureCover = `/img/projects/${slug}/brochure-cover.webp`;
  }
  manifest.projects[slug] = merged;
  report.matched.push({
    kind: 'project', folderName: `${sourceLabel}/ (并入)`, slug,
    name: (_bySlug.get(slug)?.name) || slug,
    heroCount: heroImages.length, card: !!merged.cardImage, cover: !!merged.brochureCover,
    brochure: existing.brochure ? 'kept' : 'none',
    addedFromSource: added.length, source: sourceLabel, updated: true,
  });
}

// damac/ —— projects-<slug>.jpg 或 communities-<community-slug>-projects-<project-slug>.jpg
// → 取文件名里最后一个 "projects-" 之后的片段作为项目 slug 候选。
async function runLocalDamacFolder(manifest, report) {
  const dir = join(DOWNLOADS, DAMAC_DIRNAME);
  if (!existsSync(dir)) { report.notes.push(`${DAMAC_DIRNAME}/ 目录不存在，跳过 DAMAC 项目图库并入`); return; }
  const files = readdirSync(dir).filter((f) => IMG_RE.test(f));
  const bySlug = new Map();
  for (const f of files) {
    const m = f.match(/projects-([a-z0-9-]+)\.(jpe?g|png|webp)$/i);
    if (!m) { report.mismatched.push({ kind: 'project', folder: `${DAMAC_DIRNAME}/${f}`, reason: '文件名不含 "projects-<slug>" 规则片段，无法解析' }); continue; }
    const candidate = m[1].replace(/-/g, ' ');
    const slug = matchFolder(candidate);
    if (!slug) { report.mismatched.push({ kind: 'project', folder: `${DAMAC_DIRNAME}/${f}`, reason: `解析出候选项目名「${candidate}」但未匹配到 catalog` }); continue; }
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(join(dir, f));
  }
  for (const [slug, list] of bySlug) await appendProjectGalleryImages(manifest, slug, list, report, DAMAC_DIRNAME);
}

// binghatti/ —— <project-token>-<category>-<n>.ext（如 aquarise-exterior-1.webp、
// aurora_bedroom-1.webp）→ 取首个 "-"/"_" 前的 token，依次尝试
// "Binghatti <token>"（catalog 项目多为 "Binghatti Xxx" 命名）与裸 token。
// 排除户型图（layout）与横竖版 banner 裁切图（*horizontal*/*vertical*），
// 这些不是营销实景图，混进 hero 轮播观感差。
async function runLocalBinghattiFolder(manifest, report) {
  const dir = join(DOWNLOADS, BINGHATTI_DIRNAME);
  if (!existsSync(dir)) { report.notes.push(`${BINGHATTI_DIRNAME}/ 目录不存在，跳过 Binghatti 项目图库并入`); return; }
  const EXCLUDE_RE = /(layout|horizontal|vertical)/i;
  const files = readdirSync(dir).filter((f) => IMG_RE.test(f));
  const bySlug = new Map();
  for (const f of files) {
    if (EXCLUDE_RE.test(f)) continue;
    const base = f.replace(/\.[a-z0-9]+$/i, '');
    const parts = base.split(/[-_]+/).filter(Boolean);
    if (!parts.length) { report.mismatched.push({ kind: 'project', folder: `${BINGHATTI_DIRNAME}/${f}`, reason: '无法解析出前缀项目 token' }); continue; }
    // 部分文件名重复品牌前缀（如 binghatti-skyflame-footer.webp），token 取「品牌名之后」那个。
    const token = parts[0].toLowerCase() === 'binghatti' ? parts[1] : parts[0];
    if (!token) { report.mismatched.push({ kind: 'project', folder: `${BINGHATTI_DIRNAME}/${f}`, reason: '无法解析出前缀项目 token（品牌前缀后无内容）' }); continue; }
    const slug = matchProjectCandidates([`Binghatti ${token}`, token]);
    if (!slug) { report.mismatched.push({ kind: 'project', folder: `${BINGHATTI_DIRNAME}/${f}`, reason: `前缀 token「${token}」未匹配到 catalog 项目（已尝试 "Binghatti ${token}"）` }); continue; }
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(join(dir, f));
  }
  for (const [slug, list] of bySlug) await appendProjectGalleryImages(manifest, slug, list, report, BINGHATTI_DIRNAME);
}

function hasGhostscript() {
  try { execSync('command -v gs', { stdio: 'ignore' }); return true; } catch { return false; }
}
function gsCompress(src, dest) {
  const r = spawnSync('gs', [
    '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4', '-dPDFSETTINGS=/ebook',
    '-dNOPAUSE', '-dQUIET', '-dBATCH', `-sOutputFile=${dest}`, src,
  ], { stdio: 'ignore' });
  return r.status === 0;
}

// ============================================================
// 本地模式 — 项目
// ============================================================
async function runLocal(manifest, report) {
  if (!existsSync(DOWNLOADS)) {
    console.error(`[sync] 项目素材缓存目录不存在: ${DOWNLOADS}`);
    report.notes.push(`项目素材目录不存在: ${DOWNLOADS}（跳过项目段）`);
    return;
  }
  let folders = readdirSync(DOWNLOADS, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name)
    .filter((f) => !NONPROJECT_TOPLEVEL_DIRS.has(f)); // 2026-07-12：非项目素材文件夹（logo/社区图/开发商图库等）不进项目段
  if (ONLY) folders = folders.filter((f) => f.toLowerCase() === ONLY.toLowerCase());
  const claimed = new Map(); // slug -> folder（去重，防两文件夹撞同一 slug）

  for (const folder of folders) {
    const slug = matchFolder(folder);
    if (!slug) {
      // 2026-07-12：歧义名（如 Palace_Residences 撞多个 catalog 同前缀项目）→
      // 报告里直接列出候选，而不是笼统「未匹配」，方便人工一眼判断要不要拆分/改名。
      const cand = normName(folder.replace(/_/g, ' '));
      const candidates = cand
        ? CATALOG.filter((p) => normName(p.name).startsWith(cand)).map((p) => p.name)
        : [];
      const reason = candidates.length > 1
        ? `文件夹名对应 ${candidates.length} 个同前缀候选项目，名称歧义，需人工确认后手动归位（候选：${candidates.join(' / ')}）`
        : '未匹配到 catalog 项目';
      report.mismatched.push({ kind: 'project', folder, reason, ...(candidates.length > 1 ? { candidates } : {}) });
      continue;
    }
    if (claimed.has(slug)) {
      report.duplicates.push({ kind: 'project', folder, slug, keptFolder: claimed.get(slug) });
      continue;
    }
    claimed.set(slug, folder);

    const dir = join(DOWNLOADS, folder);
    const files = readdirSync(dir).filter((f) => !f.startsWith('_') && !f.startsWith('.'));
    // 分类感知落位（hero/detail/area/cover），无前缀旧文件夹整体进 hero。
    const imgs = files.filter((f) => IMG_RE.test(f));
    const cats = classifyFolder(dir, imgs);
    const pdf = files.find((f) => f.toLowerCase().endsWith('.pdf'));
    const pdfPath = pdf ? join(dir, pdf) : null;

    const entry = await processProject(slug, folder, cats, pdfPath, report);
    const prev = manifest.projects[slug];
    // —— 路线一：项目氛围短片 video_hero_*（有则转码并挂 heroVideo；无则沿用既有产物，不误删）——
    const rec = report.matched[report.matched.length - 1];
    const videoFile = files.find((f) => VIDEO_HERO_RE.test(f));
    if (videoFile) {
      const hv = await processProjectVideo(slug, join(dir, videoFile), report, rec);
      if (hv) entry.heroVideo = hv;
    } else if (prev && prev.heroVideo) {
      // 本轮无源片但既有产物仍在盘 → 保留 heroVideo（图片重跑不应抹掉视频）。
      const kept = prev.heroVideo.src && existsSync(join(ROOT, 'public', prev.heroVideo.src.replace(/^\//, '')));
      if (kept) { entry.heroVideo = prev.heroVideo; rec.video = 'kept (无新源片·保留既有)'; }
    }
    manifest.projects[slug] = entry;
    if (prev) rec.updated = true;
  }
}

// ============================================================
// 本地模式 — 开发商
// ============================================================
async function runLocalDevelopers(manifest, report) {
  if (!existsSync(DEVELOPERS_DIR)) {
    report.notes.push(`开发商素材目录不存在: ${DEVELOPERS_DIR}（跳过开发商段）`);
    return;
  }
  const folders = readdirSync(DEVELOPERS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);
  const claimed = new Map();
  for (const folder of folders) {
    const slug = matchDeveloperFolder(folder);
    if (!slug) { report.mismatched.push({ kind: 'developer', folder, reason: '未匹配到 developers.json 开发商' }); continue; }
    if (claimed.has(slug)) { report.duplicates.push({ kind: 'developer', folder, slug, keptFolder: claimed.get(slug) }); continue; }
    claimed.set(slug, folder);
    const entry = await processDeveloper(slug, folder, join(DEVELOPERS_DIR, folder), report);
    if (entry) {
      const prev = manifest.developers[slug];
      manifest.developers[slug] = { ...(prev || {}), ...entry };
      if (prev) report.matched[report.matched.length - 1].updated = true;
    }
  }
}

// ============================================================
// 本地模式 — 社区
// ============================================================
async function runLocalCommunities(manifest, report) {
  if (!existsSync(COMMUNITIES_DIR)) {
    report.notes.push(`社区素材目录不存在: ${COMMUNITIES_DIR}（跳过社区段）`);
    return;
  }
  const folders = readdirSync(COMMUNITIES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => d.name);
  const claimed = new Map();
  for (const folder of folders) {
    const slug = matchCommunityFolder(folder);
    if (!slug) { report.mismatched.push({ kind: 'community', folder, reason: '未匹配到 communities.json 社区' }); continue; }
    if (claimed.has(slug)) { report.duplicates.push({ kind: 'community', folder, slug, keptFolder: claimed.get(slug) }); continue; }
    claimed.set(slug, folder);
    const entry = await processCommunity(slug, folder, join(COMMUNITIES_DIR, folder), report);
    if (entry) {
      const prev = manifest.communities[slug];
      manifest.communities[slug] = { ...(prev || {}), ...entry };
      if (prev) report.matched[report.matched.length - 1].updated = true;
    }
  }
}

// ============================================================
// Monday 对账模式（Mac 端 · 需 MONDAY_TOKEN）
// ============================================================
const BOARD_ID = 3916277144;                 // 项目板
const COL_HERO = 'file_mm54knz0';
const COL_BRO = 'file_mm54anat';
const DEV_BOARD_ID = 6350528756;             // 开发商板（文件列运行时探测）
const COMM_BOARD_ID = 18420441803;           // 社区板（文件列运行时探测）

async function mondayFetch(query, variables) {
  const token = process.env.MONDAY_TOKEN;
  if (!token) throw new Error('缺少 MONDAY_TOKEN 环境变量（Monday 对账模式仅 Mac 端可跑）');
  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'API-Version': '2024-10' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await res.json();
  if (j.errors) throw new Error('Monday GraphQL 错误: ' + JSON.stringify(j.errors));
  return j.data;
}

// 运行时探测某板 type=file 的列（找不到 → []，调用方报告「素材列未建」跳过）。
async function probeFileColumns(boardId) {
  const data = await mondayFetch(`query { boards(ids: [${boardId}]) { columns { id title type } } }`, {});
  const cols = data.boards?.[0]?.columns || [];
  return cols.filter((c) => c.type === 'file');
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`下载失败 ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!existsSync(dirname(dest))) mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
}

function assetIdsFromColValue(value) {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    return (v.files || []).map((f) => String(f.assetId));
  } catch { return []; }
}

async function runMonday(manifest, report) {
  if (DRY) { console.error('[sync] Monday 模式需 sharp（压缩）；当前环境无 sharp，中止。'); return; }
  const tmpRoot = join(INGEST_ROOT, '_monday-tmp');
  if (!existsSync(tmpRoot)) mkdirSync(tmpRoot, { recursive: true });
  const Q = `query ($cursor: String) {
    boards(ids: [${BOARD_ID}]) {
      items_page(limit: 50, cursor: $cursor) {
        cursor
        items {
          id name
          assets { id name public_url }
          column_values(ids: ["${COL_HERO}","${COL_BRO}"]) { id value }
        }
      }
    }
  }`;
  let cursor = null;
  do {
    const data = await mondayFetch(Q, { cursor });
    const page = data.boards?.[0]?.items_page;
    if (!page) break;
    cursor = page.cursor;
    for (const it of page.items || []) {
      const slug = _byName.get(normName(it.name)) || (_bySlug.has(slugify(it.name)) ? slugify(it.name) : null);
      if (!slug) { report.mismatched.push({ kind: 'project', folder: `monday:${it.name}`, reason: '未匹配 catalog' }); continue; }
      const assetById = new Map((it.assets || []).map((a) => [String(a.id), a]));
      let heroIds = [], broIds = [];
      for (const cv of it.column_values || []) {
        if (cv.id === COL_HERO) heroIds = assetIdsFromColValue(cv.value);
        if (cv.id === COL_BRO) broIds = assetIdsFromColValue(cv.value);
      }
      const existing = manifest.projects[slug] || {};
      const needHero = FORCE || !(existing.heroImages && existing.heroImages.length);
      const needBro = FORCE || !existing.brochure;
      if (!needHero && !needBro) continue;

      const tdir = join(tmpRoot, slug);
      if (!existsSync(tdir)) mkdirSync(tdir, { recursive: true });
      const heroFiles = [];
      if (needHero) {
        let n = 0;
        for (const id of heroIds) {
          const a = assetById.get(id);
          if (!a?.public_url) continue;
          n += 1;
          const dest = join(tdir, `hero_carousel__${id}_${basename(a.name)}`);
          try { await download(a.public_url, dest); heroFiles.push(dest); }
          catch (e) { report.mismatched.push({ kind: 'project', folder: `monday:${it.name}`, reason: String(e.message) }); }
        }
      }
      let pdfPath = null;
      if (needBro && broIds.length) {
        const a = assetById.get(broIds[0]);
        if (a?.public_url) {
          pdfPath = join(tdir, `brochurePdf__${a.name.endsWith('.pdf') ? a.name : a.name + '.pdf'}`);
          try { await download(a.public_url, pdfPath); }
          catch (e) { pdfPath = null; report.mismatched.push({ kind: 'project', folder: `monday:${it.name}`, reason: String(e.message) }); }
        }
      }
      // Monday 图列不带语义前缀 → 全归 hero（与既有行为一致）；分类键留空。
      const cats = { hero: needHero ? heroFiles : [], detail: [], area: [], cover: null, cardSrc: (needHero ? heroFiles[0] : null) || null };
      const entry = await processProject(slug, it.name, cats, pdfPath, report);
      // 合并：未重拉的段沿用旧 manifest。
      const merged = { ...existing };
      if (needHero) { merged.heroImages = entry.heroImages; merged.cardImage = entry.cardImage; }
      if (entry.brochure) merged.brochure = entry.brochure;
      manifest.projects[slug] = merged;
      if (existing.heroImages || existing.brochure) report.matched[report.matched.length - 1].updated = true;
    }
  } while (cursor);
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
}

// Monday — 开发商（文件列探测；无 file 列 → 报告「素材列未建」跳过）。
async function runMondayDevelopers(manifest, report) {
  if (DRY) { report.notes.push('Monday 开发商模式需 sharp，当前无 sharp，跳过'); return; }
  let fileCols;
  try { fileCols = await probeFileColumns(DEV_BOARD_ID); }
  catch (e) { report.notes.push(`开发商板 ${DEV_BOARD_ID} 列探测失败：${e.message}`); return; }
  if (!fileCols.length) {
    report.notes.push(`开发商板 ${DEV_BOARD_ID} 上素材列未建（无 file 类型列），跳过开发商对账`);
    return;
  }
  const logoCol = fileCols.find((c) => /logo/i.test(c.title || '')) || null;
  const colIds = fileCols.map((c) => `"${c.id}"`).join(',');
  const tmpRoot = join(INGEST_ROOT, '_monday-tmp-dev');
  if (!existsSync(tmpRoot)) mkdirSync(tmpRoot, { recursive: true });
  const Q = `query ($cursor: String) {
    boards(ids: [${DEV_BOARD_ID}]) {
      items_page(limit: 50, cursor: $cursor) {
        cursor
        items { id name assets { id name public_url } column_values(ids: [${colIds}]) { id value } }
      }
    }
  }`;
  let cursor = null;
  do {
    const data = await mondayFetch(Q, { cursor });
    const page = data.boards?.[0]?.items_page;
    if (!page) break;
    cursor = page.cursor;
    for (const it of page.items || []) {
      const dev = _devByName.get(String(it.name || '').toLowerCase().trim());
      const slug = dev ? dev.__slug : (_devBySlug.has(slugify(it.name)) ? slugify(it.name) : null);
      if (!slug) { report.mismatched.push({ kind: 'developer', folder: `monday:${it.name}`, reason: '未匹配 developers.json' }); continue; }
      const assetById = new Map((it.assets || []).map((a) => [String(a.id), a]));
      const tdir = join(tmpRoot, slug);
      if (!existsSync(tdir)) mkdirSync(tdir, { recursive: true });
      let got = false, hn = 0;
      for (const cv of it.column_values || []) {
        const ids = assetIdsFromColValue(cv.value);
        const isLogo = logoCol && cv.id === logoCol.id;
        for (const id of ids) {
          const a = assetById.get(id);
          if (!a?.public_url) continue;
          let ext = (a.name.split('.').pop() || 'png').toLowerCase();
          if (!/^(png|jpe?g|svg|webp)$/.test(ext)) ext = 'png';
          const dest = isLogo ? join(tdir, `logo.${ext}`) : join(tdir, `hero-${++hn}.${/^(jpe?g|png|webp)$/.test(ext) ? ext : 'jpg'}`);
          try { await download(a.public_url, dest); got = true; }
          catch (e) { report.mismatched.push({ kind: 'developer', folder: `monday:${it.name}`, reason: String(e.message) }); }
        }
      }
      if (!got) continue;
      const existing = manifest.developers[slug] || {};
      const entry = await processDeveloper(slug, it.name, tdir, report);
      if (entry) {
        manifest.developers[slug] = { ...existing, ...entry };
        if (existing.logo || existing.heroImages) report.matched[report.matched.length - 1].updated = true;
      }
    }
  } while (cursor);
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
}

// Monday — 社区（文件列探测；无 file 列 → 报告「素材列未建」跳过）。
async function runMondayCommunities(manifest, report) {
  if (DRY) { report.notes.push('Monday 社区模式需 sharp，当前无 sharp，跳过'); return; }
  let fileCols;
  try { fileCols = await probeFileColumns(COMM_BOARD_ID); }
  catch (e) { report.notes.push(`社区板 ${COMM_BOARD_ID} 列探测失败：${e.message}`); return; }
  if (!fileCols.length) {
    report.notes.push(`社区板 ${COMM_BOARD_ID} 上素材列未建（无 file 类型列），跳过社区对账`);
    return;
  }
  const colIds = fileCols.map((c) => `"${c.id}"`).join(',');
  const tmpRoot = join(INGEST_ROOT, '_monday-tmp-comm');
  if (!existsSync(tmpRoot)) mkdirSync(tmpRoot, { recursive: true });
  const Q = `query ($cursor: String) {
    boards(ids: [${COMM_BOARD_ID}]) {
      items_page(limit: 50, cursor: $cursor) {
        cursor
        items { id name assets { id name public_url } column_values(ids: [${colIds}]) { id value } }
      }
    }
  }`;
  let cursor = null;
  do {
    const data = await mondayFetch(Q, { cursor });
    const page = data.boards?.[0]?.items_page;
    if (!page) break;
    cursor = page.cursor;
    for (const it of page.items || []) {
      const c = getCommunityByName(it.name);
      const slug = c ? c.__slug : null;
      if (!slug) { report.mismatched.push({ kind: 'community', folder: `monday:${it.name}`, reason: '未匹配 communities.json' }); continue; }
      const assetById = new Map((it.assets || []).map((a) => [String(a.id), a]));
      const tdir = join(tmpRoot, slug);
      if (!existsSync(tdir)) mkdirSync(tdir, { recursive: true });
      let n = 0;
      for (const cv of it.column_values || []) {
        for (const id of assetIdsFromColValue(cv.value)) {
          const a = assetById.get(id);
          if (!a?.public_url) continue;
          let ext = (a.name.split('.').pop() || 'jpg').toLowerCase();
          if (!/^(jpe?g|png|webp)$/.test(ext)) ext = 'jpg';
          n += 1;
          const dest = join(tdir, `${String(n).padStart(2, '0')}.${ext}`);
          try { await download(a.public_url, dest); }
          catch (e) { report.mismatched.push({ kind: 'community', folder: `monday:${it.name}`, reason: String(e.message) }); }
        }
      }
      const existing = manifest.communities[slug] || {};
      const entry = await processCommunity(slug, it.name, tdir, report);
      if (entry) {
        manifest.communities[slug] = { ...existing, ...entry };
        if (existing.heroImages) report.matched[report.matched.length - 1].updated = true;
      }
    }
  } while (cursor);
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch {}
}

// ============================================================
// 主流程
// ============================================================
function loadManifest() {
  const base = {
    $schema: 'danfeng-assets-manifest/v1',
    generatedAt: null,
    note: '本地素材同步产物（scripts/sync-assets.mjs）。三段 projects/developers/communities 路径均为站内本地 /img 与 /brochures；禁止外链/Dropbox（见 guardrail-check.mjs 断言）。项目段分类感知：heroImages(hero_carousel+exterior) / detailImages(interior+feature_block) / areaImages(attraction_district) / cardImage(hero_carousel首张) / brochureCover(brochure_cover) / brochure(PDF) / heroVideo(video_hero_*→/video/<slug>/hero.mp4+poster.webp)。',
    projects: {},
    developers: {}, // logo / logoOriginal / heroImages（品牌 logo + 可选 hero）
    communities: {}, // heroImages / cardImage（社区图集 + 卡图）
  };
  if (existsSync(MANIFEST_JSON)) {
    try {
      const prev = JSON.parse(readFileSync(MANIFEST_JSON, 'utf8'));
      return { ...base, ...prev, projects: { ...(prev.projects || {}) }, communities: { ...(prev.communities || {}) }, developers: { ...(prev.developers || {}) } };
    } catch { /* 损坏则重建 */ }
  }
  return base;
}

async function main() {
  const manifest = loadManifest();
  const report = { mode: FROM_MONDAY ? 'monday' : 'local', dry: DRY, generatedAt: new Date().toISOString(), matched: [], mismatched: [], duplicates: [], notes: [] };

  if (DRY) console.warn('[sync] ⚠ 未检测到 sharp / ImageMagick(convert) → 干跑（map-only）：仅出映射与报告，不写图/PDF。Mac 端请先 `npm i` 再重跑以生成 webp。');
  else if (ENCODER === 'imagemagick') console.warn('[sync] ℹ 未检测到 sharp，改用 ImageMagick(convert) 压图（沙盒兜底；Mac 端建议 `npm i` 用 sharp）。');

  if (FROM_MONDAY) {
    await runMonday(manifest, report);
    await runMondayDevelopers(manifest, report);
    await runMondayCommunities(manifest, report);
  } else {
    await runLocal(manifest, report);
    if (ONLY) {
      // 2026-07-12：--only 除了老的「项目文件夹名」外，也支持定点验证新段：
      //   --only=dev-logos           → 只跑开发商 logo 扁平目录
      //   --only=binghatti / damac   → 只跑对应开发商图库并入
      //   --only=<community-heroes-来源目录名> → 只跑该来源
      //   --only=<社区名，如 "Al Furjan"> → 跨来源按优先级取最优，只处理这一个社区（验证落位用）
      const onlyLower = ONLY.toLowerCase();
      if (onlyLower === DEV_LOGOS_DIRNAME) {
        await runLocalDevLogosFlat(manifest, report);
      } else if (onlyLower === DAMAC_DIRNAME) {
        await runLocalDamacFolder(manifest, report);
      } else if (onlyLower === BINGHATTI_DIRNAME) {
        await runLocalBinghattiFolder(manifest, report);
      } else if (COMMUNITY_HERO_DIRNAMES.some((d) => d.toLowerCase() === onlyLower)) {
        await runLocalCommunityHeroesFlat(manifest, report, { onlySourceDir: ONLY });
      } else {
        const commOnly = getCommunityByName(ONLY);
        if (commOnly) {
          await runLocalCommunityHeroesFlat(manifest, report, { onlySlug: commOnly.__slug });
        } else {
          report.notes.push(`--only=${ONLY}：仅处理匹配项目文件夹，跳过开发商/社区段（未识别为 dev-logos/damac/binghatti/community-heroes*来源/社区名）`);
        }
      }
    } else {
      await runLocalDevLogosFlat(manifest, report);
      await runLocalCommunityHeroesFlat(manifest, report);
      await runLocalDamacFolder(manifest, report);
      await runLocalBinghattiFolder(manifest, report);
      await runLocalDevelopers(manifest, report);   // 老约定目录（emaar-ingest/developers/），当前不存在则自动跳过
      await runLocalCommunities(manifest, report);  // 老约定目录（emaar-ingest/communities/），当前不存在则自动跳过
      // 侦察后判定暂不解析的顶层文件夹 → 报告写清楚原因，不再是「未匹配」噪音。
      for (const [dirName, note] of Object.entries(SKIP_TOPLEVEL_NOTES)) {
        if (existsSync(join(DOWNLOADS, dirName))) report.notes.push(`跳过 downloads/${dirName}/：${note}`);
      }
    }
  }

  manifest.generatedAt = report.generatedAt;
  if (!DRY || !existsSync(MANIFEST_JSON)) {
    // 干跑且已有 manifest → 不覆盖真值（避免写入未生成的 webp 引用）；
    // 干跑且无 manifest → 写空骨架以便前端 import 不炸。
    if (DRY && existsSync(MANIFEST_JSON)) {
      // 保留既有，仅落干跑报告。
    } else {
      writeFileSync(MANIFEST_JSON, JSON.stringify(manifest, null, 2) + '\n');
    }
  }

  // —— 报告落盘 + 打印 ——
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
  writeFileSync(join(LOG_DIR, 'sync-assets-last-report.json'), JSON.stringify(report, null, 2) + '\n');

  const KINDS = [['project', '项目'], ['developer', '开发商'], ['community', '社区']];
  const upd = report.matched.filter((m) => m.updated).length;
  console.log('\n════════ 素材同步报告 ════════');
  console.log(`模式: ${report.mode}${DRY ? ' (dry/map-only)' : ''}  ·  匹配 ${report.matched.length}（含更新 ${upd}）  ·  失配 ${report.mismatched.length}  ·  重复 ${report.duplicates.length}`);
  for (const [k, label] of KINDS) {
    const mm = report.matched.filter((m) => m.kind === k);
    const mis = report.mismatched.filter((m) => m.kind === k);
    const dup = report.duplicates.filter((m) => m.kind === k);
    if (!mm.length && !mis.length && !dup.length) continue;
    console.log(`\n── ${label}：匹配 ${mm.length} / 失配 ${mis.length} / 重复 ${dup.length} ──`);
    for (const m of mm) {
      if (k === 'project') {
        console.log(`  ✓ ${m.folderName} → ${m.slug} | hero×${m.heroCount ?? 0}${m.detailCount ? ` detail×${m.detailCount}` : ''}${m.areaCount ? ` area×${m.areaCount}` : ''}${m.card ? ' +card' : ''}${m.cover ? ' +cover' : ''} | 楼书: ${m.brochure}${m.video ? ` | 视频: ${m.video}` : ''}${m.updated ? ' | [更新]' : ''}`);
      } else if (k === 'developer') {
        console.log(`  ✓ ${m.folderName} → ${m.slug} | logo: ${m.logo}${m.heroCount ? ` | hero×${m.heroCount}` : ''}${m.updated ? ' | [更新]' : ''}`);
      } else {
        console.log(`  ✓ ${m.folderName} → ${m.slug} | hero×${m.heroCount ?? 0}${m.card ? ' +card' : ''}${m.updated ? ' | [更新]' : ''}`);
      }
    }
    for (const m of mis) console.log(`  ✗ 失配: ${m.folder}  (${m.reason})`);
    for (const d of dup) console.log(`  ~ 重复源: ${d.folder} 撞 slug ${d.slug}（保留 ${d.keptFolder}）`);
  }
  for (const n of report.notes) console.log(`  · 提示: ${n}`);
  console.log(`\nmanifest: ${MANIFEST_JSON}${DRY && existsSync(MANIFEST_JSON) ? ' (干跑未覆盖)' : ''}`);
  console.log(`报告: ${join(LOG_DIR, 'sync-assets-last-report.json')}`);
}

main().catch((e) => { console.error('[sync] 失败:', e); process.exit(1); });
