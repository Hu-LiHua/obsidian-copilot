import {
  MAX_PINNED_SELECTIONS,
  clearSelection,
  dismissSelection,
  getPinnedSelectionInstruction,
  getSelectedTextContexts,
  pinSelection,
  reportSelection,
  subscribeSelection,
  useSelectedTextContexts,
} from "@/selection/selectionStore";
import type { NoteSelectedTextContext, WebSelectedTextContext } from "@/types/message";
import { act, renderHook } from "@testing-library/react";

const ISSUE_797 = "https://github.com/Brevilabs/obsidian-copilot-private/issues/797";
const ISSUE_842 = "https://github.com/Brevilabs/obsidian-copilot-private/issues/842";
const ISSUE_1 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/1";
const ISSUE_3 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/3";

let nextId = 0;
const noteExcerpt = (notePath: string, content: string): NoteSelectedTextContext => ({
  id: `note-${nextId++}`,
  content,
  sourceType: "note",
  noteTitle: notePath.replace(/\.md$/, ""),
  notePath,
  startLine: 1,
  endLine: 1,
});
const webExcerpt = (url: string, content: string): WebSelectedTextContext => ({
  id: `web-${nextId++}`,
  content,
  sourceType: "web",
  title: "Page",
  url,
});
const select = (context: NoteSelectedTextContext | WebSelectedTextContext, key: string) =>
  reportSelection({
    location: context.sourceType === "web" ? context.url : context.notePath,
    key,
    context,
  });
const add = (context: NoteSelectedTextContext | WebSelectedTextContext, key: string) =>
  pinSelection({
    location: context.sourceType === "web" ? context.url : context.notePath,
    key,
    context,
  });

