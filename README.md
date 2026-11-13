# 掌柜工具箱 · 小生意好帮手

> 报价单生成、账单对账、需求排期、收支记账——给个体户、微商和自由职业者的一站式小生意工具。
> 纯前端应用，数据只保存在本地浏览器，不上传、不注册、打开即用。

## ✨ 功能

| 模块 | 能做什么 |
| --- | --- |
| 📋 报价单生成器 | 填店方/客户信息与项目明细，实时预览专业报价单；一键导出 PNG 图片发微信，或打印为 PDF；支持税率、优惠、大写金额、模板保存 |
| 🧾 账单对账助手 | 粘贴或上传微信/支付宝账单 CSV，自动解析、按关键词智能分类；月度收支趋势图、支出分类占比图；逐笔改分类、导出汇总 CSV |
| 📅 需求排期 | 把客户零散需求整理成任务清单（客户/内容/天数/优先级），自动排出工期表（可跳过周末），导出图片或复制文字发群 |
| 💰 收支账本 | 随手记一笔，按月统计收入/支出/结余，分类占比图；支持 JSON 备份导出与导入 |

## 🔒 隐私

所有数据仅存于当前浏览器的 localStorage，不做任何网络上传。换浏览器或清除数据会丢失，请用各模块的导出功能备份。

## 🛠 技术栈

- Vite 5 + React 18 + TypeScript
- Chart.js（图表）、html-to-image（图片导出）
- PWA（可安装到桌面/主屏，Service Worker 支持离线打开）
- 无后端、无数据库、无外部统计脚本

## 🚀 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build      # 产物在 dist/
```

## 📦 部署

`dist/` 是纯静态文件，任意静态托管皆可：

- **Netlify Drop**：把 `dist` 打成 zip，拖到 <https://app.netlify.com/drop> 即可上线（无需注册）
- **GitHub Pages**：推到仓库后，Settings → Pages → 选 `main` 分支 `/ (root)` 目录
- 任意服务器：`nginx` 指向 `dist/` 即可

## 📁 目录结构

```
src/
  App.tsx            # 路由与导航（桌面侧栏 / 移动端底部标签）
  modules/           # Home 首页、Quote 报价单、Ledger 对账、Schedule 排期、Book 账本
  components/        # Chart 图表、ui 通用组件
  lib/               # parsers 账单解析、cnMoney 人民币大写、format、useStored 本地存储
public/              # manifest、icon、Service Worker
```

## 📄 License

MIT
