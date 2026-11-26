import { Notice, editorInfoField } from "obsidian";
import type { App, Editor, TFile } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { v4 as uuidv4 } from "uuid";
import { logWarn } from "@/logger";
import {
  addSelectionToChatContext,
  tryPinSelection,
  type ChatContextHost,
} from "@/selection/selectionActions";
import { getPinnedSelectionInstruction, type KeyedSelection } from "@/selection/selectionStore";
import { formatExcerptLocationLabel } from "@/utils/excerptLocation";

const TOOLBAR_PLUGIN_ID = "selection-toolbar";
const TOOLBAR_READY_EVENT = "selection-toolbar:ready";

// The Selection Toolbar plugin publishes this API for provider plugins. Its types are declared here rather
// than imported, because the two plugins live in separate repositories.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/1
interface ToolbarSelectionContext {
  surface: string;
  text: string;
  from?: number;
  to?: number;
  editor?: Editor;
  file?: TFile;
  view?: EditorView;
}

interface ToolbarAction {
  id: string;
  label: string;
  icon?: string;
  group: string;
  groupOrder: number;
  order?: number;
  isAvailable(ctx: ToolbarSelectionContext): boolean;
  run(ctx: ToolbarSelectionContext): void;
}

interface SelectionToolbarApi {
  registerAction(action: ToolbarAction): () => void;
}

interface ToolbarHostPlugin {
  getApi?: () => SelectionToolbarApi;
}

export interface AnnotationOverlayRequest {
  view: EditorView;
  from: number;
  to: number;
  locationLabel: string;
  initialInstruction?: string;
  onSubmit: (instruction: string) => boolean;
}

interface ToolbarHost extends ChatContextHost {
  register(cleanup: () => void): void;
  canAnnotateSelection?: () => boolean;
  showSelectionAnnotation?: (request: AnnotationOverlayRequest) => void;
}

function findToolbarApi(app: App): SelectionToolbarApi | null {
  const plugins = (app as unknown as { plugins?: { plugins?: Record<string, unknown> } }).plugins
    ?.plugins;
  const host = plugins?.[TOOLBAR_PLUGIN_ID] as ToolbarHostPlugin | undefined;
  if (typeof host?.getApi !== "function") return null;
  return host.getApi();
}

// The toolbar host resolves an editor selection from the DOM selection, which carries the CodeMirror view
// but no editor and no file, so the note behind the selection is read from Obsidian's own field on that view.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/1
function resolveSelectionTarget(
  ctx: ToolbarSelectionContext
): { editor: Editor; file: TFile } | null {
  const info = ctx.view?.state.field(editorInfoField, false);
  const editor = ctx.editor ?? info?.editor;
  const file = ctx.file ?? info?.file;
  if (!editor || !file) return null;
  return { editor, file };
}

function resolveEditorView(ctx: ToolbarSelectionContext): EditorView | null {
  if (ctx.view) return ctx.view;
  const target = resolveSelectionTarget(ctx);
  return (target?.editor as { cm?: EditorView } | undefined)?.cm ?? null;
}

function toolbarSelectionReport(
  ctx: ToolbarSelectionContext
): { selection: KeyedSelection; from: number; to: number } | null {
  const target = resolveSelectionTarget(ctx);
  if (!target || ctx.from === undefined || ctx.to === undefined) return null;

  const from = Math.min(ctx.from, ctx.to);
  const to = Math.max(ctx.from, ctx.to);
  const { editor, file } = target;
  const start = editor.offsetToPos(from);
  const end = editor.offsetToPos(to);
  const content = editor.getRange(start, end);
  if (!content.trim()) return null;

  return {
    from,
    to,
    selection: {
      location: file.path,
      key: `${file.path}:${start.line}:${start.ch}:${end.line}:${end.ch}`,
      context: {
        id: uuidv4(),
        content,
        sourceType: "note",
        noteTitle: file.basename,
        notePath: file.path,
        startLine: start.line + 1,
        endLine: end.line + 1,
      },
    },
  };
}

function hasUsableEditorSelection(ctx: ToolbarSelectionContext): boolean {
  return (
    ctx.surface === "editor" &&
    ctx.from !== undefined &&
    ctx.to !== undefined &&
    Boolean(ctx.text.trim()) &&
    resolveSelectionTarget(ctx) !== null
  );
}

export function registerSelectionToolbarIntegration(plugin: ToolbarHost): void {
  let unregisters: Array<() => void> = [];

  const clearRegistrations = () => {
    for (const dispose of unregisters) dispose();
    unregisters = [];
  };

  const register = (): void => {
    const api = findToolbarApi(plugin.app);
    if (!api) return;

    try {
      clearRegistrations();
      unregisters.push(
        api.registerAction({
          id: "copilot.add-selection-to-chat-context",
          label: "Add to Copilot",
          icon: "quote",
          group: "copilot",
          groupOrder: 100,
          order: 1,
          isAvailable: hasUsableEditorSelection,
          run: (ctx) => {
            const report = toolbarSelectionReport(ctx);
            if (!report) {
              new Notice("No text selected");
              return;
            }
            void addSelectionToChatContext(plugin, report.selection);
          },
        })
      );
      unregisters.push(
        api.registerAction({
          id: "copilot.annotate-selection",
          label: "Annotate",
          icon: "message-square",
          group: "copilot",
          groupOrder: 100,
          order: 2,
          // Inline annotation belongs to Agent Chat's editor flow only; classic chat and reading view
          // do not offer it.
          // https://github.com/Hu-LiHua/obsidian-copilot/issues/3
          isAvailable: (ctx) =>
            hasUsableEditorSelection(ctx) &&
            Boolean(plugin.canAnnotateSelection?.()) &&
            typeof plugin.showSelectionAnnotation === "function" &&
            resolveEditorView(ctx) !== null,
          run: (ctx) => {
            const report = toolbarSelectionReport(ctx);
            const view = resolveEditorView(ctx);
            if (!report || !view || typeof plugin.showSelectionAnnotation !== "function") {
              new Notice("No text selected");
              return;
            }
            const context = report.selection.context;
            if (context.sourceType !== "note") return;
            plugin.showSelectionAnnotation({
              view,
              from: report.from,
              to: report.to,
              locationLabel: formatExcerptLocationLabel(context.startLine, context.endLine),
              initialInstruction: getPinnedSelectionInstruction(report.selection.key),
              onSubmit: (instruction) =>
                tryPinSelection({
                  ...report.selection,
                  context: { ...context, instruction },
                }),
            });
          },
        })
      );
    } catch (error) {
      logWarn("Could not register the Selection Toolbar action", error);
    }
  };

  register();

  // The toolbar host announces itself on the app document when it loads and when it reloads, so the button
  // is registered again for a host that starts after Copilot or restarts under it.
  // https://github.com/Hu-LiHua/obsidian-copilot/issues/1
  const appDocument = document;
  appDocument.addEventListener(TOOLBAR_READY_EVENT, register);
  plugin.register(() => {
    appDocument.removeEventListener(TOOLBAR_READY_EVENT, register);
    clearRegistrations();
  });
}
