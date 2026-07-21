# content/projects/*.json — 富内容项目详情页数据源（Schema v1）

每个文件对应一个项目 slug（与 `lib/catalog` 的 `projectSlug()` 一致），例如
`altan.json` → `/projects/altan`。**存在同名 JSON 时**，`app/projects/[slug]/page.jsx`
渲染**富内容版**（hero 图区 / 导语 / 卖点 / 户型表 / 付款计划 / 区位配套景观 /
楼书下载 / 视频位）；**不存在时**沿用既有骨架页（社区画像 + 开发商 DFP-5 背书），
两者共用同一套 Nav / Footer / CTA。首个样板：Altan（Emaar · Dubai Creek Harbour · DLD 3608）。

## 价格与合规护栏（🔴 生命线，见 memory `content-officer-handoff` §二）
- 本目录**只允许“开盘起价示意”口径**（`startFromAED` / `startFromLabel` / `intro` 文案）。
- **绝不写入**：单价 PSF、现价 Current Price、去化率/Sold Rate、Units Sold、可售套数、
  Available Units、开盘均价等任何“市场/实时”字段。这些字段即使在来源页面出现也一律丢弃。
- `guardrail-check.mjs` 会扫描本目录（`content/projects/*.json`）断言无上述敏感 token/键名。

## 素材管线（见 §三）
- **hero 图**：`sourceUrl` 登记开发商官方效果图直链；实际文件 re-host 到
  `public/projects/<slug>/`，页面只引用本地 `src`。**禁止生产环境热链**开发商/PF/Dropbox 图床。
- **楼书**：🔴 2026-07-10 起下架（LEO 指令）。Dropbox 链接=内部资料，**禁止**写入
  `brochureUrl` 或本目录任何字段——Monday「Dropbox」列不得直接落地前端数据层。
  `brochureUrl` 一律留空串；`SHOW_BROCHURE` flag（`lib/flags.js`）为 `false` 时前端
  按钮整体隐藏。资料就绪后须先迁移至非 Dropbox 的合规托管源，再回填并置 flag 为 `true`。
  `guardrail-check.mjs` 断言本目录与导出 JSON 不含 `dropbox.com` / `dropbox` 键名。
- **视频**：仅收录开发商官方 YouTube/Vimeo；搜不到官方源则 `video` 留空（页面隐藏视频区）。

## 字段字典（Schema v1）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `slug` | string | 与 catalog projectSlug 对齐 |
| `projectNumberDLD` | string | DLD 项目号（核对用，不展示为价格） |
| `name` / `cn` | string | 英文名 / 中文名 |
| `tagline` | string | 开发商标语（可空） |
| `developer` / `community` / `subCommunity` / `emirate` / `country` | string | 归属信息（开发商写**实际开发商**，绝不写“丹枫”） |
| `hero[]` | object[] | `{src, alt, caption, sourceUrl, credit}` — `src`=本地 re-host 路径；`alt` 必填（无障碍/SEO） |
| `intro` | string | 中文导语，~150 字，克制专业，基于官网真实信息，禁臆造 |
| `highlights[]` | string[] | 核心卖点 bullets（**段 3 核心亮点**数据源；3–5 条最佳，缺省时装配器程序化兜底） |
| `productDetails[]` | object[] | **段 5 产品细节（弹性章）** — `{title, body, image?}`，从楼书提炼；有则渲染（可多块），无则整章省略。详见下方「产品细节填法」 |
| `unitTypes[]` | object[] | `{type, sizeMinSqft, sizeMaxSqft, startFromAED, startFromLabel}` — 来自子项板，**仅起价示意** |
| `unitNote` | string | 户型表脚注（护栏口径） |
| `payment` | object | `{structure, milestones[]:{stage,percent,note}, note}` |
| `handover` | string | 交付时间（示意，以正式文件为准） |
| `location` | object | `{distances[], connectivity[]}` |
| `amenities[]` | string[] | 配套 |
| `views[]` | string[] | 景观/朝向要点 |
| `communityFacts[]` | string[] | 社区宏观事实（可空） |
| `brochureUrl` | string | 楼书直链（🔴 2026-07-10 起功能下架，禁用 Dropbox，一律留空；见上方素材管线说明） |
| `video` | string | 官方视频 URL，空串=隐藏视频区 |
| `meta` | object | `{sources[], updated, priceNote, imageNote, videoNote}` — 数据来源与更新时间，审计留痕 |

