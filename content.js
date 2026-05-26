/**
 * MarkdownFree Content Script (内嵌式绿色点评引擎)
 * 极轻量、免服务器、点评直接内嵌在 md 文件中的优雅阅读器
 */

(function () {
  // 1. 检测是否需要拦截本页面
  const preElement = document.querySelector('body > pre');
  const isRawText = preElement || (document.body && document.body.childNodes.length === 1 && document.body.firstChild.nodeName === 'PRE');
  const path = window.location.pathname.toLowerCase();
  const isMarkdownFile = path.endsWith('.md') || path.endsWith('.markdown') || path.endsWith('.mdown') ||
                         (path.endsWith('.txt') && document.body && document.body.textContent.trim().startsWith('#'));

  if (!isRawText && !isMarkdownFile) {
    return; // 不需要处理，直接退出
  }

  // 立即隐藏原始 pre 标签，防止闪烁
  if (preElement) {
    preElement.style.display = 'none';
  } else if (document.body && document.body.firstChild) {
    document.body.firstChild.style.display = 'none';
  }

  // 提取原始 Markdown 文本并作为内存中的单一数据源 (Single Source of Truth)
  const initialMarkdown = preElement ? preElement.textContent : document.body.textContent;
  let currentMarkdownText = initialMarkdown;

  // 核心数据模型
  let comments = [];
  let mathBlocks = [];
  let mathInlines = [];
  let currentSelectionRange = null;
  let currentSelectedText = '';
  let hasUnsavedChanges = false;

  // Draft storage key for the current page URL
  const storageKey = 'draft_' + window.location.href;

  // 页面加载后，先从 storage 中异步获取缓存的点评草稿
  chrome.storage.local.get([storageKey], (result) => {
    const draft = result[storageKey];
    if (draft) {
      if (draft.baseMarkdown === initialMarkdown) {
        currentMarkdownText = draft.unsavedMarkdown;
        hasUnsavedChanges = true;
      } else {
        // External file has been modified since draft was created, load draft but warn user
        currentMarkdownText = draft.unsavedMarkdown;
        hasUnsavedChanges = true;
        setTimeout(() => {
          showToast("⚠️ 检测到本地文件已被外部修改，已载入包含点评的草稿。若需同步外部最新修改，请保存或重置点评。", "warning");
        }, 1200);
      }
    }
    initApp();
  });

  async function initApp() {
    // 清空页面已有 head 和 body
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    // 设置页面 Title
    const title = getFileName(window.location.href);
    document.title = title;

    // 注入页面基本 viewport
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(meta);

    const displayPath = getFilePathDisplay(window.location.href);

    // 构建完美三栏 UI 骨架 (正文与点评放入 md-scroll-container 独立滚动)
    document.body.innerHTML = `
      <div id="md-app-container">
        <!-- 页眉 (雅致点缀) -->
        <header id="md-header">
          <div class="header-left">
            <span class="logo">MarkdownFree</span>
            <span class="file-name">${escapeHTML(displayPath)}</span>
            <span id="unsaved-badge" class="unsaved-badge" style="display: none;">已修改(未保存)</span>
          </div>
          <div class="header-right">
            <span id="stat-word-count">字数: 0</span>
            <span id="stat-read-time">阅读时间: 0 分钟</span>
          </div>
        </header>

        <!-- 主体布局 -->
        <div id="md-main-layout">
          <!-- 左栏：大纲与点评面板 -->
          <aside id="md-left-sidebar" class="sidebar">
            <div class="sidebar-tabs">
              <button class="tab-btn active" data-tab="toc">目录大纲</button>
              <button class="tab-btn" data-tab="comments">我的点评 (<span id="comment-badge">0</span>)</button>
            </div>
            <div class="sidebar-content">
              <div id="tab-toc" class="tab-panel active">
                <div class="toc-controls">
                  <select id="toc-depth-select" title="选择目录展开层级">
                    <option value="6">全部展开</option>
                    <option value="1">仅显示一级目录 (H1)</option>
                    <option value="2">显示至二级目录 (H2)</option>
                    <option value="3">显示至三级目录 (H3)</option>
                    <option value="4">显示至四级目录 (H4)</option>
                  </select>
                </div>
                <div class="toc-list-container"></div>
              </div>
              <div id="tab-comments" class="tab-panel">
                <div class="comment-nav-list"></div>
              </div>
            </div>
          </aside>

          <!-- 目录栏可拖拽分隔线 -->
          <div id="md-left-resizer" class="sidebar-resizer" title="双击恢复默认宽度，拖拽改变宽度"></div>

          <!-- 右侧独立可滚动区域 (包裹正文与右侧点评轨道) -->
          <div id="md-scroll-container">
            <!-- 中间栏：内容渲染 -->
            <main id="md-content-wrapper">
              <article id="md-content" class="markdown-body">
                <!-- Marked 解析后的内容会插入在此处 -->
              </article>
            </main>

            <!-- 右栏：悬浮点评卡片轨道 -->
            <aside id="md-right-sidebar">
              <div id="margin-comments-container"></div>
            </aside>
          </div>
        </div>

        <!-- 页脚 -->
        <footer id="md-footer">
          <div class="footer-left">
            <span>按 <strong>T</strong> 切换深浅色 | 按 <strong>O</strong> 折叠侧栏 | 划词可添加点评并内嵌存入 md 文件</span>
          </div>
          <div class="footer-right">
            <span>© MarkdownFree</span>
          </div>
        </footer>

        <!-- 右下角悬浮控制按钮组 (毛玻璃风) -->
        <div id="floating-control-panel">
          <button id="save-file-btn" class="pulse-attention" title="保存更改写回 md 文件" style="display: none;">
            <svg viewBox="0 0 24 24"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
          </button>
          <button id="toggle-sidebar-btn" title="折叠左侧栏">
            <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
          </button>
          <button id="toggle-comments-btn" class="active" title="显示/隐藏行内点评">
            <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
          </button>
          <button id="toggle-theme-btn" title="切换深色/浅色主题">
            <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 9.79 9.79 0 0 0-.5-2.69 1 1 0 0 0-1.9.4A7 7 0 1 1 12.5 5a1 1 0 0 0 .4-1.9A9.79 9.79 0 0 0 12 3z"/></svg>
          </button>
          <button id="font-settings-btn" title="字体排版设置">
            <svg viewBox="0 0 24 24"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>
          </button>
          <button id="print-pdf-btn" title="保存为 PDF / 打印">
            <svg viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
          </button>
        </div>

        <!-- 字体设置模态弹窗 -->
        <div id="font-settings-modal" class="modal">
          <div class="modal-content">
            <h3>字体与排版样式设置</h3>
            <div class="setting-item">
              <label for="zh-font-select">中文字体：</label>
              <select id="zh-font-select">
                <option value="system-zh">冬青黑体 / 系统黑体</option>
                <option value="ms-yahei">微软雅黑</option>
                <option value="st-heiti">华文细黑</option>
                <option value="kaiti">优雅楷体 / 霞鹜文楷</option>
                <option value="simsun">经典宋体</option>
              </select>
            </div>
            <div class="setting-item">
              <label for="en-font-select">英文字体：</label>
              <select id="en-font-select">
                <option value="system-en">System UI (无衬线)</option>
                <option value="inter">Inter (精美现代)</option>
                <option value="georgia">Georgia (雅致衬线)</option>
                <option value="fira-code">Fira Code (等宽代码)</option>
              </select>
            </div>
            <div class="setting-item">
              <label for="font-size-input">正文字号 (px)：</label>
              <input type="number" id="font-size-input" min="14" max="22" value="16">
            </div>
            <div class="modal-actions">
              <button id="close-font-modal-btn">确定</button>
            </div>
          </div>
        </div>

        <!-- 点评输入气泡 (划词后弹出) -->
        <div id="inline-comment-bubble" class="comment-bubble-input">
          <textarea placeholder="输入您的点评内容..." rows="3"></textarea>
          <div class="bubble-actions">
            <button class="cancel-btn">取消</button>
            <button class="save-btn">确定</button>
          </div>
        </div>

        <!-- Toast 消息容器 -->
        <div id="toast-container" class="toast-container"></div>
      </div>
    `;

    // 执行渲染与交互流程
    renderMarkdownContent();
    setupDefaultPreferences();
    setupEventListeners();
    setupSidebarResizer();

    if (hasUnsavedChanges) {
      setTimeout(() => {
        showToast("已自动恢复上次未保存的点评草稿！", "success");
      }, 500);
    }
  }

  // ==========================================================================
  // Markdown & LaTeX & Mermaid 渲染器逻辑
  // ==========================================================================
  function renderMarkdownContent() {
    const container = document.getElementById('md-content');

    // 1. 内嵌点评解析与占位符重写 (正则高效拦截，零数据库依赖)
    comments = [];
    let commentIndex = 0;
    
    // 正则匹配 ==被点评内容==<!-- cmt: 点评内容 --> 并转化为 HTML <mark> 标签
    let processed = currentMarkdownText.replace(/==([^=]+)==<!-- cmt: ([\s\S]*?) -->/g, (match, text, comment) => {
      const id = 'cmt_' + commentIndex++;
      comments.push({
        id: id,
        text: text.trim(),
        comment: comment.trim(),
        createdAt: Date.now() // 临时生成，保证排序
      });
      return `<mark class="comment-highlight" data-comment-id="${id}">${text}</mark>`;
    });

    // 2. LaTeX 公式预处理 (Base64编码，防止 marked 破坏特殊符号)
    mathBlocks = [];
    mathInlines = [];

    // 匹配双美元符号的公式块 $$...$$
    processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (match, expr) => {
      const id = mathBlocks.length;
      mathBlocks.push(expr.trim());
      return `\n<div class="katex-block-placeholder" data-id="${id}"></div>\n`;
    });

    // 匹配单美元符号的行内公式 $...$
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, expr) => {
      const id = mathInlines.length;
      mathInlines.push(expr.trim());
      return `<span class="katex-inline-placeholder" data-id="${id}"></span>`;
    });

    // 3. 使用 Marked.js 进行 Markdown 编译
    let htmlOutput = '';
    try {
      htmlOutput = marked.parse(processed);
    } catch (e) {
      console.error("Marked compile error:", e);
      htmlOutput = "<p>Markdown 编译出错，请检查内容结构。</p>";
    }
    container.innerHTML = htmlOutput;

    // 4. 渲染 LaTeX 公式
    renderMathPlaceholders(container);

    // 5. 处理 Mermaid 图表
    renderMermaidCharts(container);

    // 6. 使用 Prism.js 进行代码块高亮
    try {
      Prism.highlightAllUnder(container);
    } catch (e) {
      console.warn("Prism highlight error:", e);
    }

    // 7. 生成 TOC 目录大纲
    generateTOC(container);

    // 8. 绘制右侧悬浮点评卡片与大纲导航
    renderCommentCards();

    // 9. 统计文档字数与阅读时间
    updateDocumentStats(currentMarkdownText);

    // 10. 更新未保存标记与按钮可见性
    updateSaveStateUI();
  }

  function renderMathPlaceholders(container) {
    if (typeof katex === 'undefined') return;

    container.querySelectorAll('.katex-block-placeholder').forEach(el => {
      const id = parseInt(el.dataset.id);
      const expr = mathBlocks[id];
      try {
        katex.render(expr, el, { displayMode: true, throwOnError: false });
      } catch (err) {
        el.textContent = '$$' + expr + '$$';
      }
    });

    container.querySelectorAll('.katex-inline-placeholder').forEach(el => {
      const id = parseInt(el.dataset.id);
      const expr = mathInlines[id];
      try {
        katex.render(expr, el, { displayMode: false, throwOnError: false });
      } catch (err) {
        el.textContent = '$' + expr + '$';
      }
    });
  }

  function renderMermaidCharts(container) {
    container.querySelectorAll('pre code.language-mermaid').forEach(el => {
      const pre = el.parentNode;
      const codeText = el.textContent;
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = codeText;
      pre.parentNode.replaceChild(div, pre);
    });

    if (typeof mermaid !== 'undefined' && container.querySelector('.mermaid')) {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'neutral'
        });
        mermaid.init(undefined, container.querySelectorAll('.mermaid'));
      } catch (err) {
        console.error("Mermaid init error:", err);
      }
    }
  }

  // ==========================================================================
  // 大纲 TOC 目录生成与滚动联动
  // ==========================================================================
  function generateTOC(container) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const tocContainer = document.querySelector('.toc-list-container');
    tocContainer.innerHTML = '';

    if (headings.length === 0) {
      tocContainer.innerHTML = '<div style="font-size: 13px; color: var(--text-light); text-align: center; margin-top: 20px;">没有找到标题</div>';
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'toc-list';

    headings.forEach((heading, index) => {
      const text = heading.textContent;
      const id = 'heading-' + index;
      heading.id = id;

      const level = parseInt(heading.tagName.substring(1));
      
      // 判断此标题在目录中是否拥有子标题（即下一个标题的等级比当前大）
      let hasChildren = false;
      if (index + 1 < headings.length) {
        const nextLevel = parseInt(headings[index + 1].tagName.substring(1));
        if (nextLevel > level) {
          hasChildren = true;
        }
      }

      const li = document.createElement('li');
      li.className = 'toc-item';
      li.style.setProperty('--level', level - 1);
      li.setAttribute('data-level', level);

      // 如果有子标题，渲染折叠箭头，否则渲染对齐占位符
      if (hasChildren) {
        const toggle = document.createElement('span');
        toggle.className = 'toc-toggle-arrow';
        toggle.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5H7z"/></svg>`;
        toggle.addEventListener('click', (e) => {
          e.stopPropagation(); // 阻止冒泡，不触发滚动定位
          li.classList.toggle('collapsed');
          syncTOCVisibility();
        });
        li.appendChild(toggle);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'toc-toggle-spacer';
        li.appendChild(spacer);
      }

      const a = document.createElement('a');
      a.href = '#' + id;
      a.className = 'toc-link';
      a.textContent = text;
      a.title = text;

      a.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // 激活当前 TOC 链接
        document.querySelectorAll('.toc-link').forEach(link => link.classList.remove('active'));
        a.classList.add('active');
      });

      li.appendChild(a);
      ul.appendChild(li);
    });

    tocContainer.appendChild(ul);

    // 初始化时同步大纲目录的折叠与显隐状态
    initializeTOCCollapseStates();
    syncTOCVisibility();

    // 滚动联动 (Scroll Spying)
    const scrollContainer = document.getElementById('md-scroll-container');
    if (scrollContainer) {
      const scrollContainerRect = scrollContainer.getBoundingClientRect();
      scrollContainer.addEventListener('scroll', () => {
        const scrollPos = scrollContainer.scrollTop + 80;
        let activeHeading = null;

        for (const heading of headings) {
          const headingTop = heading.getBoundingClientRect().top - scrollContainerRect.top + scrollContainer.scrollTop;
          if (headingTop <= scrollPos) {
            // 滚动高亮仅匹配在 DOM 中可见的 TOC 节点，自动适配折叠状态
            const id = heading.id;
            const tocLink = document.querySelector(`.toc-link[href="#${id}"]`);
            if (tocLink && tocLink.parentElement && tocLink.parentElement.style.display !== 'none') {
              activeHeading = heading;
            }
          } else {
            break;
          }
        }

        document.querySelectorAll('.toc-link').forEach(link => link.classList.remove('active'));

        if (activeHeading) {
          const activeLink = document.querySelector(`.toc-link[href="#${activeHeading.id}"]`);
          if (activeLink) {
            activeLink.classList.add('active');
          }
        }
      });

      // 当正文滚动时，隐藏还未录入的划词点评小气泡，保持界面干净
      scrollContainer.addEventListener('scroll', () => {
        hideCommentTrigger();
      });
    }
  }

  // ==========================================================================
  // 右侧悬浮点评卡片渲染与防重叠碰撞对齐
  // ==========================================================================
  function renderCommentCards() {
    const container = document.getElementById('margin-comments-container');
    container.innerHTML = '';

    const isCommentsVisible = document.getElementById('toggle-comments-btn').classList.contains('active');
    if (!isCommentsVisible) {
      document.getElementById('comment-badge').textContent = comments.length;
      updateCommentsNavigator();
      return;
    }

    comments.forEach(comment => {
      const mark = document.querySelector(`.comment-highlight[data-comment-id="${comment.id}"]`);
      if (!mark) return; // 无法匹配则跳过

      const card = document.createElement('div');
      card.className = 'margin-comment-card';
      card.setAttribute('data-comment-id', comment.id);
      card.innerHTML = `
        <div class="card-quote">“${escapeHTML(comment.text)}”</div>
        <div class="card-body">${escapeHTML(comment.comment)}</div>
        <div class="card-footer">
          <span>内嵌点评</span>
          <button class="card-delete-btn" title="删除本条点评">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;

      container.appendChild(card);

      // 删除点评事件
      card.querySelector('.card-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteComment(comment.text, comment.comment);
      });

      // 鼠标互动联动
      card.addEventListener('mouseenter', () => {
        mark.classList.add('hovered');
      });
      card.addEventListener('mouseleave', () => {
        mark.classList.remove('hovered');
      });

      mark.addEventListener('mouseenter', () => {
        card.classList.add('active');
      });
      mark.addEventListener('mouseleave', () => {
        card.classList.remove('active');
      });

      // 高亮点击定位到右侧点评
      mark.addEventListener('click', () => {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document.querySelectorAll('.margin-comment-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    document.getElementById('comment-badge').textContent = comments.length;

    // 对齐并执行防重叠碰撞定位
    alignCommentCards();
    updateCommentsNavigator();
  }

  function alignCommentCards() {
    const cards = Array.from(document.querySelectorAll('.margin-comment-card'));
    const scrollContainer = document.getElementById('md-scroll-container');
    if (!scrollContainer) return;
    const scrollContainerRect = scrollContainer.getBoundingClientRect();

    // 1. 第一步：计算每张卡片的理想垂直 Top 偏移
    cards.forEach(card => {
      const id = card.getAttribute('data-comment-id');
      const mark = document.querySelector(`.comment-highlight[data-comment-id="${id}"]`);
      if (mark) {
        const markRect = mark.getBoundingClientRect();
        card.dataset.idealTop = markRect.top - scrollContainerRect.top + scrollContainer.scrollTop;
      } else {
        card.dataset.idealTop = 0;
      }
    });

    // 2. 按理想垂直 Top 偏移比例排序
    cards.sort((a, b) => parseFloat(a.dataset.idealTop) - parseFloat(b.dataset.idealTop));

    // 3. 第二步：执行防重叠碰撞算法
    let lastBottom = 0;
    cards.forEach(card => {
      const idealTop = parseFloat(card.dataset.idealTop);
      // 卡片必须放置在不低于 idealTop 且与上一张卡片保留 12px 间隙的位置
      let actualTop = Math.max(idealTop, lastBottom + 12);
      card.style.top = actualTop + 'px';
      lastBottom = actualTop + card.offsetHeight;
    });
  }

  // 大纲栏的【点评列表】导航更新
  function updateCommentsNavigator() {
    const navPanel = document.querySelector('.comment-nav-list');
    navPanel.innerHTML = '';

    if (comments.length === 0) {
      navPanel.innerHTML = '<div style="font-size: 13px; color: var(--text-light); text-align: center; margin-top: 20px;">暂无点评</div>';
      return;
    }

    comments.forEach(comment => {
      const navItem = document.createElement('div');
      navItem.className = 'comment-nav-item';
      navItem.innerHTML = `
        <div class="comment-nav-quote">“${escapeHTML(comment.text)}”</div>
        <div class="comment-nav-text">${escapeHTML(comment.comment)}</div>
      `;

      navItem.addEventListener('click', () => {
        const mark = document.querySelector(`.comment-highlight[data-comment-id="${comment.id}"]`);
        if (mark) {
          mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          mark.classList.add('active');
          setTimeout(() => {
            mark.classList.remove('active');
          }, 2000);
          
          // 同时也高亮并对齐右侧卡片
          setTimeout(() => {
            const card = document.querySelector(`.margin-comment-card[data-comment-id="${comment.id}"]`);
            if (card) {
              card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              document.querySelectorAll('.margin-comment-card').forEach(c => c.classList.remove('active'));
              card.classList.add('active');
            }
          }, 300);
        }
      });

      navPanel.appendChild(navItem);
    });
  }

  // ==========================================================================
  // 用户文本选择与点评录入逻辑 (Medium-like Bubble)
  // ==========================================================================
  function handleTextSelection(e) {
    if (e.target.closest('#inline-comment-bubble') || 
        e.target.closest('#floating-control-panel') || 
        e.target.closest('#add-comment-trigger') || 
        e.target.closest('.modal')) {
      return;
    }

    const selection = window.getSelection();
    const text = selection.toString().trim();
    const isCommentsVisible = document.getElementById('toggle-comments-btn').classList.contains('active');

    // 仅在点评视图开启时才允许点评
    if (text && isCommentsVisible) {
      const range = selection.getRangeAt(0);
      const contentArea = document.getElementById('md-content');
      
      // 必须在 Markdown 内容区域内选择，且排除代码块和标题等特殊区域
      const parentNode = range.commonAncestorContainer.parentNode;
      const isSpecialArea = parentNode.closest('code') || parentNode.closest('pre') || parentNode.closest('h1') || parentNode.closest('h2') || parentNode.closest('h3');

      if (contentArea.contains(range.commonAncestorContainer) && !isSpecialArea) {
        currentSelectionRange = range.cloneRange();
        currentSelectedText = text;
        showCommentTrigger(range);
        return;
      }
    }
    
    hideCommentTrigger();
  }

  function showCommentTrigger(range) {
    let trigger = document.getElementById('add-comment-trigger');
    if (!trigger) {
      trigger = document.createElement('button');
      trigger.id = 'add-comment-trigger';
      trigger.innerHTML = '💬 点评';
      document.body.appendChild(trigger);
      
      trigger.addEventListener('click', () => {
        showCommentInputBubble();
      });
    }

    const rect = range.getBoundingClientRect();
    trigger.style.left = (rect.left + window.scrollX + (rect.width / 2) - 40) + 'px';
    trigger.style.top = (rect.top + window.scrollY - 38) + 'px';
    trigger.style.display = 'flex';
  }

  function hideCommentTrigger() {
    const trigger = document.getElementById('add-comment-trigger');
    if (trigger) {
      trigger.style.display = 'none';
    }
  }

  function showCommentInputBubble() {
    hideCommentTrigger();
    if (!currentSelectionRange) return;

    const bubble = document.getElementById('inline-comment-bubble');
    const rect = currentSelectionRange.getBoundingClientRect();
    
    bubble.style.left = (rect.left + window.scrollX + (rect.width / 2) - 130) + 'px';
    bubble.style.top = (rect.top + window.scrollY - 135) + 'px';
    bubble.style.display = 'block';

    const textarea = bubble.querySelector('textarea');
    textarea.value = '';
    textarea.focus();
  }

  function hideCommentInputBubble() {
    const bubble = document.getElementById('inline-comment-bubble');
    bubble.style.display = 'none';
    window.getSelection().removeAllRanges();
    currentSelectionRange = null;
    currentSelectedText = '';
  }

  function saveDraftToStorage() {
    if (hasUnsavedChanges) {
      chrome.storage.local.set({
        [storageKey]: {
          unsavedMarkdown: currentMarkdownText,
          baseMarkdown: initialMarkdown,
          timestamp: Date.now()
        }
      });
    } else {
      chrome.storage.local.remove(storageKey);
    }
  }

  // 往内存 Markdown 文本中内嵌写入点评数据
  function saveComment() {
    const bubble = document.getElementById('inline-comment-bubble');
    const commentText = bubble.querySelector('textarea').value.trim();

    if (!commentText) {
      hideCommentInputBubble();
      return;
    }

    // 智能在 raw markdown 对应文本片段位置插入内嵌格式: ==文字==<!-- cmt: 评论 -->
    const targetText = currentSelectedText;
    const index = currentMarkdownText.indexOf(targetText);

    if (index === -1) {
      showToast("无法在源文档中定位此段文字，可能格式过于复杂。", "error");
      hideCommentInputBubble();
      return;
    }

    // 覆写替换
    const before = currentMarkdownText.substring(0, index);
    const after = currentMarkdownText.substring(index + targetText.length);
    currentMarkdownText = before + `==${targetText}==<!-- cmt: ${commentText} -->` + after;

    hasUnsavedChanges = true;
    saveDraftToStorage();
    hideCommentInputBubble();
    
    // 触发响应式重绘页面
    renderMarkdownContent();
    showToast("点评已添加并内嵌在内存中！点击右下角『磁盘』保存到本地 md 文件。");
  }

  // 往内存 Markdown 文本中移除对应的点评并还原为普通文本
  function deleteComment(text, comment) {
    const targetString = `==${text}==<!-- cmt: ${comment} -->`;
    
    if (currentMarkdownText.includes(targetString)) {
      currentMarkdownText = currentMarkdownText.replace(targetString, text);
      hasUnsavedChanges = currentMarkdownText !== initialMarkdown;
      saveDraftToStorage();
      renderMarkdownContent();
      showToast("点评已成功移除！");
    } else {
      showToast("定位点评失败，可能内容已改动。", "error");
    }
  }

  // ==========================================================================
  // 写回本地文件引擎 (File System Access API & 智能降级下载)
  // ==========================================================================
  async function writeMarkdownBackToFile() {
    const title = getFileName(window.location.href);

    // 1. 尝试使用现代 File System Access API 实现一键选择保存/覆盖
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: title,
          types: [{
            description: 'Markdown 文档',
            accept: { 'text/markdown': ['.md', '.markdown', '.mdown'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(currentMarkdownText);
        await writable.close();

        hasUnsavedChanges = false;
        saveDraftToStorage();
        updateSaveStateUI();
        showToast("💾 成功写入本地文件，已与本地磁盘完全同步！", "success");
        return;
      } catch (err) {
        if (err.name === 'AbortError') {
          showToast("用户取消了文件保存选择。", "warning");
          return;
        }
        console.warn("Save picker failed, falling back to download...", err);
      }
    }

    // 2. 传统兼容模式：通过浏览器下载引擎生成并覆盖/保存新文件
    try {
      const blob = new Blob([currentMarkdownText], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      hasUnsavedChanges = false;
      saveDraftToStorage();
      updateSaveStateUI();
      showToast("📥 点评已封装导出，请在系统下载框中保存并覆盖原文件！");
    } catch (e) {
      showToast("文件导出失败，请重试。", "error");
    }
  }

  function updateSaveStateUI() {
    const saveBtn = document.getElementById('save-file-btn');
    const badge = document.getElementById('unsaved-badge');
    
    if (hasUnsavedChanges) {
      saveBtn.style.display = 'flex';
      badge.style.display = 'inline-block';
      // 提示动画
      saveBtn.classList.add('pulse-attention');
    } else {
      saveBtn.style.display = 'none';
      badge.style.display = 'none';
      saveBtn.classList.remove('pulse-attention');
    }
  }

  // ==========================================================================
  // 个人偏好设置与事件绑定
  // ==========================================================================
  function setupDefaultPreferences() {
    // 载入主题 (统一使用下划线 keys，并加载用户可拖拽大纲栏宽度，修复字体加载不生效问题)
    chrome.storage.local.get(['theme', 'zh_font', 'en_font', 'font_size', 'sidebar_width'], (res) => {
      // 1. 主题切换
      const theme = res.theme || 'light';
      document.documentElement.setAttribute('data-theme', theme);
      updateThemeButtonIcon(theme);

      // 2. 字体设置
      const zhFont = res.zh_font || 'system-zh';
      const enFont = res.en_font || 'system-en';
      const fontSize = res.font_size || '16';

      document.getElementById('zh-font-select').value = zhFont;
      document.getElementById('en-font-select').value = enFont;
      document.getElementById('font-size-input').value = fontSize;

      applyFontSettings(zhFont, enFont, fontSize);

      // 3. 载入自定义目录栏宽度偏好
      if (res.sidebar_width) {
        const sidebar = document.getElementById('md-left-sidebar');
        if (sidebar) {
          sidebar.style.width = res.sidebar_width;
        }
      }
    });
  }

  function applyFontSettings(zhFont, enFont, fontSize) {
    const container = document.getElementById('md-app-container');
    if (!container) return;

    // ── 英文字体（仅 Latin 字形，不含 CJK 覆盖）──────────────────────────
    // 不在此处加 system-ui，避免 system-ui 提前覆盖 CJK 字符
    let enPart = '';
    if (enFont === 'inter')      enPart = '"Inter", ';
    else if (enFont === 'georgia')   enPart = 'Georgia, "Times New Roman", ';
    else if (enFont === 'fira-code') enPart = '"Fira Code", Consolas, Monaco, ';
    // system-en: 不加任何前缀，让后面的 system-ui 兜底

    // ── 中文字体（排在 system-ui 之前，确保 CJK 使用指定字体）────────────
    let zhPart = '';
    if (zhFont === 'ms-yahei')  zhPart = '"Microsoft YaHei", "PingFang SC", ';
    else if (zhFont === 'st-heiti') zhPart = '"STHeiti", "STHeiti Light", "PingFang SC", ';
    else if (zhFont === 'kaiti')    zhPart = '"KaiTi", "STKaiti", "BiauKai", "LXGW WenKai", ';
    // 宋体：macOS = Songti SC / STSong，Windows = SimSun
    else if (zhFont === 'simsun')   zhPart = '"Songti SC", "STSong", "SimSun", ';
    // system-zh: 空字符串，由后面 system-ui 兜底

    // ── 最终组合：[英文] + [中文] + [系统兜底] ───────────────────────────
    // 关键：zh 字体在 system-ui 之前，浏览器按顺序为每个字符匹配
    // CJK 字符：跳过英文专用字体 → 命中 zh 字体 ✓
    // Latin 字符：命中英文字体（或 system-ui 兜底）✓
    const combined = enPart + zhPart +
      'system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans GB", "PingFang SC", sans-serif';

    // 直接写 inline style，最高优先级，绕过 CSS 变量解析
    container.style.fontFamily = combined;
    container.style.fontSize   = fontSize + 'px';

    // 同步更新 CSS 变量（供代码块等其它地方引用）
    document.documentElement.style.setProperty('--combined-font-family', combined);
    document.documentElement.style.setProperty('--body-font-size', fontSize + 'px');

    setTimeout(alignCommentCards, 100);
  }

  function setupEventListeners() {
    // 监听文档级划词
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('keyup', handleTextSelection);

    // 划词点评取消 / 保存
    const bubble = document.getElementById('inline-comment-bubble');
    bubble.querySelector('.cancel-btn').addEventListener('click', hideCommentInputBubble);
    bubble.querySelector('.save-btn').addEventListener('click', saveComment);

    // 快捷键支持 (T: 切换主题, O: 折叠侧边栏, S: 一键保存)
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 't') {
        toggleTheme();
      } else if (key === 'o') {
        toggleLeftSidebar();
      } else if (key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (hasUnsavedChanges) {
          writeMarkdownBackToFile();
        }
      }
    });

    // 右下角控制栏点击事件
    document.getElementById('toggle-sidebar-btn').addEventListener('click', toggleLeftSidebar);
    document.getElementById('toggle-theme-btn').addEventListener('click', toggleTheme);
    document.getElementById('save-file-btn').addEventListener('click', writeMarkdownBackToFile);

    // 点击“已修改(未保存)”徽章也可以直接触发保存
    const unsavedBadge = document.getElementById('unsaved-badge');
    if (unsavedBadge) {
      unsavedBadge.addEventListener('click', writeMarkdownBackToFile);
      unsavedBadge.title = "点击保存更改写回 md 文件";
    }

    // 监听大纲展开折叠级别切换
    const depthSelect = document.getElementById('toc-depth-select');
    if (depthSelect) {
      depthSelect.addEventListener('change', () => {
        initializeTOCCollapseStates();
        syncTOCVisibility();
      });
    }
    
    document.getElementById('toggle-comments-btn').addEventListener('click', () => {
      const btn = document.getElementById('toggle-comments-btn');
      const rightSidebar = document.getElementById('md-right-sidebar');
      const contentWrapper = document.getElementById('md-content-wrapper');

      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        rightSidebar.classList.add('collapsed');
        contentWrapper.style.paddingRight = '24px';
      } else {
        btn.classList.add('active');
        rightSidebar.classList.remove('collapsed');
        contentWrapper.style.paddingRight = '24px';
      }
      
      renderCommentCards();
    });

    // 字体排版设置模态窗
    const fontBtn = document.getElementById('font-settings-btn');
    const fontModal = document.getElementById('font-settings-modal');
    const closeFontBtn = document.getElementById('close-font-modal-btn');

    fontBtn.addEventListener('click', () => {
      fontModal.classList.add('active');
    });

    closeFontBtn.addEventListener('click', () => {
      const zh = document.getElementById('zh-font-select').value;
      const en = document.getElementById('en-font-select').value;
      const size = document.getElementById('font-size-input').value;

      applyFontSettings(zh, en, size);
      chrome.storage.local.set({
        zh_font: zh,
        en_font: en,
        font_size: size
      });

      fontModal.classList.remove('active');
    });

    fontModal.addEventListener('click', (e) => {
      if (e.target === fontModal) {
        closeFontBtn.click();
      }
    });

    // 一键导出PDF / 打印
    document.getElementById('print-pdf-btn').addEventListener('click', () => {
      window.print();
    });

    // 左侧 Sidebar Tab 切换
    document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-content .tab-panel').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        document.getElementById('tab-' + tabId).classList.add('active');
      });
    });

    // 监听窗口大小改变，重新对齐卡片
    window.addEventListener('resize', alignCommentCards);
  }

  function toggleLeftSidebar() {
    const sidebar = document.getElementById('md-left-sidebar');
    const btn = document.getElementById('toggle-sidebar-btn');
    
    if (sidebar.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      btn.classList.remove('active');
    } else {
      sidebar.classList.add('collapsed');
      btn.classList.add('active');
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', nextTheme);
    chrome.storage.local.set({ theme: nextTheme });
    updateThemeButtonIcon(nextTheme);

    // 重新渲染 Mermaid (自适应深浅色配色)
    const container = document.getElementById('md-content');
    if (container.querySelector('.mermaid')) {
      renderMarkdownContent();
    }
  }

  function updateThemeButtonIcon(theme) {
    const btn = document.getElementById('toggle-theme-btn');
    if (theme === 'dark') {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.01a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>`;
    } else {
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 9.79 9.79 0 0 0-.5-2.69 1 1 0 0 0-1.9.4A7 7 0 1 1 12.5 5a1 1 0 0 0 .4-1.9A9.79 9.79 0 0 0 12 3z"/></svg>`;
    }
  }

  function syncTOCVisibility() {
    const items = Array.from(document.querySelectorAll('.toc-list .toc-item'));
    if (items.length === 0) return;

    // 1. 先重置所有大纲项为可见状态
    items.forEach(item => {
      item.style.display = 'flex'; // 目录项使用 flex 布局以保证箭头和文字完美对齐
    });

    // 2. 自上而下遍历，如果发现某个可见项处于折叠状态，隐藏其所有子孙节点
    for (let i = 0; i < items.length; i++) {
      const parentItem = items[i];
      if (parentItem.style.display !== 'none' && parentItem.classList.contains('collapsed')) {
        const parentLevel = parseInt(parentItem.getAttribute('data-level'));
        for (let j = i + 1; j < items.length; j++) {
          const childItem = items[j];
          const childLevel = parseInt(childItem.getAttribute('data-level'));
          if (childLevel > parentLevel) {
            childItem.style.display = 'none';
          } else {
            break; // 遇到了同级或更高级标题，停止隐藏
          }
        }
      }
    }
  }

  function initializeTOCCollapseStates() {
    const items = document.querySelectorAll('.toc-list .toc-item');
    const depthSelect = document.getElementById('toc-depth-select');
    const maxDepth = depthSelect ? parseInt(depthSelect.value) : 6;

    items.forEach(item => {
      const level = parseInt(item.getAttribute('data-level'));
      // 如果标题层级大于或等于当前全局展开层级，代表其子节点将被隐藏，因此初始化为折叠状态 (collapsed)
      if (level >= maxDepth) {
        item.classList.add('collapsed');
      } else {
        item.classList.remove('collapsed');
      }
    });
  }

  function setupSidebarResizer() {
    const resizer = document.getElementById('md-left-resizer');
    const sidebar = document.getElementById('md-left-sidebar');
    const mainLayout = document.getElementById('md-main-layout');
    if (!resizer || !sidebar || !mainLayout) return;

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizer.classList.add('dragging');
      sidebar.classList.add('resizing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent) => {
        let newWidth = moveEvent.clientX - mainLayout.getBoundingClientRect().left;
        if (newWidth < 180) newWidth = 180;
        if (newWidth > 500) newWidth = 500;
        sidebar.style.width = newWidth + 'px';
      };

      const onMouseUp = () => {
        resizer.classList.remove('dragging');
        sidebar.classList.remove('resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        // 拖拽结束后，持久化宽度到本地 Storage
        chrome.storage.local.set({ sidebar_width: sidebar.style.width });

        // 重新对齐右侧点评卡片
        alignCommentCards();
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // 双击分隔线恢复默认 280px 宽度
    resizer.addEventListener('dblclick', () => {
      sidebar.style.width = '280px';
      chrome.storage.local.set({ sidebar_width: '280px' });
      alignCommentCards();
    });
  }

  // ==========================================================================
  // Toast & Utility Helpers
  // ==========================================================================
  function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = escapeHTML(message);

    container.appendChild(toast);

    // 0.1s 后移入
    setTimeout(() => toast.classList.add('visible'), 50);

    // 4s 后淡出移出
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
    }, 4000);
  }

  function getFileName(urlStr) {
    try {
      const decoded = decodeURIComponent(urlStr);
      const parts = decoded.split('/');
      const last = parts[parts.length - 1];
      if (last.includes('?')) {
        return last.split('?')[0];
      }
      return last || "Untitled.md";
    } catch (e) {
      return "Document.md";
    }
  }

  function updateDocumentStats(text) {
    // 去除常规格式后的纯文本文档字数统计
    const textClean = text.replace(/==([^=]+)==<!-- cmt: ([\s\S]*?) -->/g, '$1') // 还原点评内容
                          .replace(/[\*\#\`\_\[\]\(\)\-\+\!\<\>]/g, '')
                          .trim();
    
    const cnCharCount = (textClean.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enWordCount = (textClean.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9_\-]+/g) || []).length;
    const totalWords = cnCharCount + enWordCount;

    const readTime = Math.max(1, Math.round(totalWords / 400));

    document.getElementById('stat-word-count').textContent = `字数: ${totalWords}`;
    document.getElementById('stat-read-time').textContent = `预估阅读: ${readTime} 分钟`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getFilePathDisplay(urlStr) {
    try {
      let pathOnly = urlStr;
      if (urlStr.includes('://')) {
        const urlObj = new URL(urlStr);
        pathOnly = urlObj.pathname;
      }
      if (pathOnly.includes('?')) {
        pathOnly = pathOnly.split('?')[0];
      }
      // 在提取完 pathname 后，统一对 URL 编码的字符进行解码，防止非 ASCII（如中文）文件名显示为 %E5%A4...
      const decodedPath = decodeURIComponent(pathOnly);

      // Split and filter out empty segments
      const parts = decodedPath.split('/').filter(p => p.trim() !== '');
      if (parts.length === 0) {
        return "Untitled.md";
      }
      if (parts.length <= 3) {
        return parts.join('/');
      } else {
        const lastThree = parts.slice(-3);
        return '.../' + lastThree.join('/');
      }
    } catch (e) {
      return getFileName(urlStr);
    }
  }
})();
