#!/bin/bash
# ============================================================
# refresh-from-monday.sh — 从 Monday 一键全库刷新（项目+开发商+社区）并部署
# 手动：bash scripts/refresh-from-monday.sh
# 定时：launchd(com.danfeng.refresh) 每晚凌晨 3 点自动调用
# 需：Mac 真机(外网) + MONDAY_TOKEN(环境变量或 ~/.zshrc)
# ============================================================
set -uo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)" || exit 1     # → danfeng-web
mkdir -p agent-logs
LOG="agent-logs/refresh-$(date +%F).log"
{
  echo "════ 从 Monday 全库刷新  $(date) ════"
  export MONDAY_TOKEN="${MONDAY_TOKEN:-$(grep -o 'MONDAY_TOKEN="[^"]*"' "$HOME/.zshrc" 2>/dev/null | head -1 | sed 's/.*="//;s/"//')}"
  if [ -z "${MONDAY_TOKEN:-}" ]; then echo "✗ 找不到 MONDAY_TOKEN"; exit 1; fi

  echo "① 导出三板（项目/开发商/社区）→ raw-*.json"
  node scripts/export-monday-data.mjs || { echo "✗ 导出失败"; exit 1; }

  echo "② 重建三库数据（名字/项目数自动对齐 Monday）"
  node scripts/build-catalog.mjs      || { echo "✗ build-catalog 失败"; exit 1; }
  node scripts/build-developers.mjs   || { echo "✗ build-developers 失败"; exit 1; }
  node scripts/build-communities.mjs  || { echo "✗ build-communities 失败"; exit 1; }

  echo "③ 同步 Monday 图片（增量补齐缺图：项目/开发商/社区）"
  node scripts/sync-assets.mjs --from-monday || echo "⚠ 图片同步有告警，继续"

  echo "④ 防覆盖门校验"
  node scripts/verify-curated-project-pages.mjs || { echo "✗ 校验失败，中止部署"; exit 1; }

  echo "⑤ 提交并推送（触发 Vercel 部署）"
  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "自动刷新: Monday 全库(项目+开发商+社区)数据+图片同步 $(date +%F_%H:%M)"
    git push && echo "✅ 已推送，Vercel 自动部署"
  else
    echo "✓ 无变化，无需部署"
  fi
  echo "════ 完成  $(date) ════"
} 2>&1 | tee "$LOG"
