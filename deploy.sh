#!/usr/bin/env bash
# 掌柜工具箱 GitHub Pages 一键部署脚本（登录完成后执行）
set -euo pipefail
cd /root/workspace/zhanggui-toolbox

LOGIN=$(gh api user -q .login)
echo "== GitHub 账号: $LOGIN"

if gh repo view "$LOGIN/zhanggui-toolbox" >/dev/null 2>&1; then
  echo "== 仓库已存在，跳过创建"
else
  echo "== 创建公开仓库 zhanggui-toolbox"
  gh repo create zhanggui-toolbox --public --source . --remote origin \
    --description "掌柜工具箱：报价单/对账/排期/记账，小生意一站式 Web 工具（PWA、纯前端、数据本地）" \
    --push
fi

echo "== 推送代码（含 Pages 部署工作流）"
git push -u origin main 2>/dev/null || git push -u origin master

echo "== 启用 GitHub Pages（workflow 构建）"
gh api "repos/$LOGIN/zhanggui-toolbox/pages" -X POST -f build_type=workflow \
  || echo "!! Pages API 启用失败，需在网页端手动开启（见下方说明）"

echo "== 触发部署工作流"
gh workflow run deploy.yml || echo "!! 手动触发失败，push 已自动触发"

echo ""
echo "== 完成。正式网址: https://$LOGIN.github.io/zhanggui-toolbox/"
echo "== 若 Pages 启用失败：仓库页 → Settings → Pages → Build and deployment → Source 选 GitHub Actions"
