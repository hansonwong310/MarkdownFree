# Chrome Web Store Publishing Guide & Copy for MarkdownFree

This document serves as the single source of truth for the Chrome Web Store listing metadata, permission justifications, privacy disclosures, and pre-publish readiness for the **MarkdownFree** extension.

---

## 1. Store Listing Metadata

### Extension Name
*   **Name**: `MarkdownFree`
*   **Short Name**: `MarkdownFree`

### Store Description
*   **Summary (132 chars max)**:
    一秒将本地或网页 Markdown 文件渲染为素雅护眼、支持大纲、LaTeX公式及行内点评的精美页面。纯本地，即装即用。
*   **Detailed Description**:
    **MarkdownFree** 是一款专为极致阅读者与内容创作者打造的轻量级、完全免服务器的 Markdown 本地渲染与行内点评工具。

    当你将本地 `.md` 文件拖入 Chrome，或在浏览器中打开任何 Markdown 格式网页时，MarkdownFree 会在瞬间为您将其渲染为排版素雅、极度舒适的护眼阅读页面。

    ### 🌟 核心特性
    1. **素雅护眼排版**：拒绝喧宾夺主的花哨配色。仅提供“素雅浅色”与“舒适深色”两大经典眼部友好色系，段落呼吸感十足，长期阅读不累眼。
    2. **中英双重字体系统**：支持中文字体（系统默认、微软雅黑、华文细黑、优雅楷体、经典宋体）与英文字体（System UI、Inter、Georgia、Fira Code）**独立选择与搭配**，找到最适合您阅读偏好的字重与衬线。
    3. **行内点评与高亮**：媲美 Medium 与 Google Docs 的本地点评体验。随意划词选择文本即可弹出点评，评论卡片在右侧轨道优雅悬浮且自动垂直对齐，支持随时查看、定位或删除。
    4. **动态目录大纲 (TOC)**：自动解析 Markdown 标题生成树状大纲，支持随着滚动自动高亮当前阅读位置，支持一键折叠，以及点评列表一键精准锚点跳转。
    5. **全功能支持**：原生支持 LaTeX 数学公式渲染（KaTeX）以及 Mermaid 流程图/图表绘制，支持 Prism 代码高亮。
    6. **纯本地与免服务器**：完全离线运行，零服务器依赖，绝不上传您的任何文档或个人隐私，极速安全。

    ### 🛠 使用方法
    1. 安装插件后，打开 Chrome 插件管理页 `chrome://extensions`。
    2. 找到 **MarkdownFree** 插件，点击 **详细信息**（Details）。
    3. 勾选并开启 **“允许访问文件网址”**（Allow access to file URLs）权限（这是渲染本地 `file:///` md 文件的关键）。
    4. 将任何本地 `.md` 文件拖入 Chrome 浏览器，即可享受极致的阅读与点评体验！

---

## 2. Permissions Justification

| Permission / Host | Why It's Needed |
|--------------------|-----------------|
| `storage`          | 用于在浏览器本地存储用户对每个 md 文件所做的**行内点评**内容，以及用户保存的字体样式、正文大小及深浅主题偏好。 |
| `file://*/*`       | 拦截并渲染本地 `file:///` 协议下的 Markdown 文件（用户拖拽或双击打开的 `.md` / `.markdown` / `.mdown` 格式的本地文档）。 |
| `http://*/*`       | 拦截并渲染通过 HTTP 协议访问的原始 Markdown 文本页面（例如一些原始文本格式的线上 md 教程）。 |
| `https://*/*`      | 拦截并渲染通过 HTTPS 协议加密访问的原始 Markdown 文本页面。 |

---

## 3. Privacy & Data Use Disclosure

*   **Data Collection**:
    *   MarkdownFree **不收集**任何用户个人身份信息。
    *   MarkdownFree **不收集**、**不上传**任何用户所打开的 Markdown 文档内容或用户撰写的点评内容。
    *   所有文档的处理与点评高亮存储全部在用户的**本地浏览器**（利用 `chrome.storage.local`）中完成，绝不会发送至外部网络。
*   **Web Store Privacy Policy Url**:
    *   建议将以下“隐私政策”部署在静态网站上（如 GitHub Pages）并作为隐私条款链接填写。

---

## 4. Privacy Policy (隐私政策草案)

**MarkdownFree Privacy Policy**
Last Updated: 2026-05-26

**1. Information We Collect**
MarkdownFree is a completely local Chrome Extension designed to render Markdown files. We do NOT collect, transmit, store, or share any personal data, usage data, or content of the documents you render.

**2. Local Storage**
Any configurations (theme preference, font selections, font sizes) and document annotations (inline comments) you create are stored strictly on your local device using Chrome's `chrome.storage.local` API. They are never sent to any external servers.

**3. Permissions Use**
*   `storage`: Used solely to persist your visual settings and inline comments locally on your browser.
*   `file://`, `http://`, `https://` host permissions: Scoped to intercept and render text files that represent Markdown content.

**4. Changes to This Policy**
We may update this policy from time to time. Any changes will be published here.

---

## 5. Pre-Publish Checklist (上架打包前确认)

- [x] 确保已在 `manifest.json` 中配置 `"manifest_version": 3`。
- [x] 本地打包时排除 `.git/`、`node_modules/` 以及 `CHROMEWEBSTORE.md` 文件本身。
- [x] 准备至少 1 张 1280×800 或 640×400 像素的实际运行效果截图（可以截取加载了 test.md 后的高颜值界面）。
- [x] 在 Chrome Developer Console 中将此文件里的 `Permissions Justification` 复制粘贴到对应的申明项中。
