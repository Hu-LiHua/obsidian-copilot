---
title: live-preview-for-assistant-replies-spec
status: ready-for-agent
created: 2026-11-27
adr: docs/adr/0001-live-preview-for-assistant-replies.md
---

# Spec: Per-Response Live Preview Toggle for Copilot Chat Assistant Replies

## Problem Statement

Copilot Chat currently renders all assistant replies using Obsidian's static Reading View. While Reading View formats prose, math formulas, callouts, tables, and internal links cleanly, rendered elements become opaque HTML widgets—users cannot place a cursor inside a math block, callout, or wikilink to inspect, select, or copy the underlying LaTeX or Markdown syntax without copying the entire response elsewhere.

## Solution

Keep Reading View as the default Reply View during streaming and after completion, and add a transient toggle control in the footer of every completed Copilot Chat Response on desktop. When toggled on, all assistant text segments of that Response switch in place into a Navigable Read-Only instance of Obsidian's native Live Preview editor: users can click or navigate with arrow keys into rendered widgets to unfold and copy raw source while all document edits remain blocked, and unsupported environments or runtime failures gracefully fall back to Reading View.

## User Stories

1. As a Copilot Chat user, I want finished assistant Responses to open in Reading View by default, so that everyday reading remains lightweight and visually familiar without editor cursor clutter.
2. As a Copilot Chat user, I want streaming assistant replies to stay in Reading View until generation completes, so that unclosed formulas, tables, and code fences do not flicker or reflow erratically mid-stream.
3. As a Copilot Chat user, I want a toggle button in the footer of a completed Response on desktop, so that I can switch that specific Response to Live Preview only when I need to inspect source syntax.
4. As a Copilot Chat user, I want toggling to Live Preview to switch all assistant text segments of that Response together, so that I do not have to toggle multiple fragments separated by tool activity one by one.
5. As a Copilot Chat user working with technical notes, I want to click or move the cursor into a rendered inline or block math formula in Live Preview, so that it unfolds into raw LaTeX syntax that I can read, select, and copy.
6. As a Copilot Chat user, I want to unfold other Live Preview widgets such as callouts, tables, formatted text, and links by navigating into them, so that I can inspect and reuse any part of the generated Markdown source.
7. As a Copilot Chat user, I want Live Preview in Copilot Chat to enforce Navigable Read-Only behavior, so that I can freely place a cursor, select text, and copy raw syntax while accidental typing, pasting, cutting, or deletions cannot alter the reply.
8. As a Copilot Chat user, I want toggling a Response into Live Preview not to steal focus or jump my chat scroll position, so that I stay anchored where I was reading and only unfold widgets when I click or focus the reply.
9. As a Copilot Chat user, I want clicking outside an active Live Preview reply or pressing Esc to blur it, so that unfolded widgets collapse back into clean preview rendering and the caret hides.
10. As a Copilot Chat user, I want plain left-clicks on internal vault links inside Live Preview to keep opening the target note, while Alt/Option + Click or arrow keys enter the link syntax, so that link navigation matches Obsidian's native Live Preview workflow.
11. As a Copilot Chat user, I want to toggle a Response back from Live Preview to Reading View via the same footer button, so that I can restore static Reading View formatting at any time.
12. As a Copilot Chat user, I want default Reading View to preserve Miyo link badges and Dataview DQL query results, while Live Preview lets me read and copy the raw Dataview query text, so that both rendered results and source remain accessible.
13. As a Copilot Chat user, I want JavaScript-executing Dataview blocks (`dataviewjs`) and inline JS queries to remain blocked from executing in Live Preview just as in Reading View, so that model output can never run arbitrary JavaScript.
14. As a Copilot Chat user, I want expanded inline subagent prompt and return text inside a Response to follow that Response's Reply View toggle, so that math and Markdown inside subagent outputs can also be inspected as source.
15. As a Copilot Chat user inspecting a subagent detail view, I want its footer toggle to switch its assistant reply between Reading View and Live Preview, so that subagent results support the same source inspection as the main chat.
16. As a Copilot Chat user inspecting an asked Teammate's detail view, I want its footer toggle to switch the Teammate's replies between Reading View and Live Preview, so that relayed conversations support source inspection as well.
17. As a Copilot Chat user opening historical or continued chats (including chats created via "Continue from here in a new chat") whose assistant messages lack structured parts, I want those Responses to offer the same footer toggle, so that source inspection works consistently across old and continued chats.
18. As a Copilot Chat user, I want `Copy`, `Insert / Replace at cursor`, and drag-to-note on a Response footer to always export the original raw Markdown string regardless of whether the Response is in Reading View or Live Preview, so that clipboard and note insertion behavior never changes.
19. As a Copilot Chat user, I want Live Preview editors in replies to auto-size to their content without nested vertical scrollbars while preserving horizontal scrolling for wide tables or code blocks, so that scrolling the chat transcript feels seamless.
20. As a Copilot Chat user with long chats, I want toggled-on Live Preview Responses to stay properly measured and keep my scroll position stable during tail paging, so that toggling a reply does not cause zero-height clipping or scroll jumps.
21. As a Copilot Chat user, I want the per-Response Reply View toggle state to remain transient in memory without adding global settings or persisting across chat reopens, so that reopened chats stay clean and lightweight.
22. As a Copilot Chat user, I want error/stop notices, reasoning step lists, plan previews, my own user messages, file-diff views, and Quick Chat to keep their existing renderers, so that non-reply surfaces remain predictable and uncluttered.
23. As a mobile user or user viewing a preview environment without desktop Obsidian editor internals, I want the Live Preview toggle hidden and replies kept in Reading View (Reading Fallback), so that I never see broken controls or unexpected mobile soft keyboards.
24. As a desktop user, if an Obsidian update breaks internal Live Preview initialization at runtime, I want the affected Response to automatically stay in Reading View, log a warning to the Copilot log, and show a concise Obsidian notice, so that the failure is transparent and my chat remains readable.
25. As an Obsidian theme and CSS snippet user, I want toggled Live Preview replies to respect my active Obsidian styling automatically, so that inspected replies match the visual appearance of my notes.

