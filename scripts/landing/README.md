# 落地页生成器（WEB-LP-V1.3）

把"读楼书→出页→接入"里**重复的机械部分**脚本化。内容官只写一个 JSON，生成器出页并自动接入。

## 一个新项目的流程

1. **内容官（读楼书 + 项目库）**：备好素材，写数据 JSON
   - 9+ 张效果图转 webp，按母版资产名放入 `deliverables/<slug>/assets/`
     （hero-aerial / courtyard-aerial / facade / courtyard-green / water-feature /
     interior-1 / interior-2 / bedroom / coworking / kids-club / lobby / retail-cafe /
     location-map + 2 个二维码 danfeng-website-qr.png / danfeng-wechat-qr.png）
   - 9 张 hero 上传图放 `deliverables/<slug>/hero-images/`（供 Monday 上传）
   - 复制 `talea.json` 为 `<slug>.json`，按楼书+项目库改内容（含 mondayItemId）

2. **生成**：
   ```
   node danfeng-web/scripts/gen-landing.mjs <slug>
   ```
   自动产出 `deliverables/<slug>/index.html`（预览）+ `public/projects/<slug>/index.html`（部署，
   绝对图路径）+ 复制 assets + 登记 `lib/standalonePages.js` + `publish-landing.sh` 的 ITEM 映射。

3. **上线**（Mac，一条命令）：
   ```
   MONDAY_TOKEN='xxx' bash danfeng-web/scripts/publish-landing.sh <slug> upload
   ```

## 说明
- 静态外壳（CSS `_styles.html` + Gallery JS `_gallery.html`）从 Talea 抽出，所有项目共用；改母版只需换这两个文件。
- 开发商默认 Beyond（`BEYOND_DEV` 常量）；非 Beyond 项目在 JSON 加 `"developer": { "name": "...", "html": "..." }` 覆盖。
- 护栏：JSON 只写起价示意 / 户型套数 / 面积，绝不写 PSF / 现价 / 去化。
- `talea.json` 是参考样例（含全部字段）。
