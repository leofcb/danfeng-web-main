# 社区落地页生成器（WEB-COMM-V1）

把「读社区库 + 官方资料 → 出社区落地页 → 接入」里**重复的机械部分**脚本化。内容官只写一个 JSON，生成器出页并自动接入。母版 = `deliverables/communities/business-bay/`（Business Bay 商业湾，LEO 2026-07-20 定标准模版）。

## 锁版结构（10 段 · LEO 标准模版）

1. **①Hero** — 社区名 + EN 身份 + 简介 + 双按钮 +（可选热门徽标）+ 4 格数据栏。无 hero 图时用暗金渐变兜底（`hero.img` 可覆盖为实景图）。
2. **②社区画像/简介** — `#profile`：blurb 段落 + tags + 身份表（分类/DLD区域/编号/物业）
3. **③社区市场数据（DLD）** — `#data`：`market` 社区级市场 stat（近12月成交/中位尺价/**社区租金回报=毛收益**/未来供应/售出率/流动性 + YoY 涨跌 chip）。**回报率用社区级毛收益，不用户型 ROI（不准确）**；数据来源迪拜土地局 DLD。
4. **④位置交通** — `#location`：实时 Google 地图 embed + 到各地标/核心区时间距离 + 通达说明
5. **⑤社区配套** — `#amenities`：图文视觉卡（图标艺术顶图或 `img` 实景 + 富清单），分类=商场零售/教育/健身康乐…
6. **⑥生活方式** — `#lifestyle`：图文视觉卡（深色艺术顶图或 `img` + 标题 + 描述）
7. **⑦活跃开发商** — `#developers`：图文卡（名 + cn + 在售项目数 + 「查看开发商评级」），链 `/developers/<slug>`
8. **⑧精选项目** — `#projects`：首页式富数据图文卡（状态 + 名/cn + 户型/交付 + 起价示意 + 标签）+「更多 N 个」链 `/projects?commId=<DXBC>`
9. **⑨相似社区** — `#similar`：图文卡（名 + EN + 一句画像），链 `/communities/<slug>`（须 display=true）
10. **⑩CTA** — `#cta`：AI 投顾 + 微信顾问双路径

## 一个新社区的流程

1. **内容官（读社区库 18420441803 + 官方资料）**：写 JSON
   - 复制 `business-bay.json` 为 `<slug>.json`，按社区库 profile（blurbCn/tags/location/amenities/lifestyle）+ marketData（户型参考价/ROI）+ catalog（子项目/开发商聚合）填
   - **唯一图资产** = 2 个二维码 `danfeng-website-qr.png` / `danfeng-wechat-qr.png` 放 `deliverables/communities/<slug>/assets/`（可从任一已有 deliverable 复制）；hero 实景图可选（`hero.img`）
2. **生成**：`node danfeng-web/scripts/communities/gen-community.mjs <slug>`
   自动出 deliverables（相对图）+ public（绝对图）+ 复制 assets + 登记 `STANDALONE_COMMUNITY_SLUGS`。
3. **接入（首次已完成，后续新社区无需再改）**：`next.config.mjs` 已对 `STANDALONE_COMMUNITY_SLUGS` 全量重写；`app/communities/[slug]/page.jsx` 已排除 + notFound 守卫。新社区只需 slug 进数组（生成器自动）。
4. **上线**（Mac）：`cd danfeng-web && npm run build && vercel --prod`

## 护栏（硬约束，LEO 2026-07-20 更新）
- 🔴🔴 **全网只提迪拜土地局（DLD），绝不出现 DXB Interact / PropertyFinder(PF) / Bayut 等外部平台名**。市场数据来源统一写「迪拜土地局 DLD」。
- 🔴 **社区回报率用社区级毛收益（Gross Yield，Monday 板 numeric_mm4x2k84），不用子项目户型 ROI（虚高不准）**。Business Bay：社区毛收益 5.85%（户型表那种 11–15% 是错的）。
- **社区市场数据可对外**（LEO 定：Monday 数据基本可提供）：近12月成交、中位尺价、社区租金回报、未来供应、售出率、流动性 + YoY，均标 DLD 来源、「历史行情参考·非收益承诺」。
- 项目卡起价 = catalog 开盘示意价，标「开盘示意·非实时报价」。
- 🔴 **全网禁用内部黑话**（如「含子项目聚合」「丹枫库收录」）；平台对外，用客户能懂的话。
- 相似社区链接前确认目标社区 display=true，防死链。
- 图片：无实景图用象牙白渐变/图标艺术兜底，绝不抓竞品经纪站图/带水印图（[[content-officer-handoff]] §二·C）；`amenities[].img` / `lifestyle[].img` / `hero.img` 支持后续填实景图。

## 说明
- 静态外壳 `_comm-styles.html`（CSS + reveal/nav JS 由生成器内联）所有社区共用；改母版只换这个文件后重跑各 slug。
- `business-bay.json` 是参考样例（含全部 10 段字段）。
