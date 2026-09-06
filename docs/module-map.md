# CMS ↔ 内容仓 ↔ 页面模块映射

更新：2026-09-05 · 团子 0.0.1 / B05。新增或移动模块时，同批更新本表及两份开发日志。

路径基准：`Studio` = `shirone-studio/`；`内容` = `shirone-content/`；`主题` = `Shirone/`。三个目录并列。

统一数据流：CMS 表单 → 内容仓文件 → `主题/scripts/content/sync.mjs` → 自动生成 `主题/src/user/user-config.ts` 或物化内容 → 配置消费者 → 页面。**不要编辑生成物来保存设置。**

所有 CMS 字段定义在 `Studio/public/admin/config.yml`；下表用集合／条目与字段定位，避免行号随新增表单漂移。

| 可修改模块 / CMS 定位 | 内容仓保存位置与字段 | 前端配置 / 显示位置 |
| --- | --- | --- |
| 站点资料 `settings/site` | `config/site.yaml`：`title/subtitle/lang/site/base/timeZone` | `src/config/siteConfig.ts` → `src/components/organisms/TopAppBar.astro`、`src/layouts/Layout.astro` |
| 建站日期 `settings/site` | `config/site.yaml`：`established` | `src/types/config.ts` → `src/utils/site-age.ts`、`site-stats.ts` → `src/components/molecules/SiteStats.astro` |
| 草稿预览 `settings/site` | `config/site.yaml`：`showDraftsInDev` | `src/utils/content-utils.ts` → 首页、归档、分类、标签、动态；统计另行只计公开条目 |
| 桌面与手机背景 `settings/site` → 横幅 | `config/site.yaml`：`banner.src.desktop/mobile/position` | `src/config/siteConfig.ts` → `src/components/organisms/BannerStage.astro` |
| 横幅文字、遮罩、轮播、波浪 `settings/site` | `config/site.yaml`：`banner.homeText/dim/carousel/waves` | `BannerStage.astro`、`src/components/molecules/BannerWaves.astro`；空文案在 `siteConfig.ts` 回退 |
| 背景模式与颜色 `settings/site` | `config/site.yaml`：`wallpaperMode/themeColor` | `src/config/siteConfig.ts`、`src/utils/theme-utils.ts`、`src/layouts/Layout.astro`；访客本地显示偏好可覆盖默认值 |
| 头像、昵称、简介 `settings/profile` | `config/profile.yaml`：`avatar/name/bio` | `src/config/profileConfig.ts` → `src/components/organisms/Profile.astro`；空名称／简介跟随站点 |
| 社交入口 `settings/profile` | `config/profile.yaml`：`links[]` | `profileConfig.ts` → `Profile.astro`；列表删除即隐藏 |
| 音乐开关、歌单、歌曲封面 `settings/music` | `config/music.yaml`：`enable/provider/tracks/meting/defaultVolume/defaultMode` | `src/config/musicConfig.ts` → `src/components/organisms/SideBar.astro` → `src/components/organisms/music/MusicSidebar.astro`；播放器运行时：`src/utils/music/music-runtime.ts` |
| 公告 `settings/announcement` | `config/announcement.yaml`：`title/content/closable/link` | `src/config/announcementConfig.ts` → `src/components/molecules/Announcement.astro`；显示开关在侧栏模块中 |
| 侧栏顺序、开关、显示页面 `settings/sidebar` | `config/sidebar.yaml`：`enable/blogWorkspace/arrangement/side/components[]` | `src/config/sidebarConfig.ts`、`src/types/sidebarConfig.ts` → `src/components/organisms/SideBar.astro` |
| 博客分类工作区 `settings/sidebar` | `config/sidebar.yaml`：`blogWorkspace`（缺省 false）；分类与标签来自公开文章 | `MainGridLayout` → `BlogWorkspaceLayout`（WorkspaceSidebar + BlogIndex）；`workspace-runtime.ts` 同步工作区，`blog-workspace.ts` 管理查询与列表返回；`Blog` 导航预设 → `/blog/` |
| 顶部导航与子菜单 `settings/nav-bar` | `config/nav-bar.yaml`：`links[]` | `src/config/navBarConfig.ts` → `TopAppBar.astro` 及移动导航；删除入口不等于关闭路由 |
| 文章正文、封面、草稿、置顶 `posts` | `content/posts/**/*.{md,mdx}`：frontmatter 与正文 | `src/content.config.ts` → `src/utils/content-utils.ts` → `src/components/organisms/PostPage.astro`、`PostCard.astro`、文章路由 |
| 模板示例筛选 `posts/moments` | frontmatter：`template`（后台分类标记） | 前端只由 `draft` 决定公开性；“模板示例”本身不会自动下架内容 |
| 分类与标签 `posts` | 文章 frontmatter：`category/tags` | `content-utils.ts` → `src/components/molecules/Categories.astro`、`Tags.astro`、分类条与归档；空卡片不显示 |
| 动态 `moments` | `content/moments/*.md` | `src/content.config.ts`、`content-utils.ts` → `src/pages/moments.astro` |
| 关于页 `pages/about` | `content/spec/about.md` | `src/pages/about.astro` |
| 文章数量、字数、最近更新 | 无手填入口，由已公开内容生成 | `src/utils/site-stats.ts` → `SiteStats.astro` |
| 图片库 | `assets/images/`；选择器可能保存 `assets/images/...` 或 `/assets/images/...` | `src/utils/content-image-reference.ts`、`src/utils/asset-utils.ts` → Astro 图片优化 → 头像、横幅、歌曲封面 |
| 音频上传 | `public/audio/uploads/`；保存 `/audio/uploads/...` | `musicConfig.ts` → 播放器运行时；全局上传上限 10 MiB |
| 文章图片／动态图片 | 文章同目录；动态 `public/images/moments/` | 文章渲染 / 动态组件；原图与派生缩略图分开维护 |

