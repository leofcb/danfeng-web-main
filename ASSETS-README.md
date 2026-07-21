# 素材管线目录约定（三类素材）— 给内容官/录入员

`scripts/sync-assets.mjs` 把本地缓存的原始素材压成站内 webp/PDF，写入
`public/img/…`、`public/brochures/…`，并登记到 `lib/data/assets-manifest.json`
（前端唯一读取源）。**只需把素材按下列约定放进文件夹，跑一条命令即可**：

```bash
npm run sync-assets            # 本地缓存 → 压图 + 更新台账（幂等，可反复跑）
npm run sync-assets -- --force # 忽略缓存强制重压
npm run sync-assets:monday     # 从 Monday 三板对账（需 MONDAY_TOKEN，仅 Mac 端）
```

跑完看终端「素材同步报告」——分**项目 / 开发商 / 社区**三类统计，失配文件夹会列出原因。

---

## 目录约定（素材缓存根 = `emaar-ingest/`，与 `danfeng-web/` 同级）

| 类型 | 放这里 | 文件命名 |
| --- | --- | --- |
| **项目**图 + 楼书 | `emaar-ingest/downloads/<项目名>/` | 图片带类目前缀 `hero_carousel__…` / `exterior__…` 等；楼书 `*.pdf`（≤15MB） |
| **开发商** logo（+ 可选 hero） | `emaar-ingest/developers/<品牌名>/` | `logo.png` / `logo.jpg` / `logo.svg` / `logo.webp`（**任选其一**）；可选 `hero-1.jpg`、`hero-2.jpg`… |
| **社区**图片 | `emaar-ingest/communities/<社区名>/` | `01.jpg` `02.jpg`…（**建议数字前缀定序**；支持 jpg/png/webp） |

- **文件夹名**用项目/品牌/社区的**英文名或常见别名**（下划线会自动转空格）。
  归一逻辑与前端 `lib/catalog.js` 完全一致：项目→catalog.json、开发商→developers.json
  （含 DAMAC/wasl/OCTA 等别名）、社区→communities.json（含 Bluewaters→Bluewaters Island
  等 `COMM_ALIAS` 别名、多平台名 Bayut/PF/DXB）。**匹配不上不会硬配**，只列进失配报告。
- 目录可用环境变量覆盖：`DANFENG_INGEST`（根）/ `DANFENG_DOWNLOADS` / `DANFENG_DEVELOPERS` / `DANFENG_COMMUNITIES`。

## 产物与压缩规格

| 类型 | 产物 | 规格 |
| --- | --- | --- |
| 项目 hero | `public/img/projects/<slug>/hero-N.webp` | 1920w q80 |
| 项目 card | `public/img/projects/<slug>/card.webp` | 640w q75 |
| 项目楼书 | `public/brochures/<slug>.pdf` | ≤15MB（超限试 ghostscript `/ebook` 压缩，仍超则跳过并报告） |
| 开发商 logo | `public/img/developers/<slug>/logo.webp` + 保留原格式一份 | 240w q90，**保留 alpha 透明底**；svg 原样拷贝 |
| 开发商 hero | `public/img/developers/<slug>/hero-N.webp` | 1920w q80 |
| 社区 hero | `public/img/communities/<slug>/hero-N.webp` | 1920w q80 |
| 社区 card | `public/img/communities/<slug>/card.webp` | 640w q75 |

## 护栏（🔴 生命线）
- 台账（`assets-manifest.json`）内**三段** `projects/developers/communities` 的图/楼书路径
  **一律只允许站内本地路径**（图 `/img/`、楼书 `/brochures/`）。任何 `http(s)://` 外链、
  协议相对 `//host`、Dropbox 链接 → `scripts/guardrail-check.mjs` 判泄漏、退出码 1。
  **禁止生产环境热链**开发商/PF/Dropbox 图床——素材必须 re-host 进 `public/`。
- 无素材 = 现状：前端所有渲染点**优雅回退**（无图不显图，评级/画像照常）。

## 前端渲染点（有图才显示，克制不喧宾夺主）
- **开发商 logo**：`/developers` 评级榜行、开发商卡（首页 + 研究库表格）、开发商详情 Hero、
  `DeveloperRatingCard`——小徽标位，评级仍是主角。
- **社区图**：`CommunityCard` 卡顶图区（同 ProjectCard 模式，等高对齐）、社区详情 Hero 图集。
- **项目页**：现状不变（卡顶 card 图 + 详情 hero 图集，早已上线）。

## Monday 对账模式说明
- 项目板 `3916277144`：文件列已建（Hero Images / Brochure）。
- 开发商板 `6350528756` / 社区板 `18420441803`：**文件列运行时探测**（找 `type=file` 的列）。
  当前若板上尚未建素材列 → 报告「板上素材列未建」并**跳过该板**（不报错）。建列后自动生效
  （开发商板：列标题含 `logo` 的当 logo，其余当 hero；社区板：所有文件列当 hero）。