## 十段内容框架（LEO 定稿 2026-07-11 · v5 落地页渲染顺序）
`template:"v5"` 的项目走 `ProjectLandingV5`，按下列**十段**顺序渲染（编号即顺序）。
装配收敛在 `lib/projectPageData.js`，组件只摆放。弹性段无数据即整章省略。

| # | 段名 | 实现 section（组件） | 主要数据源 |
| --- | --- | --- | --- |
| 1 | 首屏展示 | `hero` | 图集 + `cn`/`name` + 售态(catalog.status) + 社区/开发商归属 |
| 2 | 项目概况 | `facts` + `overview` | 关键事实条 + `intro` 导语 + ov-stat（开发商/片区/通勤/付款） |
| 3 | 核心亮点 | `highlights`（编号排版） | **JSON `highlights[]` 优先**；缺省 → tags/gv/交付/DFP-5 程序化兜底 3–5 条 |
| 4 | 地段位置 | `location`（距离表） | `location.distances[]` / `connectivity[]`，缺则 catalog.location |
| 5 | 产品细节（弹性） | `productDetails`（图文块） | **JSON `productDetails[]`**，无则整章省略 |
| 6 | 公共配套 | `amenities` | JSON `amenities[]`，缺则 catalog.amenities |
| 7 | 户型价格 | `unit`（户型卡） | `unitTypes[]`：面积 / 套数 / 起价示意（护栏口径） |
| 8 | 社区生活 | `community` | 社区库 profile 片区卡 + `marketData` 参考价带（护栏）+ 进入社区页互链 |
| 9 | 开发商简介 | `developer` | 开发商库 DFP-5 评级带 + chip + 品牌一句话 + 进入开发商页互链 |
| 10 | CTA | `V5Cta`（三路径深色块） | AI 分析（对话+报告）+ 咨询顾问（微信）+ WhatsApp |

> 段 8 参考价 = 社区库 `marketData.unitPrices`（LEO 已授权对外），强制带
> 「公开行情参考 · 非实时报价」标 + 来源 + 护栏句，**非项目级报价**。项目级价格仍只出开盘起价示意。

### 产品细节填法（段 5 · 供内容官批量从楼书灌入）
`productDetails` 是一个块数组，每块把楼书里的一段「品牌 / 设计 / 建筑 / 空间 / 材料」故事化，
图文两栏交替渲染（含 `image` 出图；不含则回落图集本地图；`image:null` 出纯文本金线卡）。
```jsonc
"productDetails": [
  {
    "title": "建筑与到访体验",              // 小标题（楼书章节名口径）
    "body": "项目以壮观迎宾水景与挑高大堂开启到访动线……",  // 一段散文，克制专业，禁臆造/禁价格
    "image": {                              // 可选。省略则装配器回落图集本地图
      "src": "/img/projects/<slug>/hero-2.webp",  // 🔴 必须站内本地路径 /img·/projects
      "alt": "……效果图",                    // 必填（无障碍/SEO）
      "caption": "迎宾水景与挑高大堂"          // 可选，浮于图下
    }
  },
  { "title": "空间、光线与收口工艺", "body": "……", "image": null }  // image:null → 纯文本块
]
```
- 块数不限，建议 2–4 块（品牌 / 建筑 / 空间 / 材料各一）。写不出真素材 → 留空数组或删字段，整章自动省略。
- 图片一律走本地 re-host（同 hero 素材管线），禁热链开发商/PF/Dropbox 图床。
- 过渡兼容：旧 `finishes[]`（`{iconKey,title,desc}`）在无 `productDetails` 时会被装配器合成为块；
  新内容一律用 `productDetails`，`finishes` 视为**已弃用**。

## 来源优先级（见 SOP §0.5）
开发商官网 → DLD → DXB → PropertyFinder → Bayut。冲突时高优先级覆盖低优先级；
市场敏感字段一律不取。生成属**内容官**职责，录入员不碰本目录。