## 校验、预览与部署

| 关系 | 代码位置 / 使用方式 |
| --- | --- |
| CMS 可编辑字段与资源校验 | `Studio/scripts/settings-validation.mjs`、`validate-content.mjs`；`npm run check:content` |
| 配置资源引用清单 | 本地工作台“检查设置中的图片与音频”；`Studio/scripts/dev.mjs` 的 `/api/settings-media`，返回文件及使用字段。只覆盖已开放设置，不声称是全站安全删除检查 |
| 内容配置最终类型校验 | `主题/scripts/content/config-domains.mjs`、`config-overlay.mjs`、`src/types/*`；`pnpm content:validate` |
| 本地工作台与脏文件提示 | `Studio/public/index.html`、`studio.js`；`scripts/dev.mjs` 的 `/api/status` |
| 本地内容同步保护 | `主题/scripts/content/dev-sync-plugin.mjs`：内容仓不干净时拒绝拉取；不会自动覆盖本地修改 |
| CMS 构建与发布 | `Studio/scripts/build.mjs` → `dist/`；`.github/workflows/pages.yml` 发布 Studio。CMS 发布与博客发布是两件事 |
| 版本记录 | `Studio/docs/developer-log-cms.md`、`developer-log-frontend.md`；同一批次号关联，凭据不进入文档仓 |

## 本批次边界

- 友链、番剧、罗盘、相册、项目等演示数据仍有原路径；本批次从导航移除，**尚未新增这些数据的 CMS 集合，也未删除公开路由**。需要启用时，先补对应数据表单并清理演示数据。
- 音乐选择“内容仓内置歌曲”时，空的 `tracks` 列表使用 `data/music.ts`；选择“手动管理歌曲”时必须至少添加一首歌曲。
- 全站资源引用检查、自动防止误删资源、在线发布状态查询和分类词库属于后续批次；当前检查范围已在入口中明确。
- 云端 CMS 保存操作会写 GitHub；本批次在本地验证，不使用访问令牌登录或远程保存。

## B02 保存、预览与远程更新

