# Shirone Studio

一个独立于 Shirone 主题的个人内容工作台。它使用 Sveltia CMS 管理单独的
`shirone-content` 仓库；主题仓只通过 Shirone 原生内容同步机制消费这些文件。

## 本地使用

```bash
npm run dev
```

- 工作台：<http://127.0.0.1:4173/>
- 内容编辑器：<http://127.0.0.1:4173/admin/>
- 第一次打开编辑器时选择 `/Users/huyan/Code/shirone-content`。
- 本地目录模式需要 Chrome、Edge 或其他支持 File System Access API 的 Chromium 浏览器。

`studio.config.json` 保存可提交的默认路径；机器特有路径可写入不会提交的
`studio.local.json`。

## 内容范围

- `content/posts/`：文章与文章同目录图片
- `content/moments/`：说说与说说图片
- `content/spec/about.md`：关于页面
- `config/site.yaml`：站点基础信息
- `config/profile.yaml`：个人资料和社交链接

Shirone 的扩展 Markdown 与 MDX 应使用编辑器的源码模式，并在真实博客预览中确认。
Studio 不直接重写 `data/*.ts` 或主题实现文件。

## 云端部署

仓库内的 GitHub Pages 工作流会使用以下配置：

- 内容仓默认名：`<GitHub 用户名>/shirone-content`
- 仓库变量 `SHIRONE_SITE_URL`：博客正式地址

云端模式使用 GitHub Token 登录 Sveltia。任何 Token 都只在 Sveltia 登录界面输入，
不能写入仓库、CMS 配置或 Actions 变量。

## 验证与构建

```bash
npm run check
npm run build
```

部署前可显式指定内容仓和博客地址：

```bash
SVELTIA_CONTENT_REPO=OWNER/shirone-content \
SHIRONE_SITE_URL=https://blog.example.com \
npm run build
```
