# 丹枫置业 Danfeng Properties · 前端工程版（Next.js）

AI 驱动的阿联酋期房智能投顾平台。由 1.0 单文件原型拆分为正规多文件 Next.js 工程，
并接入 Dify 后端。**核心原则不变：只匹配到「项目」层面，绝不报实时价格，资料给透、价格留给顾问。**

## 快速开始

```bash
cd danfeng-web
npm install
cp .env.example .env.local   # 按需填入 Dify / 留资 Webhook
npm run dev                  # http://localhost:3000
```

> 未配置 Dify 时，站点照常运行：对话提示「实时 AI 未连接」，匹配报告回落到
> 本地规则兜底并清晰标注「演示匹配」。配置后自动切换为 Dify + Claude 实时生成。

## 目录结构

```
danfeng-web/
├─ app/
│  ├─ layout.jsx            # 根布局、字体、SEO metadata
│  ├─ page.jsx              # 首页（组合各区块）
│  ├─ globals.css           # 品牌样式（自 1.0 原型完整保留）
│  └─ api/
│     ├─ chat/route.js      # 对话代理 → Dify（密钥仅服务端）
│     ├─ report/route.js    # 报告代理 → Dify，返回结构化 JSON
│     └─ lead/route.js      # 留资 → n8n Webhook → monday.com + 企业微信
├─ components/
│  ├─ AdvisorProvider.jsx   # 投顾状态与对话/报告逻辑（Context）
│  ├─ Nav / Hero / Console / MessageList / ReportCard
│  ├─ WhyUAE / Projects / Vip / About / Contact / Footer
├─ lib/
│  ├─ catalog.js            # 项目目录（仅 AI 可读字段，客户端安全）
│  ├─ prompts.js            # 两段系统提示词（源真相，粘贴进 Dify）
│  ├─ dify.js               # 服务端 Dify 客户端（server-only）
│  ├─ localMatch.js         # 本地匹配兜底（演示用）
│  └─ format.js             # 轻量 Markdown 渲染
└─ public/
   ├─ logo-mark.png         # 品牌红色 H/M 字标
   └─ projects/tilal-binghatti-cn.html  # 已完成的项目落地页（模板样例）
```

## 智能匹配引擎（lib/match.js · 多因子加权）

`runMatch(PROJECTS, profile)` —— 离线、确定性、可解释：

1. **硬过滤**：排除 `Sold`；酋长国 / 物业类型偏好（结果过少自动松弛）；预算上限。
2. **多维加权打分**（权重随目标动态调整，偏重预算贴合 / 黄金签证 / 片区增值）：
   预算贴合、黄金签证适配、社区分层(S/A/B 增值潜力)、目标契合(租金/增值/自住/教育)、
   交付时间、物业类型、付款友好度、自然语言关键词(海滩/高尔夫/学区/家庭…)。
3. **分数拉开 + 跨社区去重**（MMR）：Top 3 尽量来自不同社区，避免同质化。
4. **项目专属理由**：从真实字段动态生成（起价、社区分层、交付年、付款计划、GV 门槛）。

预算口径：¥ 区间快选（内置 ¥→AED ≈1.95 汇率换算）+ AED 精确预算输入框（填了优先）。
后端接 Dify 后，本引擎可作为「硬筛 + 粗排」前置层，把 271 缩到十几个再交 Claude 精排。

## 价格护栏（实现层面）

1. `lib/catalog.js` 只含「AI 可读」字段——绝不含 `basePrice / commission / allocation / livePrice`。
   这些「仅顾问可见」字段不进入前端包，也不进入任何发往 AI 的上下文。
2. 报告由 AI 只产 `{intro, matches:[{name, matchScore, reasons}], gvPath}`；
   项目详情（简介/位置/户型/付款结构/起价示意）由前端**按 `name` 从 catalog 回填**，
   AI 全程不接触价格。
3. 对话与报告系统提示词（`lib/prompts.js`）硬性要求：只从目录推荐、不报实时价格、
   问到具体房源/价格统一引导顾问微信。
4. 报告卡、对话、项目落地页一律带价格护栏文案与 AI 免责声明。

## Dify 对接（Phase 0）

1. 在 Dify Cloud 建两个应用（或一个应用两种用途）：
   - **对话用**：粘贴 `lib/prompts.js` 的 `SYSTEM_CHAT_BASE`，配 Claude，
     用 Dify 知识库导入项目目录（`catalogText()` 的内容）。
   - **报告用**：粘贴 `SYSTEM_REPORT_BASE`，要求只输出 JSON。
2. 取得各应用的 App API Key，填入 `.env.local`：
   `DIFY_API_BASE`、`DIFY_CHAT_KEY`、`DIFY_REPORT_KEY`。
3. 前端无需改动——`/api/chat`、`/api/report` 自动切换到 Dify。

## 数据层（1.0 版：Emaar 271 个迪拜期房）

站点已接入**真实项目库**——从 monday.com「Projects: Off-Plan」(board `3916277144`)
按 `Developer = Emaar` 导出的 **271 个迪拜期房项目**。

- `lib/data/raw-emaar.json` —— 从 monday 原样抽取的字段（provenance，不被打包）。
- `lib/data/emaar-catalog.json` —— 转换后的「仅 AI 可读」目录（被 `lib/catalog.js` 引用、打包）。
- 转换规则（价格护栏）：
  - **保留开盘起价**（`startHint` 文本 + `priceAED` 数值，供预算筛选与展示）。
  - **剔除** Primary/Current Price、PSF、Units Sold、Sold Rate（去化率）等市场/实时字段——
    既不导出、不进前端包、也不进任何发往 AI 的上下文（已构建产物校验）。
  - 黄金签证适配由起价推导（≥AED 200 万→适配；1.5–2M→部分大户型可达；<1.5M→门槛以下）。
- 刷新数据：重新从 monday 导出 → 覆盖 `emaar-catalog.json` → 重新构建即可（后续由 n8n 自动化）。
- 首页「精选期房」展示各片区代表项目，AI 投顾匹配覆盖全部 271 个项目。

## 待替换占位（见交接说明第 12 节）

- 页脚联系信息、RERA / Trakheesi 牌照号 → `.env.local` 的 `NEXT_PUBLIC_*`
- 留资微信二维码 + WeChat ID（`components/Contact.jsx` 的 `.qr` 区）
- 项目中文名（`cn`）当前为空 → 可后续在 monday 增列并回填
- 项目落地页：Emaar 项目暂用开发商官网链接，后续可按模板自建中文落地页