| 操作／状态 | 代码位置 | 数据方向与边界 |
| --- | --- | --- |
| 本地 CMS 保存 | `public/admin/config.yml` | 选择本地 shirone-content，直接保存正文、资源和 config/*.yaml |
| 保存后自动更新预览 | `scripts/preview-sync.mjs`；`scripts/dev.mjs` 启停监听 | 内容仓 → Shirone 副本；复用主题 sync、图标及缩略图脚本；无 Git 写操作 |
| 同步进度与失败提示 | `/api/status` → `public/studio.js` → `public/index.html#syncStatus` | 每 5 秒读取，成功仅表示本地副本已更新 |
| 拉取远程更新 | Shirone `scripts/content/dev-sync-plugin.mjs`、`src/components/organisms/TopAppBar.astro`、`src/i18n/languages/*.ts` | GitHub → 本地；有未提交修改则保留本地并停止拉取 |
| 发布 | 现有 Git 提交／推送与 GitHub Actions | 本批没有增加一键发布或自动双向合并；发布成功须核对部署与线上页面 |

本地与远程 CMS 本次选一个编辑位置。内容仓是唯一编辑来源；不要直接改主题内生成副本来维护内容。Studio 服务运行时自动更新预览，服务停止后需重启或运行主题 `pnpm content:sync`。

## B03 时区约定

| 模块 | CMS 字段 | 内容格式 | 前端校验／消费 |
| --- | --- | --- | --- |
| 文章日期 | `published`、`updated` | `YYYY-MM-DD`，中国日历日期 | `src/utils/content-date.ts` |
| 文章精确时间 | `publishedAt`、`updatedAt` | ISO 8601，必须含 `+08:00` | `src/content.config.ts`、`src/utils/content-date.ts` |
| 说说时间 | `moments.published` | ISO 8601，必须含 `+08:00` | `src/content.config.ts`、`MomentCard.svelte` |
| 保存前检查 | `scripts/validate-content.mjs` | 拒绝无时区的精确时间 | Studio 工作台“运行内容检查” |

## B04 表单契约范围

CMS 只开放已经接通“保存、同步、类型校验、页面消费”的常用参数。`tests/studio.test.mjs` 固定检查音乐来源、播放模式、语言、背景模式和侧栏枚举与 Shirone 类型一致。Shirone 中尚未开放的高级参数（如 `displaySettings`、`texture`、`toc`、`favicon`、侧栏模块专属的 `collapseAfter/startOfWeek`）仍由主题默认值管理，不能把当前表单理解为 Shirone 全部参数的镜像。

## B05 版本与建站手记

| 模块 | 位置 | 用途 |
| --- | --- | --- |
| 整体版本 | 三个项目的 `VERSION` 与 `v0.0.1` 标签 | 对齐开发快照，独立于上游软件包版本 |
| 发布记录 | `Studio/docs/releases/0.0.1.md` | 恢复步骤、验证范围与同步状态 |
| 首篇建站总结 | `内容/content/posts/tuanzi-first-release/index.md` | CMS 的文章集合编辑，前端 `/posts/tuanzi-first-release/` 显示 |

## B06 正文热更新与可选日期

| 关系 | 实现位置 | 约定 |
| --- | --- | --- |
| CMS 可选日期空值 → 前端 schema | `主题/src/utils/optional-content-date.ts` → `主题/src/content.config.ts` | 空字符串、空白、null 视为未填写；非空非法值仍拒绝 |
| 同步完成 → 浏览器更新 | `主题/src/components/organisms/TopAppBar.astro` | 独立脚本作用域与一次绑定；updated/up_to_date 均刷新，失败不刷新 |

### 2026-09-06 侧栏 V2 复用边界

- 身份与导航数据：`shirone-content/config/profile.yaml`、`config/navBar.yaml` → 前端 profile/navBar config → `WorkspaceSidebar.astro`；图片优化与首页 Profile 共用。
- 页面布局：`MainGridLayout` → `BlogWorkspaceLayout` → `WorkspaceLayout`（插槽）；工具页可直接复用后两者中的通用 WorkspaceLayout + WorkspaceSidebar，无需博客索引模块。
- 纯展示：WorkspaceIdentity、WorkspaceNavigation、CategoryFilter、ReadingNavigation；纯数据转换：workspace-navigation.ts；独立运行时：workspace-runtime.ts、reading-navigation.ts。
- 移动导航：MainGridLayout 持久区中的 WorkspaceDrawer → SheetSide；工作区外仍使用原 SiteNavigationDrawer。
- 博客查询/返回状态仍归 BlogIndex、blog-filter.ts、blog-workspace.ts；本轮未新增 CMS 字段或工具内容集合。

### Skill 内容集合与工作区（2026-09-06）

- CMS 独立 `skills` 集合 → `content/skills/<id>/index.md` → 前端 skills 内容集合 → SkillResourceIndex/SkillResourceCard → `/skills/<id>/`。UUID 保持稳定，修改名称不改变路径。
- CMS 设置中的 Skill 只管理开关和分类；`resourceSource: collection` 启用独立集合。旧 resources 数组仅作前端兼容，原技术熟练度模式保留。
- 封面/截图与附件使用固定集合资源库 `public/resources/skills/`（兼容既有子目录），公开路径为 `/resources/skills/`；目录 `.gitkeep` 保留空挂载的裁剪能力。删条目不会自动删媒体，媒体清理须单独检查引用。
- 共享字段规则 `src/schemas/skill-entry-contract.mjs` 同时供 Astro schema 与 `scripts/content/validate-skills.mjs` 使用；Studio 内容检查复用主题校验器，须在 studio.local.json 配置匹配的新主题路径。
- 同步先校验 Skill 字段、分类、ID 和媒体，再物化。`skill-loader.ts` 补齐 Astro 7.2 空集合首次新增监听，并在空构建清理旧缓存。源码与 npm 集成的集合定义共用该 loader/schema。
- 当前本机前端源为 `../shirone-content-cloud`，它跟踪 GitHub main，供右上角拉取远程更新；原 `shirone-content` 保留开发改动和私有协作文档。Studio 的本地覆盖也指向干净副本。
- Studio 已部署独立表单；远程 Git 提交→本地同步→详情/附件已实测。真实浏览器 CMS 新建、上传、保存重开、更新、删除、媒体清理及前端同步已通过；详见 2026-09-07 CMS 开发日志。
