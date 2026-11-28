# Copilot for Obsidian

Shared domain language for Copilot Chat, its reply rendering modes, and the surrounding assistant workspace inside Obsidian.

## Language

### Conversation & Surfaces

**Copilot Chat**:
The primary agent-backed chat workspace where a user works with Copilot or a **Teammate**.
_Avoid_: Agent Mode, Agent Chat (in user-facing copy)

**Quick Chat**:
The legacy single-pane chat experience that operates outside **Copilot Chat**.
_Avoid_: Classic chat

**Teammate**:
A user-configured assistant profile with its own instruction and memory that can participate in **Copilot Chat**.
_Avoid_: Custom agent, agent (when referring specifically to a user-made profile)

**Response**:
Everything an assistant produces between two user messages in **Copilot Chat**, including its text segments, tool activity, and replies from asked **Teammates**.
_Avoid_: Turn, run

### Reply Rendering

**Reply View**:
The display mode for the assistant text segments of a completed **Response** in **Copilot Chat**.
_Avoid_: Render mode, preview mode

**Reading View**:
The default static **Reply View** showing formatted, non-editable Markdown output with full link-badge and query support.
_Avoid_: Static view, HTML view

**Live Preview**:
An interactive **Reply View** in which rendered Markdown widgets unfold into their raw syntax when navigated into.
_Avoid_: Edit view, source mode

**Navigable Read-Only**:
The immutability contract of **Live Preview** in **Copilot Chat**: cursor navigation, widget unfolding, and source copying are permitted while document mutations are disallowed.
_Avoid_: Non-editable, locked view, transient editor

**Reading Fallback**:
Automatic use of **Reading View** when **Live Preview** is unsupported by the active platform, host environment, or Obsidian version.
_Avoid_: Silent failure, plain-text fallback
