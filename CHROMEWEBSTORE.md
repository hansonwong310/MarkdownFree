# Chrome Web Store Publishing Guide & Copy for MarkdownFree

This document serves as the single source of truth for the Chrome Web Store listing metadata, permission justifications, privacy disclosures, and pre-publish readiness for the **MarkdownFree** extension.

---

## 1. Store Listing Metadata

### Extension Name
*   **Name**: `MarkdownFree`
*   **Short Name**: `MarkdownFree`

### Store Description
*   **Summary (132 chars max)**:
    【完全免费・永久无广告】无需安装App，一秒让本地和网页 Markdown 变身护眼精美页面！内置智能目录大纲、划词高亮点评、完全离线 LaTeX 公式与 Mermaid 图表，多款中英字体自由搭配。
*   **Detailed Description**:
    📖 **MarkdownFree — 专为极致阅读与沉浸式思考打造的 Markdown 本地渲染与交互式阅读器**

    **🎁 100% 完全免费，承诺永久无广告、无内购、无订阅、无需注册账号！**
    无需下载安装数百兆的臃肿桌面 App（如 Typora、Obsidian 等），也无需将敏感的文档上传到第三方云端。**MarkdownFree** 是一款极轻量、零服务器依赖、完全运行在浏览器本地的 Markdown 渲染与交互式阅读扩展。

    当你把任何本地 `.md` 文件拖入 Chrome 浏览器，或在网页上打开原始 Markdown 文档时，MarkdownFree 会在一秒内将其重构为排版素雅、极度舒适的交互式护眼阅读页面。无论是学术论文、技术文档、读书笔记还是工程图表，都能获得媲美纸质出版物的顶级视觉体验。

    ---

    ### 🌟 专为“极致阅读体验”打造的核心特性

    #### 1. 🚀 无需安装 App，完全免费，永久无广
    *   **真正完全免费**：零隐藏收费，不设任何功能收费墙，承诺永久免费，且没有任何广告弹窗干扰，给你最纯粹的安静阅读空间。
    *   **极度轻量**：没有臃肿的桌面客户端，不占用系统资源，只是一个常驻浏览器的极轻量扩展。
    *   **原地渲染**：保留浏览器原生的 `file:///` 或 URL 地址栏，刷新即可自动同步外部编辑器的修改，完美契合您的现有工作流。
    *   **纯本地安全**：完全离线运行，所有数据与解析均在本地浏览器中完成，零网络数据传输，彻底保障隐私安全。

    #### 2. 📑 智能侧边导航栏 (TOC) — 轻松驾驭超长文档
    *   **动态目录树**：自动解析 Markdown 中的多级标题，自动生成极征服力、可折叠的目录大纲。
    *   **滚动联动 (Scroll Spy)**：随着您的阅读滚动，目录树会自动高亮当前阅读位置，让你随时掌控文档脉络。
    *   **灵活折叠**：支持全局展开层级筛选（如仅显示 H1-H3），或通过目录节点侧边的 SVG 箭头手动收起/展开，支持快捷键 `O` 随时展示/收起侧边栏。

    #### 3. ✍️ 划词高亮与内置标记 (Markdown Annotations) — 沉浸式互动阅读
    *   **划词点评**：媲美 Medium 或 Google Docs 的顶级阅读交互。只需划选任意段落文字，即可弹出极简的“💬 点评”按钮。
    *   **悬浮卡片**：写下的点评会作为优雅的卡片悬浮在右侧专属轨道中，并采用智能碰撞躲避算法自动与高亮正文对齐，清爽不杂乱。
    *   **数据回写/内嵌**：点评内容不会被锁死在浏览器中，而是采用标准的 `==高亮文本==<!-- cmt: 您的点评 -->` 格式，支持通过 File System Access API 一键覆盖保存回写到您的原始 Markdown 文件中，真正做到“点评属于自己”。

    #### 4. 🎨 顶级视觉排版与独立中英字体选择 — 护眼又好读
    *   **素雅双主题**：精心调配的“素雅浅色 (Light)”采用护眼柔和纸张色调（暖黄底色），“舒适深色 (Dark)”采用超低对比度深蓝灰，夜间阅读温和不刺眼。
    *   **中英双重字体系统**：打破传统渲染器中英字体混杂、字重不一的痛点。支持**中文**（系统默认、微软雅黑、华文细黑、优雅楷体、经典宋体）与**英文**（System UI、Inter、Georgia、Fira Code）**独立选择与搭配**，英文优雅衬线，中文温润端庄。
    *   **阅读细节微调**：支持正文字号无级调节、侧边栏宽度任意拖拽，并保留了完美的字距与黄金行间距，享受杂志级的呼吸感排版。

    #### 5. 📐 全功能图表支持 — LaTeX 公式 & Mermaid 流程图
    *   **离线 KaTeX 数学公式**：支持行内公式 `$...$` 和块级公式 `$$...$$` 的超高速、超精美排版，学术阅读体验拉满。
    *   **Mermaid 动态图表**：原生支持 Mermaid 流程图、时序图、甘特图等，且图表配色会智能自适应您所选择的深浅主题。
    *   **Prism 语法高亮**：为数十种编程语言提供素雅现代的代码块高亮，代码阅读一目了然。

    ---

    ### 🛠 极简配置与使用指南（只需 30 秒）

    1. 安装扩展后，在 Chrome 地址栏输入并打开：`chrome://extensions`。
    2. 找到 **MarkdownFree** 扩展，点击 **“详细信息” (Details)** 按钮。
    3. 找到 **“允许访问文件网址” (Allow access to file URLs)** 选项并开启它（这是渲染本地 `.md` 文件的核心权限）。
    4. 拖拽任何本地 `.md` 文件到浏览器中，或直接双击用 Chrome 打开，即刻开始享受最纯粹的 Markdown 阅读之旅！

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
