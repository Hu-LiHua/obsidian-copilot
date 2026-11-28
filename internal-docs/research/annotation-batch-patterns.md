# 划选 → 批注 → 攒多条 → 一次性提交：成熟产品的交互模式调研

> 调研目的：校准 Obsidian Copilot「划选内容 → 浮出引用按钮 → 原地批注弹框 → 引用徽章攒在聊天输入框上方 → 一次性发给 agent」的原型设计。
> 方法：只取一手来源（官方文档 / 官方规范 / 开源仓库）。每条论断附来源链接；找不到一手来源的论断明确标注。
> 日期：2026-11-25

---

## 1. TL;DR — 我们该抄哪些做法

- **批量提交模型的黄金标准是 GitHub Pull Request review**：`Start a review` 之后的评论是 _pending_（只有自己可见、可随时编辑、可整体 Discard），入口按钮变为 `Add review comment` 继续攒，最后 `Submit review` 时加一段总结并选择 Comment / Approve / Request changes 一次提交。我们的「攒多条引用+批注 → 一条消息发给 agent」应当逐字抄这个状态机。
- **入口浮层：选区旁的小浮层 + 单一主操作**。Google Docs / Notion / Hypothes.is / Acrobat 全部是「划选 → 选区旁浮层」，其中 Acrobat 给出最好的按钮组设计（一个主按钮 Add a comment + 若干图标化次操作），Hypothes.is 的 adder 最克制（只有 Annotate / Highlight 两个动作）。
- **批注撰写处：就地弹框（GitHub 行内评论框 / Acrobat pop-up note / VS Code inline chat），而不是把用户拽到侧栏**；侧栏（Hypothes.is / Google Docs margin / Zotero Annotations 面板）只承担「汇总与回跳」。VS Code 是唯一一个把「选区附件」累积展示在聊天输入框内（chips）且草稿保留附件的产品——这正是我们「引用徽章出现在聊天输入框上方」的原型。
- **锚定：存「exact 原文 + 位置」两份数据**。W3C Web Annotation 数据模型给出了可直接照抄的两种 selector：TextQuoteSelector（exact + prefix/suffix 消歧义）和 TextPositionSelector（start/end 字符偏移），二者互补：quote 对人可读、position 对机器精确定位。
- **给 LLM 的组织方式没有行业统一格式**，但可借鉴：GitHub 的 `suggestion` fenced block（引用内容放 fenced block、批注写在其外）、Raycast 的 `{selection}` 占位符（引用文本与指令分离）、Zotero 的 note template（每条 = 引文 + 指回原文的链接，成对出现）。推荐：每条「引用 + 批注」配对编号，引用用 fenced block，批注紧跟其后。
- **诚实记录**：Google Docs、Notion、Hypothes.is、Zotero、Acrobat、Raycast、ChatGPT/Claude 桌面端都没有「攒多条待提交草稿 → 一次提交」的模型；GitHub 是唯一把它做全的产品，VS Code 的「草稿内累积附件」是最接近的 AI 产品变体。

---

## 2. 逐产品五轴对照

### 2.1 GitHub Pull Request review — pending 评论批量模型（本功能的黄金标准）

来源：[Reviewing proposed changes in a pull request — GitHub Docs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request)

- **A. 入口**：hover 到 diff 行出现蓝色评论图标；点击行号拖动或 Shift+点击可选中多行范围再点评论图标。无选区浮层，是行侧图标。
- **B. 批注撰写处**：评论框**原地出现在 diff 行内**（行内评论框）；也可以对整个文件发 file-level comment（文件右侧评论图标）。
- **C. 攒批与批量提交**：**有，且是全行业最完整的 pending 模型**。
  - 第一条评论用 `Start a review` 提交，之后按钮变为 `Add review comment` 继续攒；
  - 提交 review 前，所有行评论都是 _pending_，**只有自己可见**；
  - pending 评论**可随时编辑**；
  - 点 `Submit review` 后选 `Discard review` 可**一次性丢弃整个 pending review 及其所有评论**；
  - 提交入口叫 `Review changes` / `Submit review`：先写一条总结评论，再选 Comment / Approve / Request changes 三种类型之一。
