import {
  hasSelectedTextInstructions,
  isNoteSelectedTextContext,
  isWebSelectedTextContext,
  type NoteSelectedTextContext,
  type WebSelectedTextContext,
} from "@/types/message";

const ISSUE_3 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/3";

const noteContext = (instruction?: string): NoteSelectedTextContext => ({
  id: "n1",
  sourceType: "note",
  noteTitle: "Notes",
  notePath: "Notes.md",
  startLine: 1,
  endLine: 1,
  content: "Excerpt",
  ...(instruction !== undefined ? { instruction } : {}),
});

const webContext: WebSelectedTextContext = {
  id: "w1",
  sourceType: "web",
  title: "Page",
  url: "https://example.com",
  content: "Quote",
};

describe("message", () => {
  describe("isWebSelectedTextContext()", () => {
    it("identifies web selections only", () => {
      expect(isWebSelectedTextContext(webContext)).toBe(true);
      expect(isWebSelectedTextContext(noteContext())).toBe(false);
    });
  });

  describe("isNoteSelectedTextContext()", () => {
    it("identifies note selections only", () => {
      expect(isNoteSelectedTextContext(noteContext())).toBe(true);
      expect(isNoteSelectedTextContext(webContext)).toBe(false);
    });
  });

  describe("hasSelectedTextInstructions()", () => {
    it(`returns true only when at least one note excerpt carries a non-blank instruction (${ISSUE_3})`, () => {
      expect(hasSelectedTextInstructions(undefined)).toBe(false);
      expect(hasSelectedTextInstructions([])).toBe(false);
      expect(hasSelectedTextInstructions([webContext, noteContext()])).toBe(false);
      expect(hasSelectedTextInstructions([noteContext("   ")])).toBe(false);
      expect(hasSelectedTextInstructions([noteContext(), noteContext("Check formula")])).toBe(true);
    });
  });
});