## Implementation Decisions

- **Host-injected Live Preview adapter seam**: Keep client chat UI layers isolated from direct Obsidian host imports by injecting an optional Live Preview mount capability from the host shell (absent on unsupported runtimes such as mobile, Component Gallery, and plain unit tests, adding zero entries to architecture debt).
- **Obsidian internal editor reuse with Reading Fallback**: On desktop, mount Obsidian's internal embeddable Live Preview mechanism rather than building a custom CodeMirror 6 Markdown/MathJax decorator. Catch mount/runtime failures, log via `logWarn`, surface a user-facing Obsidian `Notice` compliant with Nomenclature, and automatically revert to Reading View.
- **Navigable Read-Only via single built-in facet**: Configure the mounted editor with CodeMirror 6's `EditorState.readOnly.of(true)` only, without custom DOM keyboard, paste, cut, drag-drop, or IME interception. Do not steal focus on mount or toggle; hide the caret visually while unfocused and allow `Esc` or blur to collapse unfolded widgets.
- **Transient per-Response state & zero settings clutter**: Do not add a global setting or persist Reply View state across sessions. Maintain an ephemeral in-memory toggle state scoped to each completed Response (and independently inside subagent detail and asked-Teammate detail views), defaulting every Response to Reading View.
- **Unified Copilot Chat reply scope**: Apply the footer toggle across all Copilot Chat assistant reply bodies: structured Response trails (including inline subagent prompt/return blocks inheriting the parent Response state), subagent detail views, asked-Teammate detail views, and partless/continued assistant messages rendered through the legacy single-message component inside Copilot Chat. Keep stop/error notices, reasoning blocks, plan previews, user messages, turn diffs, and Quick Chat excluded.
- **Safety, extensions, and link behavior**: Pass the `?no-dataview` sourcePath isolation marker into Live Preview so `dataviewjs` and inline JS expressions never execute from model output. Keep Dataview DQL execution and Miyo link badges in default Reading View rather than injecting fragile DOM portals into Live Preview. Preserve plain left-click opening for internal links in Live Preview (`Alt/Option + Click` or arrow-key navigation reveals raw syntax). Keep footer `Copy`, `Insert / Replace at cursor`, and drag-to-note bound to the raw Markdown source string.
- **Layout & long-chat stability**: Auto-size mounted Live Preview containers to their full height with no vertical inner scrollbars (retaining horizontal overflow for wide content). Disable off-screen paint containment (`content-visibility: auto`) only on assistant rows currently switched to Live Preview so CodeMirror viewport geometry and chat scroll anchors stay accurate.
- **Documentation & feature map alignment**: Keep `GLOSSARY.md` and ADR records as the canonical domain/architecture reference, and update the replies feature map to cover the Live Preview toggle and Reading Fallback behaviors.