describe("selectionStore", () => {
  beforeEach(() => clearSelection());

  describe("reportSelection()", () => {
    it("attaches a reported selection and replaces it with the next one from any source", () => {
      const note = noteExcerpt("Research.md", "Excerpt");
      const web = webExcerpt("https://example.com/", "Quote");

      select(note, "replace:note");
      expect(getSelectedTextContexts()).toEqual([note]);

      select(web, "replace:web");
      expect(getSelectedTextContexts()).toEqual([web]);
    });

    it("keeps the attached selection when the same selection is reported again", () => {
      const first = noteExcerpt("Research.md", "Excerpt");
      select(first, "repeat:key");

      select(noteExcerpt("Research.md", "Excerpt"), "repeat:key");

      expect(getSelectedTextContexts()).toEqual([first]);
    });

    it(`clears the attached selection when its own note reports nothing selected (${ISSUE_797})`, () => {
      select(noteExcerpt("Research.md", "Excerpt"), "own:select");

      reportSelection({ location: "Research.md", context: null });

      expect(getSelectedTextContexts()).toEqual([]);
    });

    it(`keeps the attached selection, without notifying listeners, when another note reports nothing selected (${ISSUE_797})`, () => {
      const excerpt = noteExcerpt("Research.md", "Excerpt");
      select(excerpt, "other:select");
      const listener = jest.fn();
      const unsubscribe = subscribeSelection(listener);

      reportSelection({ location: "Draft.md", context: null });
      unsubscribe();

      expect(getSelectedTextContexts()).toEqual([excerpt]);
      expect(listener).not.toHaveBeenCalled();
    });

    it("attaches the same selection again once the user deselected it in between", () => {
      select(noteExcerpt("Research.md", "Excerpt"), "again:select");
      reportSelection({ location: "Research.md", context: null });

      const again = noteExcerpt("Research.md", "Excerpt");
      select(again, "again:select");

      expect(getSelectedTextContexts()).toEqual([again]);
    });

    it(`keeps an explicitly added excerpt attached when another selection is reported (${ISSUE_1})`, () => {
      const added = noteExcerpt("Research.md", "First passage");
      const live = noteExcerpt("Research.md", "Second passage");
      add(added, "pinned:first");

      select(live, "live:second");

      expect(getSelectedTextContexts()).toEqual([added, live]);
    });

    it(`does not attach a selection that is already attached as an excerpt (${ISSUE_1})`, () => {
      const added = noteExcerpt("Research.md", "First passage");
      add(added, "pinned:only");

      select(noteExcerpt("Research.md", "First passage"), "pinned:only");

      expect(getSelectedTextContexts()).toEqual([added]);
    });
  });

  describe("pinSelection()", () => {
    it(`adds an explicitly added excerpt beside the excerpt already attached (${ISSUE_1})`, () => {
      const first = noteExcerpt("Research.md", "First passage");
      const second = noteExcerpt("Research.md", "Second passage");

      add(first, "pinned:first");
      add(second, "pinned:second");

      expect(getSelectedTextContexts()).toEqual([first, second]);
    });

    it(`keeps a single badge when the excerpt already shown is added again (${ISSUE_1})`, () => {
      const excerpt = noteExcerpt("Research.md", "First passage");
      select(excerpt, "passage:first");

      add(excerpt, "passage:first");

      expect(getSelectedTextContexts()).toEqual([excerpt]);
    });

    it(`does not attach the same excerpt twice (${ISSUE_1})`, () => {
      const excerpt = noteExcerpt("Research.md", "First passage");

      add(excerpt, "pinned:once");
      add(noteExcerpt("Research.md", "First passage"), "pinned:once");

      expect(getSelectedTextContexts()).toEqual([excerpt]);
    });

    it(`keeps an explicitly added excerpt when its own note reports nothing selected (${ISSUE_1})`, () => {
      const excerpt = noteExcerpt("Research.md", "First passage");
      add(excerpt, "pinned:keep");

      reportSelection({ location: "Research.md", context: null });

      expect(getSelectedTextContexts()).toEqual([excerpt]);
    });

    it(`refuses to add more excerpts than the limit allows (${ISSUE_1})`, () => {
      for (let index = 0; index < MAX_PINNED_SELECTIONS; index++) {
        expect(add(noteExcerpt("Research.md", `Passage ${index}`), `pinned:${index}`)).toBe(true);
      }

      expect(add(noteExcerpt("Research.md", "One too many"), "pinned:overflow")).toBe(false);
      expect(getSelectedTextContexts()).toHaveLength(MAX_PINNED_SELECTIONS);
    });

    it(`overwrites the existing instruction when the same range is annotated again (${ISSUE_3})`, () => {
      const first: NoteSelectedTextContext = {
        ...noteExcerpt("Research.md", "First passage"),
        instruction: "Old instruction",
      };
      const second = noteExcerpt("Research.md", "Second passage");
      const updated: NoteSelectedTextContext = {
        ...noteExcerpt("Research.md", "First passage"),
        instruction: "  Updated instruction  ",
      };

      add(first, "Research.md:0:0:0:13");
      add(second, "Research.md:2:0:2:14");
      expect(add(updated, "Research.md:0:0:0:13")).toBe(true);

      expect(getSelectedTextContexts()).toEqual([
        { ...updated, instruction: "Updated instruction" },
        second,
      ]);
    });

    it(`preserves an attached instruction when the same range is pinned again without one (${ISSUE_3})`, () => {
      const annotated: NoteSelectedTextContext = {
        ...noteExcerpt("Research.md", "First passage"),
        instruction: "Keep this instruction",
      };
      add(annotated, "Research.md:0:0:0:13");

      add(noteExcerpt("Research.md", "First passage"), "Research.md:0:0:0:13");

      expect(getSelectedTextContexts()).toEqual([annotated]);
    });

    it(`drops a blank instruction when pinning an excerpt (${ISSUE_3})`, () => {
      const blank: NoteSelectedTextContext = {
        ...noteExcerpt("Research.md", "First passage"),
        instruction: "   ",
      };

      add(blank, "Research.md:0:0:0:13");

      const [stored] = getSelectedTextContexts();
      expect(stored).toMatchObject({ content: "First passage" });
      expect("instruction" in stored).toBe(false);
    });
  });

  describe("dismissSelection()", () => {
    it(`removes the attached selection, which its next report attaches again (${ISSUE_842})`, () => {
      const excerpt = webExcerpt("https://example.com/", "Quote");
      select(excerpt, "dismiss:quote");

      dismissSelection(excerpt.id);
      expect(getSelectedTextContexts()).toEqual([]);

      const again = webExcerpt("https://example.com/", "Quote");
      select(again, "dismiss:quote");
      expect(getSelectedTextContexts()).toEqual([again]);
    });

    it("leaves the attached selection when the id belongs to no attached selection", () => {
      const excerpt = noteExcerpt("Research.md", "Excerpt");
      select(excerpt, "unknown:select");

      dismissSelection("not-attached");

      expect(getSelectedTextContexts()).toEqual([excerpt]);
    });

    it(`removes only the excerpt with that id (${ISSUE_1})`, () => {
      const first = noteExcerpt("Research.md", "First passage");
      const second = noteExcerpt("Research.md", "Second passage");
      add(first, "pinned:first");
      add(second, "pinned:second");

      dismissSelection(first.id);

      expect(getSelectedTextContexts()).toEqual([second]);
    });
  });

  describe("clearSelection()", () => {
    it(`removes the selection for a sent message or a new chat, and its next report attaches it again (${ISSUE_842})`, () => {
      select(noteExcerpt("Drawing.excalidraw.md", "Shape"), "sent:select");

      clearSelection();
      expect(getSelectedTextContexts()).toEqual([]);

      const again = noteExcerpt("Drawing.excalidraw.md", "Shape");
      select(again, "sent:select");
      expect(getSelectedTextContexts()).toEqual([again]);
    });

    it(`removes the explicitly added excerpts as well (${ISSUE_1})`, () => {
      add(noteExcerpt("Research.md", "First passage"), "pinned:first");

      clearSelection();

      expect(getSelectedTextContexts()).toEqual([]);
    });
  });

  describe("getPinnedSelectionInstruction()", () => {
    it(`returns the trimmed instruction for a pinned excerpt with that key and undefined otherwise (${ISSUE_3})`, () => {
      add(
        { ...noteExcerpt("Research.md", "Annotated"), instruction: "  Check units  " },
        "Research.md:0:0:0:9"
      );
      add(noteExcerpt("Research.md", "Plain"), "Research.md:2:0:2:5");
      select(noteExcerpt("Research.md", "Live"), "Research.md:4:0:4:4");

      expect(getPinnedSelectionInstruction("Research.md:0:0:0:9")).toBe("Check units");
      expect(getPinnedSelectionInstruction("Research.md:2:0:2:5")).toBeUndefined();
      expect(getPinnedSelectionInstruction("Research.md:4:0:4:4")).toBeUndefined();
      expect(getPinnedSelectionInstruction("Research.md:9:0:9:1")).toBeUndefined();
    });
  });

  describe("getSelectedTextContexts()", () => {
    it("returns the same empty list every time nothing is attached", () => {
      expect(getSelectedTextContexts()).toBe(getSelectedTextContexts());
    });
  });

  describe("useSelectedTextContexts()", () => {
    it("re-renders with the attached selection and with the empty list once it is cleared", () => {
      const { result } = renderHook(() => useSelectedTextContexts());
      const excerpt = noteExcerpt("Research.md", "Excerpt");

      act(() => select(excerpt, "hook:select"));
      expect(result.current).toEqual([excerpt]);

      act(() => clearSelection());
      expect(result.current).toEqual([]);
    });
  });

  describe("subscribeSelection()", () => {
    it("notifies the listener of each change until it unsubscribes", () => {
      const listener = jest.fn();
      const unsubscribe = subscribeSelection(listener);
      const excerpt = noteExcerpt("Research.md", "Excerpt");

      select(excerpt, "subscribe:select");
      unsubscribe();
      clearSelection();

      expect(listener.mock.calls).toEqual([[[excerpt]]]);
    });
  });
});
