jest.mock("obsidian", () => {
  const actual = jest.requireActual<Record<string, unknown>>("obsidian");
  const { StateField } =
    jest.requireActual<typeof import("@codemirror/state")>("@codemirror/state");
  return {
    ...actual,
    editorInfoField: StateField.define<unknown>({ create: () => null, update: (value) => value }),
  };
});

import { registerSelectionToolbarIntegration } from "@/selection/selectionToolbarIntegration";
import {
  clearSelection,
  getSelectedTextContexts,
  pinSelection,
  reportSelection,
} from "@/selection/selectionStore";
import { editorSelectionReport } from "@/selection/selectionWatcher";
import type CopilotPlugin from "@/main";
import type { EditorView } from "@codemirror/view";
import { Notice, editorInfoField, type Editor } from "obsidian";
import { mockTFile } from "@/__tests__/mockObsidian";

const ISSUE_1 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/1";
const ISSUE_3 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/3";
const ISSUE_7 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/7";
const ADD_ACTION_ID = "copilot.add-selection-to-chat-context";
const ANNOTATE_ACTION_ID = "copilot.annotate-selection";

interface RegisteredAction {
  id: string;
  label: string;
  isAvailable(ctx: unknown): boolean;
  run(ctx: unknown): void;
}

const research = mockTFile({ path: "Research.md", basename: "Research" });

const editorView = {
  state: {
    field: (field: unknown) => (field === editorInfoField ? { editor, file: research } : undefined),
  },
} as unknown as EditorView;

const editor = {
  offsetToPos: (offset: number) => (offset === 10 ? { line: 2, ch: 0 } : { line: 4, ch: 3 }),
  getRange: () => "An excerpt",
  cm: editorView,
} as unknown as Editor;

const editorContext = {
  surface: "editor",
  text: "An excerpt",
  from: 10,
  to: 20,
  editor,
  file: research,
};

// The toolbar host resolves an editor selection from the DOM selection, which carries the CodeMirror view
// but no editor and no file.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/1
const domEditorContext = {
  surface: "editor",
  text: "An excerpt",
  from: 10,
  to: 20,
  view: editorView,
};

function fakeHost() {
  const actions: RegisteredAction[] = [];
  const unregister = jest.fn();
  const registerAction = jest.fn((action: RegisteredAction) => {
    actions.push(action);
    return unregister;
  });
  const byId = (id: string) => {
    const action = actions.findLast((item) => item.id === id);
    if (!action) throw new Error(`Missing action ${id}`);
    return action;
  };
  return {
    host: { getApi: () => ({ registerAction }) },
    actions,
    byId,
    registerAction,
    unregister,
  };
}

function fakePlugin(host: unknown, { canAnnotate = true }: { canAnnotate?: boolean } = {}) {
  const cleanups: Array<() => void> = [];
  const showSelectionAnnotation = jest.fn();
  const plugin = {
    app: { plugins: { plugins: host ? { "selection-toolbar": host } : {} } },
    activateChatViewForContext: jest.fn(),
    canAnnotateSelection: jest.fn(() => canAnnotate),
    showSelectionAnnotation,
    register: (cleanup: () => void) => cleanups.push(cleanup),
  } as unknown as CopilotPlugin;
  return { plugin, cleanups, showSelectionAnnotation };
}

