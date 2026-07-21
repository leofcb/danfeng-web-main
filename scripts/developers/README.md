# 开发商页生成器（WEB-DEV-V1 · 评级前置定稿版）

把"读开发商库 + 官网 → 出档案页 → 接入"里**重复的机械部分**脚本化。内容官只写一个 JSON，生成器出页并自动接入。母版 = `deliverables/developers/beyond/`（LEO 2026-07-19 定稿）。

## 锁版结构（固定段顺序，全量沿用）

1. **①Hero** — 品牌名 + 副标 + 简介 + 双按钮（获取项目清单 / 浏览代表作品）
2. **②数据栏 facts** — 7 格，含 DFP-5 评级 chip + DXB 排名
3. **③评级面板（前置）** — `#rating`：上层速览（大分数 + 枫叶 + 版本 + 置信/覆盖 + 一句研判 + 3 核心指标）+ 下层五维可视化（雷达图 + 五维条形 + 维度分值 + **方法论链接**）。`rating.dims` 五维只填真值，缺维绘 0/标「暂无」+ 脚注（禁补分）。NR 家上层降级为「未评级 NR + 为何未评级 + 3 个 DXB 指标」、下层五维面板不出。
4. **④品牌理念** — `#overview`：品牌故事 + 4 metric
5. **⑤品牌支柱** — `#pillars`：N 条信条（图 + 列表）
6. **⑥历史战绩 Track Record** — `#record`：DXB 战绩 facts + trackRecord 要点（脏/空则兜底不出）+ 户型结构 + 出处（五维已上移③，此处不重复）
7. **⑦代表作品** — `#portfolio`：大盘/masterplan 图文
8. **⑧在售项目** — `#projects`：关联落地页卡片 + 「更多」
9. **⑨活跃社区 Communities（必须板块）** — `#communities`：**与在售项目同款图文卡片网格（proj-grid）**，每社区 img（复用大盘真图）+ pill + 名称 + 描述 + 「查看社区 ›」，链 `/communities/<slug>`，项目/开发商/社区三库互链枢纽。链前确认社区页 display=true。
10. **⑩CTA** — `#cta`：AI 投顾 + 微信顾问双路径

**弹性段（JSON 有该 key 才渲染，插槽在支柱与战绩之间，自动进导航）**：
- `special` 品牌联名/特别补充（如 BEYOND×PSG，锚点 `#special`，插槽：**支柱后 / 战绩前**）
- `milestone` 发展里程（锚点 `#milestone`，插槽：联名后 / 战绩前）

导航基础锚点（首页/评级/理念/支柱/战绩/作品/项目/社区/咨询），联名/历程在场时自动插入。

## 一个新开发商的流程

1. **内容官（读开发商库 6350528756 + 官网）**：备素材 + 写 JSON
   - hero/大盘/代表作/logo/项目卡缩略图 转 webp（含扩展名），放 `deliverables/developers/<slug>/assets/`
   - 二维码 `danfeng-website-qr.png` / `danfeng-wechat-qr.png` 同放 assets
   - 复制 `beyond.json` 为 `<slug>.json`，按库+官网改内容
2. **生成**：`node danfeng-web/scripts/developers/gen-developer.mjs <slug>`
   自动产出 deliverables（预览）+ public（部署，绝对图）+ 复制 assets + 登记 `lib/standalonePages.js` 的 `STANDALONE_DEVELOPER_SLUGS`。
3. **接入（首次已完成，后续新增开发商无需再改）**：
   - `next.config.mjs` beforeFiles 已对 `STANDALONE_DEVELOPER_SLUGS` 全量重写
   - `app/developers/[slug]/page.jsx` 已 `generateStaticParams` 排除 + `notFound()` 守卫
   - 新增开发商只需 slug 进 `STANDALONE_DEVELOPER_SLUGS`（生成器自动做）
4. **上线**（Mac）：`cd danfeng-web && npm run build && vercel --prod`

## 护栏（硬约束）
- JSON 绝不写具体现价 / 剩余套数 / 折扣 / PSF / 去化数字 / CRM 字段 / 人工星评 / Danfeng Tier。
- 资本增值、销售额一律「历史市场事实」，不写「预期收益 / 保证增值」。
- d 维（法律合规）措辞用「合规覆盖 / 登记合规」，禁「资金安全 / 保本」。
- `rating.dims` 五维值**只填评级 agent 真实导出的 a–e**（来自 developers.json 的 dfp5.dims），某维无数据设 `"v": null`（雷达绘 0、条形标「暂无」+ 脚注），禁臆造/补 0 分冒充。
- `record.bullets` trackRecord 脏/无结构时留空 `[]`，前端不显示（兜底）。
- 开发商归属写**实际开发商**，绝不写"丹枫置业/Danfeng"（丹枫=我方持牌经纪，非开发商）。

## 说明
- 静态外壳 `_dev-styles.html`（CSS + reveal/nav JS 由生成器内联）所有开发商共用；改母版只需换这个文件后重跑各 slug。
- `beyond.json` 是参考样例（含全部固定段 + special 弹性段示例；milestone/communities 缺省示范弹性）。
