#!/usr/bin/env node
// ============================================================
// 专版页存在性校验门（防双方部署漏页覆盖生产域名）
// ------------------------------------------------------------
// 唯一权威生产源 = 系统/danfeng-web。构建前(prebuild)自动运行；
// curated-project-pages.json 列出的每个专版页，其静态文件 + 路由登记
// 只要缺一个 → exit 1 → Vercel 构建失败，绝不让残缺站覆盖生产。
// 背景：曾出现两个工作目录各自 vercel --prod 直推同一生产项目，
//       后推者把前者的专版页全部覆盖成 404。此门即为杜绝该问题。
// ============================================================
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
// 唯一保护清单（对齐 CLAUDE/CODEX 协作规则 §2）：content/curated-project-pages.json
const MANIFEST = join(WEB, 'content', 'curated-project-pages.json');
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let sp = '';
try { sp = readFileSync(join(WEB, 'lib', 'standalonePages.js'), 'utf8'); } catch { /* 允许缺失，仅跳过路由核对 */ }

const groups = [
  ['projects', 'STANDALONE_PROJECT_SLUGS', (s) => `public/projects/${s}/index.html`],
  ['developers', 'STANDALONE_DEVELOPER_SLUGS', (s) => `public/developers/${s}/index.html`],
  ['communities', 'STANDALONE_COMMUNITY_SLUGS', (s) => `public/communities/${s}/index.html`],
];

const missingFile = [], unregistered = [];
for (const [key, arrName, pathOf] of groups) {
  for (const slug of (manifest[key] || [])) {
    if (!existsSync(join(WEB, pathOf(slug)))) missingFile.push(pathOf(slug));
    if (sp && !new RegExp(`${arrName}[^\\]]*['"]${slug}['"]`).test(sp)) unregistered.push(`${arrName} 未登记 '${slug}'`);
  }
}

if (missingFile.length || unregistered.length) {
  console.error('\n✗ 专版页校验失败 —— 拒绝构建，防止漏页覆盖生产域名：');
  missingFile.forEach((m) => console.error(`   缺静态页文件: ${m}`));
  unregistered.forEach((u) => console.error(`   路由未登记: ${u}`));
  console.error('\n补齐后再构建/部署。清单见 content/curated-project-pages.json。');
  console.error('（唯一权威生产源=系统/danfeng-web；任何一方都不得部署残缺站。）\n');
  process.exit(1);
}

const pend = manifest.pendingFromCodex || [];
const n = (k) => (manifest[k] || []).length;
console.log(`✅ 专版页校验通过：projects ${n('projects')} · developers ${n('developers')} · communities ${n('communities')} —— 静态页与路由登记齐全。`);
if (pend.length) console.log(`ℹ 待并入（Codex 专版页，套用 WEB-LP-V1.3 标准后加入 projects 并从 pendingFromCodex 移除）: ${pend.join(', ')}`);
