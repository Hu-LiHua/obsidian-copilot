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
  reportSelection,
} from "@/selection/selectionStore";
import { editorSelectionReport } from "@/selection/selectionWatcher";
import type CopilotPlugin from "@/main";
import { editorInfoField, type Editor } from "obsidian";
import { mockTFile } from "@/__tests__/mockObsidian";

const ISSUE_1 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/1";
const ISSUE_7 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/7";

interface RegisteredAction {
  id: string;
  label: string;
  isAvailable(ctx: unknown): boolean;
  run(ctx: unknown): void;
}

const research = mockTFile({ path: "Research.md", basename: "Research" });

const editor = {
  offsetToPos: () => ({ line: 2, ch: 0 }),
  getRange: () => "An excerpt",
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
  view: {
    state: {
      field: (field: unknown) =>
        field === editorInfoField ? { editor, file: research } : undefined,
    },
  },
};

function fakeHost() {
  const actions: RegisteredAction[] = [];
  const unregister = jest.fn();
  const registerAction = jest.fn((action: RegisteredAction) => {
    actions.push(action);
    return unregister;
  });
  return { host: { getApi: () => ({ registerAction }) }, actions, registerAction, unregister };
}

function fakePlugin(host: unknown) {
  const cleanups: Array<() => void> = [];
  const plugin = {
    app: { plugins: { plugins: host ? { "selection-toolbar": host } : {} } },
    activateChatViewForContext: jest.fn(),
    register: (cleanup: () => void) => cleanups.push(cleanup),
  } as unknown as CopilotPlugin;
  return { plugin, cleanups };
}

describe("selectionToolbarIntegration", () => {
  beforeEach(() => clearSelection());

  describe("registerSelectionToolbarIntegration()", () => {
    it(`registers a button that adds the selected text to the chat (${ISSUE_1})`, () => {
      const { host, registerAction } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);

      expect(registerAction).toHaveBeenCalledTimes(1);
      expect(registerAction.mock.calls[0][0].id).toBe("copilot.add-selection-to-chat-context");
    });

    it(`registers the button when the toolbar host loads after Copilot (${ISSUE_1})`, () => {
      const { host, registerAction } = fakeHost();
      const { plugin } = fakePlugin(undefined);

      registerSelectionToolbarIntegration(plugin);
      expect(registerAction).not.toHaveBeenCalled();

      (plugin.app as unknown as { plugins: { plugins: Record<string, unknown> } }).plugins.plugins[
        "selection-toolbar"
      ] = host;
      document.dispatchEvent(new CustomEvent("selection-toolbar:ready"));

      expect(registerAction).toHaveBeenCalledTimes(1);
    });

    it(`registers the button again when the toolbar host reloads (${ISSUE_1})`, () => {
      const { host, registerAction } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      document.dispatchEvent(new CustomEvent("selection-toolbar:ready"));

      expect(registerAction).toHaveBeenCalledTimes(2);
    });

    it(`offers the button only for a selection in a note (${ISSUE_1})`, () => {
      const { host, actions } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);

      expect(actions[0].isAvailable(editorContext)).toBe(true);
      expect(actions[0].isAvailable({ surface: "reading", text: "An excerpt" })).toBe(false);
      expect(actions[0].isAvailable({ surface: "editor", text: "An excerpt" })).toBe(false);
    });

    it(`offers the button for a selection the host resolved from the DOM (${ISSUE_1})`, () => {
      const { host, actions } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);

      expect(actions[0].isAvailable(domEditorContext)).toBe(true);
    });

    it(`does not offer the button for a selection whose note cannot be found (${ISSUE_1})`, () => {
      const { host, actions } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);

      expect(
        actions[0].isAvailable({ surface: "editor", text: "An excerpt", from: 10, to: 20 })
      ).toBe(false);
    });

    it(`adds the selected text of a selection the host resolved from the DOM (${ISSUE_1})`, () => {
      const { host, actions } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      actions[0].run(domEditorContext);

      expect(getSelectedTextContexts().map((context) => context.content)).toEqual(["An excerpt"]);
      expect(plugin.activateChatViewForContext).toHaveBeenCalled();
    });

    it(`adds the selected text to the chat context when the button is clicked (${ISSUE_1})`, () => {
      const { host, actions } = fakeHost();
      const { plugin } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      actions[0].run(editorContext);

      expect(getSelectedTextContexts().map((context) => context.content)).toEqual(["An excerpt"]);
      expect(plugin.activateChatViewForContext).toHaveBeenCalled();
    });

    it(`keeps one badge when the passage the editor already shows is added again from the toolbar (${ISSUE_7})`, () => {
      const { host, actions } = fakeHost();
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

      actions[0].run(selectedContext);

      expect(getSelectedTextContexts().map((context) => context.content)).toEqual(["An excerpt"]);
    });

    it(`removes the button when the plugin unloads (${ISSUE_1})`, () => {
      const { host, unregister } = fakeHost();
      const { plugin, cleanups } = fakePlugin(host);

      registerSelectionToolbarIntegration(plugin);
      cleanups.forEach((cleanup) => cleanup());

      expect(unregister).toHaveBeenCalled();
    });
  });
});