- **D. 锚定与展示**：锚定 = 文件 + 行号（或多行范围）；评论可内嵌 `suggestion` fenced block（引用原文并附建议替换代码，选中行会被自动复制进评论框）；pending 数量在 review 入口上聚合展示，提交后整个 review 作为**一个单元**（N 条评论 + 1 条总结）出现在 PR 时间线。
- **E. 给 LLM 的组织方式**：GitHub 官方文档明确：若 PR 由 GitHub Copilot 创建，「Copilot will respond to your comments when you submit them」——即**批量提交（Submit review）才是触发 agent 的时机**，逐条 pending 不触发；agent 收到的是带行号锚点的多条评论 + 总结的聚合体。

### 2.2 Google Docs — 选区旁按钮 + 页边 margin 线程（无批量）

来源：[Use comments, action items, & emoji reactions — Google Docs Editors Help](https://support.google.com/docs/answer/65129?hl=en&co=GENIE.Platform%3DDesktop)

- **A. 入口**：highlight 文本/图片/单元格后，**工具栏出现 Add comment 按钮**（选中文本时也会在右侧 margin 出现 emoji 反应按钮）。官方文档没有描述「选区旁的浮动小按钮」，是固定工具栏位 + margin 操作。
- **B. 批注撰写处**：点击后在**右侧 margin 打开评论框**，不在选区原地。
- **C. 攒批与批量提交**：**无**。每条评论点击 `Comment` 即时发布；无 pending 草稿聚合。聚合能力体现在：评论线程可 reply / resolve、评论面板可按人/状态过滤、可搜索、可用 J/K/R/E/U 键盘键导航回复。
- **D. 锚定与展示**：锚定 = 高亮文字本身；点击右侧面板中的评论会**跳转到其在文档中的位置**；margin 评论可 minimize 成图标（hover 预览）。
- **E.** 不适用（非 AI 批注产品）。

### 2.3 Notion — 浮动菜单 Comment + 页右 margin（无批量）

来源：[Comments, mentions & reactions — Notion Help](https://www.notion.com/help/comments-mentions-and-reminders)、[Intro to writing & editing — Notion Help](https://www.notion.com/help/writing-and-editing-basics)

- **A. 入口**：**Select any text → 弹出菜单里选 `Comment`**（划选浮动菜单）；另有三种等价入口：hover 块的 `⋮⋮` 菜单、hover 出现的 `💬` 图标、快捷键 `cmd/ctrl + shift + M`。
- **B. 批注撰写处**：评论**默认显示在正文右侧 margin**（"page comments will appear to the right of the corresponding text"），可在页面设置里切成 Minimal（只显示图标）。
- **C. 攒批与批量提交**：**无**。每条即时发布；官方明确「不能同时对多个块加评论，但可以跨块选择文字并加评论」。聚合靠页面顶部 `💬` 打开的 **Comments pane**（可点评论跳转原文、按人/状态过滤）。
- **D. 锚定与展示**：锚定 = 被选中的文字（可跨块）；长线程在 margin 中折叠。
- **E. Notion AI**：官方编辑文档记录的是块级入口 `⋮⋮ → Ask AI`；AI 聊天里用 @-mention 页面 / source picker 指定上下文。官方帮助文档未记载「划选 → AI 批注 → 攒多条」的批量流。

### 2.4 Hypothes.is — adder 浮层 + 侧栏编辑（锚定机制最值得抄）

来源：[Annotation Basics — Hypothesis Help](https://web.hypothes.is/help/annotation-basics/)、[W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)、[hypothesis/client 开源仓库](https://github.com/hypothesis/client)

- **A. 入口**：划选文字后**选区旁弹出 "annotation adder" 小浮层**，只有两个动作：`Annotate`（带批注）或 `Highlight`（纯高亮）。
- **B. 批注撰写处**：点击后在**右侧 Sidebar 打开编辑卡片**（富文本、标签、markdown），不在选区原地；发布前可 Preview。
- **C. 攒批与批量提交**：**无**。每条批注 `Post to <group>` 即时发布（可选 Only Me 私有）；Sidebar 聚合展示、可 reply 成线程、可回改可删。
- **D. 锚定与展示**：锚定遵循 **W3C Web Annotation 数据模型**，客户端开源实现选区→锚点的转换。规范里两种互补 selector（原文引用见下）：
  - **TextQuoteSelector**：`exact`（选区原文副本，规范化后）+ `prefix` / `suffix`（前后各取一小段用于消歧义——"describes a range of text by copying it, and including some of the text immediately before (a prefix) and after (a suffix) it"），见 [§4.2.4](https://www.w3.org/TR/annotation-model/#text-quote-selector)；
  - **TextPositionSelector**：`start` / `end` 字符偏移（对位置精确但对文档变更脆弱），见 [§4.2.5](https://www.w3.org/TR/annotation-model/#text-position-selector)；
  - Sidebar 卡片展示 = 高亮原文（quoted text）+ 批注正文，每条批注有独立可分享 URL。
- **E.** 不适用（非 AI 产品），但其 selector 双份数据思想直接适用于我们（见 §4 建议 5）。

### 2.5 VS Code Copilot Chat — 选区进聊天的官方形态（chips 累积在输入框）

来源：[Add context to chat — VS Code Docs](https://code.visualstudio.com/docs/copilot-chat/context)、[Inline chat and Quick Chat — VS Code Docs](https://code.visualstudio.com/docs/chat/inline-chat)

- **A. 入口**：三条路：(1) 选中代码后 `Ctrl/Cmd+I` 唤起 **inline chat**（输入框出现在选区处，提示语明确 "Select a block of code in the editor to scope the prompt to that code"）；(2) **实验特性 `inlineChat.affordance`**：划选文本时在选区内光标处显示可视提示，附带"把选区加入聊天 / 解释 / 代码评审"的动作按钮——与我们「浮出引用按钮」的原型几乎同构；(3) Chat 视图里用 `#`-mention / `Add Context (+)` picker / 拖拽文件。
- **B. 批注撰写处**：inline chat 在选区原地；Chat 视图在底部输入框。
- **C. 攒批与批量提交**：**有「草稿内累积」变体**：官方文档记载 "You can attach multiple items. The attachments are preserved in a draft and included when you send the request"——附件（chips）在输入框上方累积展示、随一条消息一起发出，发送前可逐个增删。没有 GitHub 式的 pending-review 语义（无独立 discard-all / 总结语），但「多条上下文 chips + 一条消息」就是 AI 产品里最接近我们原型的形态。
- **D. 锚定与展示**：选区上下文以附件 chip 形式呈现在输入框内（文档配图显示 chip + 文件名）；文档要求发送前"确认附件出现在输入框中"。官方文档未公开 chips 内部的 prompt 序列化格式——此点我们无一手来源，不臆断。
- **E. 给 LLM 的组织方式**：上下文用 `#`-mention 标记显式引用（`#file`、`#codebase`、`#fetch` 等，见 [Tools and context reference](https://code.visualstudio.com/docs/agents/reference/tools-reference)）；web 内容用 `#fetch <url>`；多个附件一起进入同一条请求。

### 2.6 Cursor — @-mentions 聚合上下文（官方文档无划选浮层）

来源：[Prompting agents — Cursor Docs](https://cursor.com/docs/agent/prompting)、[@ mentions and context — Cursor Help](https://cursor.com/help/customization/context)、[Agent — Cursor Docs](https://cursor.com/docs/agent/overview)

- **A. 入口**：官方文档**没有记载划选浮层**。选区进聊天的路径（编辑器选代码 → `Ctrl/⌘+Shift+L` "Add to Chat"）目前只见于 [Cursor 官方论坛帖子](https://forum.cursor.com/t/code-mention-doesnt-work/151625)（非官方文档，如实标注）。
- **B. 批注撰写处**：聊天输入框（sidepane，`Cmd+I`）。
- **C. 攒批与批量提交**：**无 pending 语义**；但允许多次 `@` 把多个文件/文件夹/终端/diff/browser 同时附到**同一条** prompt（"Type `@` multiple times to attach several items"），外加排队消息（queue）模型在 agent 工作时攒多条后续指令。
- **D. 锚定与展示**：`@auth.ts`、`@src/components/` 这样的文件/路径引用；Agent Review（本地变更的 AI 代码评审）走 `/agent-review` 或 Source Control 标签页，不是行级批注模型。
- **E. 给 LLM 的组织方式**：@-mention 作为上下文 token 与文字 prompt 混排；agent 自行搜索兜底（"If you're not sure which files matter, skip it"）。

### 2.7 Zotero PDF 阅读器 — 高亮 → 批注列表 → 批量 Add to Note

来源：[Zotero PDF Reader and Note Editor — Zotero Documentation](https://www.zotero.org/support/pdf_reader)

- **A. 入口**：划选文字后**选区旁弹出带颜色圆点的浮层**（unlocked 模式默认行为）；另有 locked 模式：锁定工具后每次划选自动按所选颜色生成高亮，专为「快速攒大量高亮」设计。
- **B. 批注撰写处**：高亮后在浮层选颜色即成批注；批注正文编辑发生在**左侧 Annotations 侧栏**或点开的批注卡；笔记在右侧 Notes 面板写。
- **C. 攒批与批量提交**：**有，面向笔记的批量聚合**：
  - 在 PDF / Annotations 侧栏**多选**批注 → 右键 `Add to Note`；
  - 或单条拖拽进已打开的笔记；
  - 一键 `Add Item Note from Annotations` 把**整个 PDF 的全部批注**生成一条笔记；
  - 提交产物是"一条笔记"，入口叫 Add to Note / Add Note from Annotations。
- **D. 锚定与展示**：高亮锚定在 PDF 页面位置；进入笔记的每条批注**自动带上指回 PDF 页面的链接与引用**（"Annotations added to notes will automatically include links back to the PDF page as well as citations"），笔记里点 `Show on Page` 跳回原文；格式由 note templates 定制。
- **E.** 不适用（非 AI 产品），但其「引用 + 回跳链接成对出现」的呈现值得抄。

### 2.8 Adobe Acrobat — 划选浮动工具栏 + pop-up note（无批量）

来源：[Add comments to selected text or images — Adobe Acrobat Help](https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/review-documents/add-comments.html)（helpx 直接抓取被反爬拦截，内容取自 [Internet Archive 快照](https://web.archive.org/web/20251219060648/https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/review-documents/add-comments.html)）；[Keyboard shortcuts in Acrobat — Adobe Help](https://helpx.adobe.com/acrobat/desktop/get-started/preferences-and-settings/keyboard-shortcuts.html)

- **A. 入口**：用 Select text tool 划选文字或图片后，出现**浮动工具栏**，动作项：`Add a comment`、`Highlight text`、`Underline text`、`Strikethrough text`、`Redact text`、`Copy Text`、`Edit a PDF`——一个主按钮 + 一排图标化次操作。
- **B. 批注撰写处**：选 `Add a comment` → 输入 → `Post`。评论以 **pop-up note**（弹在标记处）呈现，键盘快捷键文档确认行为："Open pop-up note (or text field in the Comments list) for comments in focus"。
- **C. 攒批与批量提交**：**无**。每条即时 Post；聚合靠 Comments 列表面板（查看/编辑/删除/Resolve/reply），没有用户级 pending 草稿批量模型。
- **D. 锚定与展示**：评论锚定在被选文字/图片上，呈现为高亮 + 侧边注释图标（hover 展开弹窗）；Comments 列表集中展示。
- **E.** 不适用。

### 2.9 ChatGPT / Claude 桌面端、Raycast AI — 全局划选唤起 AI

- **ChatGPT 桌面端**：**无官方一手文档记载「划选 → 批注/评论 → 发送」流程**。OpenAI 帮助中心当前的桌面端文章只覆盖 Voice / Projects（[ChatGPT Voice](https://help.openai.com/en/articles/8400625-chatgpt-on-your-desktop)、[Projects in ChatGPT](https://help.openai.com/en/articles/10169521-using-chatgpt-on-your-mac)），划选类能力（截图询问屏幕）无批量语义。如实记录：无。
- **Claude 桌面端**：Anthropic 官方支持文档同样**没有**记载划选批注批量流。如实记录：无。
- **Raycast AI**（有完整官方文档，可作为全局划选类的代表）：来源：[AI Commands — Raycast Manual](https://manual.raycast.com/ai/ai-commands)
  - **A. 入口**：在任意 app 里选中文本 → 唤起 Raycast Root Search → 运行命令；或 Quick Fix 热键（默认双击右 Shift）**不离开当前 app 直接对选区执行**（需辅助功能权限；`Prefer Selection` 选项控制只作用于选区还是整个输入框）。
  - **B. 撰写/结果处**：结果出现在 Raycast 窗口（可继续对话），或按 Output Behavior 设为 `Replace Selection` **原地写回**替换选中文本。
  - **C. 攒批**：**无**，单条一次性命令。
  - **E. 给 LLM 的组织方式**：prompt 里用 **`{selection}` Dynamic Placeholder** 把选中文本插入指令（如 `Translate {selection} to Swedish`），`{argument}` 占位符在运行时向用户追问参数——「指令模板与引用内容分离」的干净范式。

---

## 3. 总对照表（产品 × 五轴）

| 产品                      | A. 入口                                                                 | B. 批注撰写处                             | C. 攒批/批量提交                                                                                                | D. 锚定与展示                                                                                         | E. 给 LLM 的组织                                              |
| ------------------------- | ----------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **GitHub PR review**      | diff 行 hover 评论图标；行号拖选多行                                    | 行内评论框（原地）                        | **有**：Start a review → pending（仅自己可见、可编辑、Discard）→ Review changes/Submit review + 总结 + 三种类型 | 文件+行号（range）；`suggestion` fenced block；整单提交                                               | Copilot agent 在 **Submit review 时**响应批量评论（官方文档） |
| **Google Docs**           | 高亮 → 工具栏 Add comment                                               | 右侧 margin 评论框                        | 无（即时发布；面板过滤/搜索聚合）                                                                               | 高亮文字锚定；面板点击回跳；可缩成图标                                                                | 不适用                                                        |
| **Notion**                | 划选 → 浮动菜单 Comment；💬 / ⋮⋮ / ⌘⇧M                                  | 右侧 margin                               | 无（即时；Comments pane 聚合；不能多块但可跨块选文字）                                                          | 选中文字（可跨块）；长线程折叠                                                                        | 块级 ⋮⋮→Ask AI；AI 聊天 @-mention 页面（无划选批量流）        |
| **Hypothes.is**           | 划选 → 选区旁 adder 浮层（Annotate/Highlight）                          | 右侧 Sidebar 编辑卡                       | 无（Post to group 即时）                                                                                        | **TextQuoteSelector (exact+prefix/suffix) + TextPositionSelector (start/end)**（W3C）；卡片=引文+批注 | 不适用                                                        |
| **VS Code Copilot Chat**  | 选区 Ctrl+I inline chat；实验性划选提示（affordance）；#-mention/picker | inline chat 原地 / 底部输入框             | **变体**：附件 chips 在草稿输入框累积，随一条消息发出（草稿保留）                                               | chip 显示文件/选区；选区限定 prompt 范围                                                              | #-mention 标记 + 附件多合一请求                               |
| **Cursor**                | 官方无划选浮层（论坛载 Ctrl+⇧+L，非官方文档）                           | 聊天输入框                                | 无 pending；多次 @ 同条 prompt 聚合；queue 攒指令                                                               | @文件/路径 引用                                                                                       | @-mention 与 prompt 混排                                      |
| **Zotero PDF**            | 划选 → 颜色浮层；locked 模式自动高亮                                    | 浮层选色成批注；侧栏/卡片编辑             | **有**（面向笔记）：多选 → Add to Note；Add Note from Annotations 全量导出                                      | PDF 页面位置锚定；进笔记自动带引用+回页链接（note template 可定制）                                   | 不适用                                                        |
| **Acrobat**               | 划选 → 浮动工具栏（Add a comment 主按钮+图标组）                        | pop-up note（标记处）→ Post               | 无（即时；Comments 列表聚合）                                                                                   | 选中文字/图片锚定；高亮+图标+弹窗                                                                     | 不适用                                                        |
| **Raycast AI**            | 任意 app 划选 → Raycast / Quick Fix 热键                                | Raycast 窗口 / Replace Selection 原地写回 | 无（单发命令）                                                                                                  | 选区即输入，无持久锚定                                                                                | `{selection}` 占位符插入 prompt                               |
| **ChatGPT/Claude 桌面端** | 无官方划选批注流（文档仅 Voice/Projects）                               | —                                         | 无                                                                                                              | —                                                                                                     | —                                                             |

---

## 4. 对我们原型的具体建议清单

1. **入口浮层要小、单主操作、次操作图标化。** 划选后浮层只放一个 `引用`（或 `Add comment`）主按钮 + 至多 2–3 个图标动作；不要做成第二行工具条。学自：Hypothesis adder 的克制（[来源](https://web.hypothes.is/help/annotation-basics/)）、Acrobat 浮动工具栏的主次分层（[来源](https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/review-documents/add-comments.html)）、Google Docs/Notion 的划选→单按钮心智（[来源 1](https://support.google.com/docs/answer/65129) / [来源 2](https://www.notion.com/help/comments-mentions-and-reminders)）。
2. **批注弹框原地出现，带引文回显。** 点击引用后弹框出现在选区附近，框内顶部回显被引原文（不是让用户盲写）。学自：GitHub 行内评论框 + 选中行自动复制进评论框（[来源](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request)）、VS Code inline chat 出现在选区处（[来源](https://code.visualstudio.com/docs/chat/inline-chat)）。
3. **批量 pending 模型照抄 GitHub review 状态机。** 首条批注 = 开始攒批（此后徽章不断累加）；pending 批注**仅本地可见**、逐条可编辑/删除、提供一次性的"全部丢弃"；发送入口 = 一条消息 + 可选的总结语。AI 场景下把 GitHub 的 `Submit review` 对应到「发送消息」，`Discard review` 对应「清空引用」。学自：GitHub（[来源](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request)）。
4. **引用徽章 = 聊天输入框上方的累积 chips。** 每条 pending「引用+批注」在输入框上方渲染为 chip（显示引文摘录 + 批注状态标记：空草稿/已写批注），点击展开编辑，× 移除；chips 保存在草稿里、随一条消息整体发出。学自：VS Code 附件 chips 在输入框累积且草稿保留（[来源](https://code.visualstudio.com/docs/copilot-chat/context)）。
5. **锚定存两份数据：exact 原文 + 位置。** 存 `exact`（选区规范化文本）+ `prefix`/`suffix`（前后 32 字符级消歧义）+ `start`/`end`（字符偏移）。笔记编辑导致偏移漂移时用 quote 回查、用 prefix/suffix 消歧义，模型与 Obsidian 插件生态均可在本地实现。学自：W3C Web Annotation TextQuoteSelector / TextPositionSelector（[规范](https://www.w3.org/TR/annotation-model/)），Hypothesis 客户端是该模型的开源实现（[仓库](https://github.com/hypothesis/client)）。
6. **Prompt 组织：每条「引用块 + 批注」配对编号，引用用 fenced block。** 发送时把多条引用渲染为编号配对：引用文本放 fenced block（保留换行与格式），用户批注紧跟其后；消息开头放总结指令。GitHub 的 `suggestion` 块证明 fenced block 内嵌引用 + 注释在其外的结构可读性最好（[来源](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request)）；Raycast 的 `{selection}` 占位符证明"指令模板与引用内容分离"（[来源](https://manual.raycast.com/ai/ai-commands)）；Zotero 的批注→笔记结构证明每条引用必须携带可回跳的锚点信息（[来源](https://www.zotero.org/support/pdf_reader)）。
7. **发送时机 = agent 触发时机。** 参考 GitHub：pending 阶段不惊动 agent，**Submit 才触发**。我们的「引用徽章攒在输入框」阶段不应产生任何模型调用；点发送才把全部「引用+批注」组装成一条消息。
8. **提供无批注的纯引用快捷路径。** Hypothesis 把 Highlight（无正文的批注）与 Annotate 并列为两个一等动作，Zotero 的 locked 模式专为快速攒纯高亮设计。我们的「引用」按钮应允许用户只划选不写字、之后在 chip 上补批注。学自：Hypothesis / Zotero（[来源 1](https://web.hypothes.is/help/annotation-basics/) / [来源 2](https://www.zotero.org/support/pdf_reader)）。

---

## 5. 来源清单

1. GitHub Docs — Reviewing proposed changes in a pull request: <https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/reviewing-proposed-changes-in-a-pull-request>
2. Google Docs Editors Help — Use comments, action items, & emoji reactions: <https://support.google.com/docs/answer/65129?hl=en&co=GENIE.Platform%3DDesktop>
3. Notion Help — Comments, mentions & reactions: <https://www.notion.com/help/comments-mentions-and-reminders>
4. Notion Help — Intro to writing & editing: <https://www.notion.com/help/writing-and-editing-basics>
5. Notion Help — Everything you can do with Notion AI: <https://www.notion.com/help/guides/everything-you-can-do-with-notion-ai>
6. Hypothesis Help — Annotation Basics: <https://web.hypothes.is/help/annotation-basics/>
7. W3C Recommendation — Web Annotation Data Model: <https://www.w3.org/TR/annotation-model/>（TextQuoteSelector §4.2.4 / TextPositionSelector §4.2.5）
8. hypothesis/client 开源仓库: <https://github.com/hypothesis/client>
9. VS Code Docs — Add context to chat: <https://code.visualstudio.com/docs/copilot-chat/context>
10. VS Code Docs — Inline chat and Quick Chat（含 `inlineChat.affordance` 实验特性）: <https://code.visualstudio.com/docs/chat/inline-chat>
11. VS Code Docs — Tools and context reference: <https://code.visualstudio.com/docs/agents/reference/tools-reference>
12. Cursor Docs — Prompting agents: <https://cursor.com/docs/agent/prompting>
13. Cursor Help — @ mentions and context: <https://cursor.com/help/customization/context>
14. Cursor Docs — Agent / Agent Review: <https://cursor.com/docs/agent/overview> / <https://cursor.com/docs/agent/agent-review>
15. Cursor Forum — Add to Chat (Ctrl/⌘+Shift+L)（非官方文档，仅佐证）: <https://forum.cursor.com/t/code-mention-doesnt-work/151625>
16. Zotero Documentation — Zotero PDF Reader and Note Editor: <https://www.zotero.org/support/pdf_reader>
17. Adobe Help — Add comments to selected text or images（经 Internet Archive 快照访问）: <https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/review-documents/add-comments.html> / <https://web.archive.org/web/20251219060648/https://helpx.adobe.com/acrobat/desktop/share-and-review-documents/review-documents/add-comments.html>
18. Adobe Help — Keyboard shortcuts in Acrobat on desktop（pop-up note 行为）: <https://helpx.adobe.com/acrobat/desktop/get-started/preferences-and-settings/keyboard-shortcuts.html>
19. Raycast Manual — AI Commands（含 `{selection}` 占位符与 Quick Fix）: <https://manual.raycast.com/ai/ai-commands>
20. OpenAI Help — ChatGPT Voice / Projects in ChatGPT（佐证桌面端无划选批注批量流的官方文档）: <https://help.openai.com/en/articles/8400625-chatgpt-on-your-desktop> / <https://help.openai.com/en/articles/10169521-using-chatgpt-on-your-mac>
