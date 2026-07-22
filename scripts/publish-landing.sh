#!/usr/bin/env bash
# ============================================================
# 独立落地页发布脚本
# 用法（Mac 终端，在 danfeng-web 目录）：
#   部署（默认，不碰图片）：           bash scripts/publish-landing.sh sensia
#   上传hero图并部署（先清空再传9张）： MONDAY_TOKEN='xxx' bash scripts/publish-landing.sh sensia upload
#
# 设计要点：
#   - 上传是"显式开关"(第二参数 upload)，不再因环境里残留 MONDAY_TOKEN 而误传。
#   - upload 模式"先清空该列再传 9 张"，幂等：跑一次或十次，结果都恰好 9 张，杜绝重复。
#   - 部署走 Vercel CLI(.vercel 已链接)，远端构建；自动规避过新 Node(如 25)。
#   - token 只经环境变量使用，不落文件。新项目在下方 case 登记 slug→item_id。
# ============================================================
set -euo pipefail

slug="${1:?用法: bash scripts/publish-landing.sh <slug> [upload]}"
mode="${2:-deploy}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO="$(cd "$WEB/.." && pwd)"
HERO_DIR="$REPO/deliverables/$slug/hero-images"
BOARD_ID=3916277144
COLUMN="file_mm54knz0"

case "$slug" in
  hado)   ITEM_ID=10761484212 ;;
  sensia) ITEM_ID=8613409455 ;;
  talea)  ITEM_ID=9567978068 ;;
  aria)   ITEM_ID=12462704939 ;;
  arancia-yards-2) ITEM_ID=12462563248 ;;
  passo-by-beyond) ITEM_ID=9786291705 ;;
  kanyon) ITEM_ID=18387155771 ;;
  soulever) ITEM_ID=18145456982 ;;
  31-above) ITEM_ID=18378633686 ;;
  saria)  ITEM_ID=8113423887 ;;
  the-mural) ITEM_ID=8871921099 ;;
  orise)  ITEM_ID=12462704764 ;;
  *)      ITEM_ID="" ;;
esac

[[ -f "$WEB/public/projects/$slug/index.html" ]] || { echo "✗ 未找到 public/projects/$slug/index.html"; exit 1; }

# —— 上传 hero 图（仅在 mode=upload 时；先清空该列再传，天然幂等）——
if [[ "$mode" == "upload" ]]; then
  : "${MONDAY_TOKEN:?upload 模式需要 MONDAY_TOKEN}"
  [[ -n "$ITEM_ID" ]] || { echo "✗ slug=$slug 未登记 Monday item id"; exit 1; }
  [[ -d "$HERO_DIR" ]] || { echo "✗ 未找到 $HERO_DIR"; exit 1; }

  echo "▶ 清空 Hero Images 列（去除历史/重复）..."
  curl -s https://api.monday.com/v2 -H "Authorization: $MONDAY_TOKEN" -H "Content-Type: application/json" \
    -d "{\"query\":\"mutation{change_column_value(item_id:$ITEM_ID,board_id:$BOARD_ID,column_id:\\\"$COLUMN\\\",value:\\\"{\\\\\\\"clear_all\\\\\\\":true}\\\"){id}}\"}" >/dev/null
  sleep 1

  echo "▶ 上传 9 张 hero 图 → Monday item $ITEM_ID ..."
  shopt -s nullglob
  for f in "$HERO_DIR"/*.webp; do
    curl -s -X POST https://api.monday.com/v2/file \
      -H "Authorization: $MONDAY_TOKEN" \
      -F "query=mutation add(\$file: File!){ add_file_to_column(item_id: $ITEM_ID, column_id: \"$COLUMN\", file: \$file){ id } }" \
      -F 'map={"1":["variables.file"]}' \
      -F "1=@$f" >/dev/null && echo "    ✓ $(basename "$f")"
  done
else
  echo "▶ 仅部署（未传 upload 参数，跳过图片上传）"
fi

# —— 部署（Vercel 远端构建）——
cd "$WEB"
node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "${node_major:-0}" -ge 23 ]; then
  echo "▶ Node $node_major 不受 Vercel CLI 支持，尝试切到 Node 20/22 ..."
  switched=""
  # 1) nvm
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    { nvm use 20 >/dev/null 2>&1 || nvm use 22 >/dev/null 2>&1; } && switched=1
  fi
  # 2) Homebrew node@20 / node@22（brew install node@20 后自动识别）
  if [ -z "$switched" ]; then
    for v in 20 22; do
      for base in /opt/homebrew /usr/local; do
        if [ -x "$base/opt/node@$v/bin/node" ]; then export PATH="$base/opt/node@$v/bin:$PATH"; switched=1; break 2; fi
      done
    done
  fi
  if [ -n "$switched" ]; then
    echo "    现用 Node: $(node -v)"
  else
    echo "  ⚠ 未找到可用的 Node 20/22。任选其一安装后重跑本脚本（会自动识别）："
    echo "      brew install node@20"
    echo "      或  nvm install 20"
    exit 1
  fi
fi

echo "▶ 部署到 Vercel ..."
npx vercel --prod
echo "✅ 完成 → https://danfengproperties.com/projects/$slug"
