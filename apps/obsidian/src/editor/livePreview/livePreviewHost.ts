import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Component, Platform, type App } from "obsidian";
import type {
  LivePreviewAdapter,
  LivePreviewHandle,
  LivePreviewMountOptions,
} from "@/lib/livePreview";
import { logWarn } from "@/logger";
import { withoutDataview } from "@/utils/renderMarkdown";

interface MarkdownEmbed {
  load(): void;
  unload(): void;
  editable: boolean;
  showEditor(): void;
  editMode?: unknown;
}

interface EmbedRegistryHost {
  embedRegistry?: {
    embedByExtension?: {
      md?: (
        context: { app: App; containerEl: HTMLElement; state: unknown },
        source: unknown,
        path: string
      ) => MarkdownEmbed | null;
    };
  };
}

interface MarkdownEditorOwner {
  app: App;
  showSearch(): void;
  toggleMode(): void;
  onMarkdownScroll(): void;
  getMode(): string;
  scroll: number;
  editMode: unknown;
  readonly editor: unknown;
  readonly file: unknown;
  readonly path: string;
}

interface MarkdownEditorInstance {
  cm: EditorView;
  editor: unknown;
  set(text: string): void;
  buildLocalExtensions?(): unknown[];
}

type MarkdownEditorConstructor = new (
  app: App,
  containerEl: HTMLElement,
  owner: MarkdownEditorOwner
) => MarkdownEditorInstance;

const noop = (): void => {};

let cachedEditorClass: MarkdownEditorConstructor | undefined;

// Obsidian keeps its own markdown editor for embeds; the class behind it is the one that renders a reply the way a note's Live Preview does. A probe that fails leaves the class uncached, so a later attempt tries again instead of staying broken for the whole session.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
function resolveMarkdownEditorClass(app: App): MarkdownEditorConstructor | null {
  if (cachedEditorClass) return cachedEditorClass;
  const embedByExtension = (app as unknown as EmbedRegistryHost).embedRegistry?.embedByExtension;
  if (!embedByExtension?.md) return null;
  let embed: MarkdownEmbed | null = null;
  try {
    embed = embedByExtension.md({ app, containerEl: createDiv(), state: {} }, null, "");
    if (!embed) return null;
    embed.load();
    embed.editable = true;
    embed.showEditor();
    const editMode = embed.editMode as object | undefined;
    const prototype = editMode ? (Object.getPrototypeOf(editMode) as object | null) : null;
    const parent = prototype ? (Object.getPrototypeOf(prototype) as object | null) : null;
    const constructor = (parent as { constructor?: unknown } | null)?.constructor as
      | MarkdownEditorConstructor
      | undefined;
    if (constructor) cachedEditorClass = constructor;
  } catch (error) {
    logWarn("[LivePreview] Obsidian's embeddable editor could not be reached", error);
  } finally {
    try {
      embed?.unload();
    } catch (error) {
      logWarn("[LivePreview] the probe editor could not be released", error);
    }
  }
  return cachedEditorClass ?? null;
}

function restoreFocus(container: HTMLElement, previous: Element | null): void {
  const active = container.ownerDocument.activeElement;
  if (!active || active === previous || !container.contains(active)) return;
  const candidate = previous as HTMLElement | null;
  if (candidate && typeof candidate.focus === "function") {
    candidate.focus();
    return;
  }
  (active as HTMLElement).blur();
}

// The reply must read as one block of text, so the editor grows with its content and never scrolls inside itself.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
function applyAutoHeight(container: HTMLElement, cm: EditorView): () => void {
  const sync = (): void => {
    const height = cm.contentDOM.scrollHeight;
    if (height > 0) container.setCssProps({ height: `${height}px` });
  };
  const scroller = cm.contentDOM.parentElement;
  cm.dom.setCssProps({ height: "auto" });
  if (scroller) scroller.setCssProps({ overflowY: "hidden" });
  container.setCssProps({ overflow: "hidden" });
  const observer = new ResizeObserver(sync);
  observer.observe(cm.contentDOM);
  sync();
  return () => observer.disconnect();
}

function mountLivePreview(app: App, options: LivePreviewMountOptions): LivePreviewHandle {
  const EditorClass = resolveMarkdownEditorClass(app);
  if (!EditorClass) {
    throw new Error("Obsidian's embeddable editor could not be reached");
  }
  const sourcePath = withoutDataview(options.sourcePath);
  const name = options.sourcePath.split("/").pop() ?? "";
  const file = {
    path: sourcePath,
    name,
    basename: name.replace(/\.md$/, ""),
    extension: "md",
  };
  let instance: MarkdownEditorInstance | null = null;
  const owner: MarkdownEditorOwner = {
    app,
    showSearch: noop,
    toggleMode: noop,
    onMarkdownScroll: noop,
    getMode: () => "source",
    scroll: 0,
    editMode: null,
    get editor() {
      return instance?.editor;
    },
    get file() {
      return file;
    },
    get path() {
      return sourcePath;
    },
  };
  // The reply is read, never written, so the editor itself refuses the change instead of the plugin intercepting every keystroke.
  // https://github.com/Hu-LiHua/obsidian-copilot/issues/4
  const ReadOnlyEditor = class extends EditorClass {
    buildLocalExtensions(): unknown[] {
      const base = super.buildLocalExtensions?.() ?? [];
      return [...base, EditorState.readOnly.of(true), EditorView.editable.of(false)];
    }
    updateBottomPadding(): void {}
  };
  const host = new Component();
  host.load();
  const previouslyFocused = options.container.ownerDocument.activeElement;
  let editor: MarkdownEditorInstance | null = null;
  try {
    editor = new ReadOnlyEditor(app, options.container, owner);
    instance = editor;
    owner.editMode = editor;
    host.addChild(editor as unknown as Component);
    editor.set(options.text);
  } catch (error) {
    host.unload();
    throw error;
  }
  const stopObserving = applyAutoHeight(options.container, editor.cm);
  restoreFocus(options.container, previouslyFocused);
  return {
    destroy(): void {
      stopObserving();
      host.unload();
    },
    // An unfolded widget keeps its source open while the editor holds the focus, so letting the focus go folds it back and hides the caret.
    // https://github.com/Hu-LiHua/obsidian-copilot/issues/6
    collapse(): void {
      const cm = editor?.cm;
      if (!cm) return;
      cm.contentDOM.blur();
      cm.dom.classList.remove("cm-focused");
    },
  };
}

// The preview needs Obsidian's own editor, which a phone has no use for, so a phone keeps every reply in Reading View.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
export function createLivePreviewAdapter(app: App): LivePreviewAdapter | null {
  if (Platform.isMobile) return null;
  return {
    mount(options: LivePreviewMountOptions): LivePreviewHandle | null {
      try {
        return mountLivePreview(app, options);
      } catch (error) {
        logWarn("[LivePreview] the reply could not be shown as Live Preview", error);
        options.onError?.(error);
        return null;
      }
    },
  };
}