## Testing Decisions

- **Testing philosophy**: Write unit and integration tests as executable specifications that assert observable behavior (rendered view mode, DOM/editor mutability, cursor/selection source visibility, fallback notices, raw-Markdown action output, scroll/containment state) rather than internal implementation details. Follow red-green verification and module/callable suite structure.
- **Primary seam — High-level UI integration via Host Live Preview adapter**: Test the main chat list, response trail, subagent cards, subagent detail view, asked-Teammate detail view, and partless Copilot Chat single-message rows through their public React component interfaces by injecting a fake Host Live Preview adapter at the shell seam—verifying default Reading View, streaming-time omission of the toggle, per-Response toggling across all text segments and nested subagents, exclusion of notices/user messages/Quick Chat, unsupported-host button omission, runtime fallback recovery (`logWarn` + `Notice` + revert to Reading View), paint-containment removal while toggled on, and unchanged `Copy`/`Insert`/drag text.
- **Secondary boundary — Host Live Preview adapter unit contract**: Test the host adapter against real `@codemirror/state` and `@codemirror/view` instances with a lightweight fake embed registry to verify `EditorState.readOnly.of(true)` rejects document mutations while permitting selection/cursor movement, `?no-dataview` sourcePath propagation, no focus stealing on mount, clean resource disposal on unmount/toggle-back, and error propagation to trigger Reading Fallback.
- **Component Gallery & Live Vault E2E**: Provide Component Gallery stories for the footer toggle and Reading Fallback states, and run real-vault Obsidian CLI end-to-end checks to verify native widget unfolding (LaTeX math, callouts, tables, `Alt/Option + Click` links), plain click link opening, `Esc`/blur collapse, zero vertical inner scrollbars, and theme compatibility.
- **Prior art in codebase**: Follow the existing React Testing Library component integration pattern used across chat trail and message list suites, the real CodeMirror `EditorState`/`EditorView` Jest testing pattern used in editor highlight controllers, and the replies feature-map checklist for live-vault verification.

## Out of Scope

- Replacing Reading View globally or adding a user-facing settings option for default Reply View.
- Persisting per-Response Live Preview toggle state to disk or saved chat notes across reopens.
- Enabling Live Preview in Quick Chat, user message bubbles, error/stop notices, reasoning step lists, plan preview panes, or rendered file-diff views.
- Rendering Miyo "Found by Miyo" link badges or executing Dataview DQL queries inside Live Preview (these remain in Reading View).
- Implementing custom Markdown/LaTeX CodeMirror widgets from scratch outside Obsidian's native Live Preview engine.
- Allowing users to edit or save changes to assistant replies in place.

## Further Notes

- Domain terminology is defined in `GLOSSARY.md` (`Copilot Chat`, `Response`, `Reply View`, `Reading View`, `Live Preview`, `Navigable Read-Only`, `Reading Fallback`) and user-facing copy must adhere to `internal-docs/NOMENCLATURE.md`.
- Architectural rationale and trade-offs are recorded in ADR-0001 (`docs/adr/0001-live-preview-for-assistant-replies.md`).
- Delivery breakdown issues on `Hu-LiHua/obsidian-copilot`: `#4` (core toggleable Live Preview in main Copilot Chat), `#5` (subagents, Teammates, and continued replies, blocked by `#4`), and `#6` (Reading Fallback hardening, scroll/focus stability, and feature-map polish, blocked by `#4`).
