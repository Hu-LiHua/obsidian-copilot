---
status: accepted
---

# Use Obsidian's internal Live Preview per response for Copilot Chat assistant replies

Copilot Chat currently renders assistant replies via Obsidian's static Reading View (`MarkdownRenderer`), which prevents users from inspecting or copying raw LaTeX/Markdown source inside rendered math, callout, or link widgets. We decided to keep Reading View as the default and add a transient per-response footer toggle that switches a completed **Response** into a read-only instance of Obsidian's internal embeddable Live Preview editor (with automatic Reading Fallback), rather than building a custom CodeMirror 6 decorator or replacing Reading View globally.

## Considered Options

- **Reuse Obsidian's internal embeddable Live Preview mechanism + Reading Fallback (chosen)**: Gives native parity with Obsidian's note editor across math, callouts, tables, wikilinks, and user themes/CSS snippets without reimplementing Obsidian's widget system; internal API risk is bounded by a host-injected adapter and Reading Fallback.
- **Custom CodeMirror 6 Live Preview decorations**: Uses only public `@codemirror/view` and `@codemirror/state` externals, but requires reimplementing and maintaining Obsidian's Markdown/MathJax/callout/table widgets and never matches native theme behavior.
- **Keep Reading View with a per-widget source inspection popup**: Avoids internal APIs and editor lifecycle complexity, but loses Obsidian's native cursor-unfolding Live Preview workflow across arbitrary syntax widgets.
- **Default globally to Live Preview (with or without a settings switch)**: Avoids a footer button, but adds streaming-transition churn, increases long-chat editor memory pressure, and complicates Dataview DQL and Miyo link-badge rendering in the default view.

## Consequences

- **Default Reading View with per-response footer toggle**: Streaming and finished responses stay in Reading View by default with no new global setting. A transient, non-persisted toggle in the response footer (`AgentMessageActions` and partless assistant `ChatButtons`) switches all assistant text segments of that response—including inline `SubAgentCard` prompt/return text and partless/continued assistant replies—together; `TaskDetailView` (`SubagentDetail`) and `AskedAgentView` inherit the same mechanism via `AgentTrail` footers. Stop/error notices, `ReasoningBlock`, `PlanPreviewView`, user messages, `TurnDiffView`, and Quick Chat stay unchanged.
- **Navigable Read-Only contract**: Live Preview uses CodeMirror 6's built-in `EditorState.readOnly.of(true)` without custom keyboard, paste, or IME DOM interception. Users can click or arrow-key into widgets to unfold and copy raw source while document edits are blocked; toggling does not steal focus or jump scroll, unfocused carets stay hidden/collapsed, and plain left-clicks on internal links still open notes (`Alt/Option + Click` or arrow keys reveal raw link syntax).
- **Safety, extensions, and host boundary**: Live Preview retains `?no-dataview` isolation so `dataviewjs` and inline JS queries never execute from model output (issue #3988); Dataview DQL execution and Miyo link badges remain in default Reading View rather than injecting fragile DOM portals into Live Preview. `Copy`, `Insert / Replace at cursor`, and drag-to-note continue reading raw Markdown strings. The Live Preview mount adapter is injected from the host layer so `client/chat` (`apps/obsidian/src/agentMode/ui/**`) never imports `obsidian` directly and `architecture.debt.json` does not grow.
- **Layout and Reading Fallback**: Responses toggled to Live Preview drop `content-visibility: auto` (avoiding CodeMirror off-screen geometry distortion) and auto-size vertically without nested scrollbars. Mobile (`!isDesktopRuntime()`), Component Gallery, and unit tests hide the toggle; on desktop, unexpected internal API failures log via `logWarn`, notify the user with an Obsidian `Notice`, and fall back to Reading View.