describe("selectionToolbarIntegration", () => {
  beforeEach(() => {
    clearSelection();
    jest.mocked(Notice).mockClear();
  });

  describe("registerSelectionToolbarIntegration()", () => {
    it(`registers Add to Copilot and Annotate actions (${ISSUE_1}, ${ISSUE_3})`, () => {
      const { host, actions, registerAction } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);

      expect(registerAction).toHaveBeenCalledTimes(2);
      expect(actions.map((action) => action.id)).toEqual([ADD_ACTION_ID, ANNOTATE_ACTION_ID]);
    });

    it(`registers the actions when the toolbar host loads after Copilot (${ISSUE_1}, ${ISSUE_3})`, () => {
      const { host, registerAction } = fakeHost();
      const { plugin } = fakePlugin(undefined);

      registerSelectionToolbarIntegration(plugin);
      expect(registerAction).not.toHaveBeenCalled();

      (plugin.app as unknown as { plugins: { plugins: Record<string, unknown> } }).plugins.plugins[
        "selection-toolbar"
      ] = host;
      document.dispatchEvent(new CustomEvent("selection-toolbar:ready"));

      expect(registerAction).toHaveBeenCalledTimes(2);
    });

    it(`registers the actions again when the toolbar host reloads (${ISSUE_1}, ${ISSUE_3})`, () => {
      const { host, registerAction, unregister } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      document.dispatchEvent(new CustomEvent("selection-toolbar:ready"));

      expect(unregister).toHaveBeenCalledTimes(2);
      expect(registerAction).toHaveBeenCalledTimes(4);
    });

    it(`offers Add to Copilot only for a selection in a note (${ISSUE_1})`, () => {
      const { host, byId } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      const addAction = byId(ADD_ACTION_ID);

      expect(addAction.isAvailable(editorContext)).toBe(true);
      expect(addAction.isAvailable({ surface: "reading", text: "An excerpt" })).toBe(false);
      expect(addAction.isAvailable({ surface: "editor", text: "An excerpt" })).toBe(false);
    });

    it(`offers Add to Copilot for a selection the host resolved from the DOM (${ISSUE_1})`, () => {
      const { host, byId } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);

      expect(byId(ADD_ACTION_ID).isAvailable(domEditorContext)).toBe(true);
    });

    it(`does not offer Add to Copilot for a selection whose note cannot be found (${ISSUE_1})`, () => {
      const { host, byId } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);

      expect(
        byId(ADD_ACTION_ID).isAvailable({ surface: "editor", text: "An excerpt", from: 10, to: 20 })
      ).toBe(false);
    });

    it(`offers Annotate only in editor mode when Agent Chat is the active destination (${ISSUE_3})`, () => {
      const { host, byId } = fakeHost();
      const { plugin } = fakePlugin(host, { canAnnotate: true });

      registerSelectionToolbarIntegration(plugin);
      const annotateAction = byId(ANNOTATE_ACTION_ID);

      expect(annotateAction.isAvailable(domEditorContext)).toBe(true);
      expect(annotateAction.isAvailable(editorContext)).toBe(true);
      expect(annotateAction.isAvailable({ surface: "reading", text: "An excerpt" })).toBe(false);

      const classic = fakeHost();
      const classicPlugin = fakePlugin(classic.host, { canAnnotate: false });
      registerSelectionToolbarIntegration(classicPlugin.plugin);
      expect(classic.byId(ANNOTATE_ACTION_ID).isAvailable(domEditorContext)).toBe(false);
    });

    it(`adds the selected text of a selection the host resolved from the DOM (${ISSUE_1})`, () => {
      const { host, byId } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      byId(ADD_ACTION_ID).run(domEditorContext);

      expect(getSelectedTextContexts().map((context) => context.content)).toEqual(["An excerpt"]);
      expect(plugin.activateChatViewForContext).toHaveBeenCalled();
    });

    it(`adds the selected text to the chat context when Add to Copilot is clicked (${ISSUE_1})`, () => {
      const { host, byId } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      byId(ADD_ACTION_ID).run(editorContext);

      expect(getSelectedTextContexts().map((context) => context.content)).toEqual(["An excerpt"]);
      expect(plugin.activateChatViewForContext).toHaveBeenCalled();
    });

    it(`keeps one badge when the passage the editor already shows is added again from the toolbar (${ISSUE_7})`, () => {
      const { host, byId } = fakeHost();
      const { plugin } = fakePlugin(host);
      // The editor reports the passage from the drag's anchor and head, the toolbar from the resolved range;
      // both describe one passage.
      // https://github.com/Hu-LiHua/obsidian-copilot/issues/7
      const selectedEditor = {
        offsetToPos: (offset: number) => (offset === 10 ? { line: 2, ch: 0 } : { line: 4, ch: 3 }),
        getRange: () => "An excerpt",
        listSelections: () => [{ anchor: { line: 4, ch: 3 }, head: { line: 2, ch: 0 } }],
        getSelection: () => "An excerpt",
      } as unknown as Editor;
      const selectedContext = {
        surface: "editor",
        text: "An excerpt",
        from: 10,
        to: 20,
        editor: selectedEditor,
        file: research,
      };

      registerSelectionToolbarIntegration(plugin);
      const report = editorSelectionReport({ file: research, editor: selectedEditor });
      if (!report) throw new Error("Expected the editor to report its selection");
      reportSelection(report);
      expect(getSelectedTextContexts()).toHaveLength(1);

      byId(ADD_ACTION_ID).run(selectedContext);

      expect(getSelectedTextContexts().map((context) => context.content)).toEqual(["An excerpt"]);
    });

    it(`opens the annotation overlay without pinning or activating chat, pre-fills an existing instruction, and pins only on submit (${ISSUE_3})`, () => {
      const { host, byId } = fakeHost();
      const { plugin, showSelectionAnnotation } = fakePlugin(host);
      pinSelection({
        location: "Research.md",
        key: "Research.md:2:0:4:3",
        context: {
          id: "existing-1",
          content: "An excerpt",
          sourceType: "note",
          noteTitle: "Research",
          notePath: "Research.md",
          startLine: 3,
          endLine: 5,
          instruction: "Previous note",
        },
      });

      registerSelectionToolbarIntegration(plugin);
      byId(ANNOTATE_ACTION_ID).run(domEditorContext);

      expect(plugin.activateChatViewForContext).not.toHaveBeenCalled();
      expect(showSelectionAnnotation).toHaveBeenCalledWith(
        expect.objectContaining({
          view: editorView,
          from: 10,
          to: 20,
          locationLabel: "L3-5",
          initialInstruction: "Previous note",
        })
      );

      const request = showSelectionAnnotation.mock.calls[0][0] as {
        onSubmit: (instruction: string) => boolean;
      };
      expect(typeof request.onSubmit).toBe("function");
      expect(request.onSubmit("New instruction")).toBe(true);
      expect(plugin.activateChatViewForContext).not.toHaveBeenCalled();
      expect(getSelectedTextContexts()).toEqual([
        expect.objectContaining({
          content: "An excerpt",
          startLine: 3,
          endLine: 5,
          instruction: "New instruction",
        }),
      ]);
    });

    it(`preserves the plugin receiver when Annotate opens the annotation overlay on a class instance (${ISSUE_3})`, () => {
      const { host, byId } = fakeHost();
      const showAnnotation = jest.fn();
      class ClassPlugin {
        app = { plugins: { plugins: { "selection-toolbar": host } } };
        private readonly controller = { showAnnotation };
        activateChatViewForContext = jest.fn();
        register = jest.fn();
        canAnnotateSelection() {
          return Boolean(this.controller);
        }
        showSelectionAnnotation(request: unknown) {
          this.controller.showAnnotation(request);
        }
      }

      registerSelectionToolbarIntegration(new ClassPlugin() as unknown as CopilotPlugin);
      byId(ANNOTATE_ACTION_ID).run(domEditorContext);

      expect(showAnnotation).toHaveBeenCalledWith(
        expect.objectContaining({
          view: editorView,
          from: 10,
          to: 20,
          locationLabel: "L3-5",
        })
      );
    });

    it(`removes both buttons when the plugin unloads (${ISSUE_1}, ${ISSUE_3})`, () => {
      const { host, unregister } = fakeHost();
      const { plugin, cleanups } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      cleanups.forEach((cleanup) => cleanup());

      expect(unregister).toHaveBeenCalledTimes(2);
    });
  });
});
