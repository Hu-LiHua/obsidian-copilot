import {
  addSelectionToChatContext,
  buildEditorSelectionReport,
} from "@/selection/selectionActions";
import {
  MAX_PINNED_SELECTIONS,
  clearSelection,
  getSelectedTextContexts,
} from "@/selection/selectionStore";
import type CopilotPlugin from "@/main";
import { Notice } from "obsidian";
import type { Editor } from "obsidian";
import { mockTFile } from "@/__tests__/mockObsidian";

const ISSUE_1 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/1";

const research = mockTFile({ path: "Research.md", basename: "Research" });

function editorWith(text: string, startLine = 2): Editor {
  return {
    listSelections: () => [
      { anchor: { line: startLine, ch: 0 }, head: { line: startLine + 2, ch: 0 } },
    ],
    getSelection: () => text,
  } as unknown as Editor;
}

function fakePlugin(): CopilotPlugin {
  return { activateChatViewForContext: jest.fn() } as unknown as CopilotPlugin;
}

describe("selectionActions", () => {
  beforeEach(() => {
    clearSelection();
    jest.mocked(Notice).mockClear();
  });

  describe("buildEditorSelectionReport()", () => {
    it("reports the selected text of the editor with its line range", () => {
      const report = buildEditorSelectionReport(editorWith("An excerpt"), research);

      expect(report).toMatchObject({
        location: "Research.md",
        context: { content: "An excerpt", notePath: "Research.md", startLine: 3, endLine: 5 },
      });
    });

    it("reports nothing when the editor has no selection", () => {
      expect(buildEditorSelectionReport(editorWith(""), research)).toBeNull();
    });
  });

  describe("addSelectionToChatContext()", () => {
    it("attaches the selection and opens the chat", async () => {
      const plugin = fakePlugin();
      const report = buildEditorSelectionReport(editorWith("An excerpt"), research);

      await addSelectionToChatContext(plugin, report!);

      expect(getSelectedTextContexts()).toHaveLength(1);
      expect(plugin.activateChatViewForContext).toHaveBeenCalled();
    });

    it(`attaches a second selection beside the first one (${ISSUE_1})`, async () => {
      const plugin = fakePlugin();
      const first = buildEditorSelectionReport(editorWith("First passage", 2), research);
      const second = buildEditorSelectionReport(editorWith("Second passage", 8), research);

      await addSelectionToChatContext(plugin, first!);
      await addSelectionToChatContext(plugin, second!);

      expect(getSelectedTextContexts().map((context) => context.content)).toEqual([
        "First passage",
        "Second passage",
      ]);
    });

    it(`shows a notice and attaches nothing once the limit is reached (${ISSUE_1})`, async () => {
      const plugin = fakePlugin();
      for (let index = 0; index < MAX_PINNED_SELECTIONS; index++) {
        await addSelectionToChatContext(plugin, {
          location: "Research.md",
          key: `passage:${index}`,
          context: {
            id: `note-${index}`,
            content: `Passage ${index}`,
            sourceType: "note",
            noteTitle: "Research",
            notePath: "Research.md",
            startLine: 1,
            endLine: 1,
          },
        });
      }

      await addSelectionToChatContext(plugin, {
        location: "Research.md",
        key: "passage:overflow",
        context: {
          id: "note-overflow",
          content: "One too many",
          sourceType: "note",
          noteTitle: "Research",
          notePath: "Research.md",
          startLine: 1,
          endLine: 1,
        },
      });

      expect(getSelectedTextContexts()).toHaveLength(MAX_PINNED_SELECTIONS);
      expect(Notice).toHaveBeenCalledWith(
        `You can attach up to ${MAX_PINNED_SELECTIONS} selections. Remove one to add another.`
      );
    });
  });
});
