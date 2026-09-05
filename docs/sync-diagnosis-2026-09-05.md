# 同步链路实测 · 2026-09-05

范围：云端 Sveltia CMS → GitHub 内容仓 → 本地内容仓 → Astro 4322 首页。本次没有向云端保存测试数据；复用用户刚保存的两篇文章，临时本地实验均恢复。

| 实测 | 结果 |
| --- | --- |
| 本地主题源码有未提交修改，内容仓干净，调用首页同步接口 | HTTP 200，up_to_date。源码修改不会阻断内容拉取 |
| HEAD 与 origin/main | 均为 7f12e88685e9f2e7b022e471883559c8c68e4fb5 |
| 用户最新两篇文章与预览副本 | 已到本地；两篇均 draft: true，site.showDraftsInDev: false，首页隐藏 |
| 临时修改内容仓，再调用同步接口 | HTTP 409，dirty；任意本地内容修改都会停止整次拉取 |
| 临时仅将 24a281706136 的 draft 改为 false | 首页 HTTP 500；构建复现 publishedAt outside its published calendar date in Asia/Shanghai |
| 同时为 publishedAt、updatedAt 补 +08:00 | 首页 HTTP 200，浏览器确实显示“测试”卡片；统计 1 篇 |
| 云端 CMS schema | 仍为旧表单：draft 默认 true，精确时间字段没有显式时区格式，新建站日期字段不存在 |

直接原因：CMS 保存成功不等于文章取消草稿；精确时间 2026-09-05T19:27:00 无时区，经当前解析链路后在 Asia/Shanghai 落到次日，与 published 的日期校验冲突。

建议修复顺序：
1. CMS 明确“草稿（开启时首页不显示）”，区分仓库保存和文章公开状态。
2. CMS 精确时间统一保存带时区格式；兼容/迁移现有无时区字段，提交前校验草稿和公开文章，不能只在前端渲染时失败。
3. 同步接口报告：拉取结果、预览生成结果、公开/草稿数量及具体校验错误。HEAD 未变但预览副本更新时也须刷新，而非只根据 Git SHA 决定刷新。
4. 本地内容改动列出文件及与远程重叠情况；自动合并前先备份，仅在校验成功后更新预览，冲突不覆盖。主题源码改动保持独立。
5. 本轮未实现自动合并或修改云端表单；也没有测试新一笔云端发布，测试起点是用户已保存的最新 commit。

代码位置：主题 scripts/content/dev-sync-plugin.mjs、src/components/organisms/TopAppBar.astro、src/utils/content-date.ts、src/content.config.ts；Studio public/admin/config.yml、scripts/validate-content.mjs、scripts/preview-sync.mjs。
