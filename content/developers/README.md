# content/developers/*.json — 开发商详情页「内容层」数据源（Schema v1）

每个文件对应一个开发商 slug（与 `lib/catalog` 的 `developerSlug()` 一致），例如
`emaar.json` → `/developers/emaar`。**存在同名 JSON 时**，
`app/developers/[slug]/page.jsx` 在既有「纯数据模板」（评级面板 + 数据仪表）之上
**渐进增强**出一层叙事内容（品牌故事 / 发展里程碑 / 代表作品 / 业务版图）；
**不存在时**沿用既有数据页，零回归——与项目页 `content/projects/*.json` 同一模式。

叙事内容插在 ② 关键数据仪表之后、③ 履历观点之前的合理阅读位。

## 合规护栏（🔴 生命线）
- 本目录内容层**只承载研究叙事事实**（出身/里程碑/代表作/业务线），
  **绝不写入任何价格数字**：单价 PSF、现价、开盘价、销售额 AED 数字、去化率、
  可售套数等一律不写（交付「套数/项目数」为运营规模事实，非价格，允许）。
- **绝不写外链**：开发商官网 / PF / Bayut / 第三方任何 URL 都不进入本目录字段
  （站内互链走 `librarySlug` 或自动名称匹配，指向 `/projects/<slug>`）。
- `guardrail-check.mjs` 会扫描本目录（`content/developers/*.json`），断言：
  ① 无价格敏感 token / Monday 敏感列 id / CRM 键名；② 无 `http(s)://` 外链、
  无 `dropbox`；③ 无 Monday CRM 禁列。命中即退出码 1。

## 事实纪律（内容官 SOP）
- 每条事实须**两源可证**（开发商官网 / DLD / DXB / 权威第三方）**或库内已有**
  （developers.json 的 `trackRecord` / `blurbCn` 即库内权威层，可直接采信）。
- **里程碑年份必须有出处**——拿不准年份的事件只入「代表作品」（无年份）或不写。
- 语气：克制、第三方研究视角。禁广告腔（「卓越品质值得信赖」不行），
  禁催单，禁臆造。

## 字段字典（Schema v1）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `slug` | string | 与 catalog developerSlug 对齐（必填，渲染键） |
| `name` / `cn` | string | 英文名 / 中文名（展示辅助，权威归属仍以 developers.json 为准） |
| `brandStory` | string | 品牌故事，150–250 字中文研究腔（出身/定位/风格，非官网软文直译） |
| `milestones[]` | object[] | `{year, title, desc}` — 4–6 条时间线；`year` **必须有出处** |
| `flagships[]` | object[] | `{name, cn, positioning, librarySlug?}` — 3–4 个代表作品；`positioning`=一句话定位；`librarySlug` 可选，命中库内在售项目即互链（留空则模板按 `name` 自动匹配 projectsByDeveloper） |
| `business` | string | 业务版图一段话（产品线/片区布局/联名品牌/海外足迹） |
| `meta` | object | `{sources[], updated, notes}` — 来源清单与更新时间，审计留痕 |

## 来源优先级
开发商官网 → DLD → DXB → 权威第三方（Wikipedia/DBpedia 用于年份交叉核验）。
库内 `trackRecord`/`blurbCn` 视作已交叉核验的权威层。冲突时高优先级覆盖低优先级；
价格敏感字段与外链一律不取。
