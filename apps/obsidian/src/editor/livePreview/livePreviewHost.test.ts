import { createLivePreviewAdapter } from "@/editor/livePreview/livePreviewHost";
import { logWarn } from "@/logger";
import { Notice, Platform } from "obsidian";
import type { App } from "obsidian";

jest.mock("@/logger", () => ({
  ...jest.requireActual<typeof import("@/logger")>("@/logger"),
  logWarn: jest.fn(),
}));

describe("livePreviewHost", () => {
  describe("createLivePreviewAdapter()", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("offers no preview on a phone, so every reply stays in Reading View", () => {
      const wasMobile = Platform.isMobile;
      Platform.isMobile = true;
      try {
        expect(createLivePreviewAdapter({} as App)).toBeNull();
      } finally {
        Platform.isMobile = wasMobile;
      }
    });

    it("reports a preview Obsidian cannot mount and tells the user, so the reply is not left blank https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const adapter = createLivePreviewAdapter({} as App);
      const onError = jest.fn();
      const container = document.createElement("div");

      const handle = adapter?.mount({ container, text: "reply", sourcePath: "note.md", onError });

      expect(handle).toBeNull();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(logWarn).toHaveBeenCalledWith(
        "[LivePreview] the reply could not be shown as Live Preview",
        expect.anything()
      );
      expect(Notice).toHaveBeenCalledWith(
        "Live Preview could not be shown for this response. It stays in Reading View."
      );
    });

    it("tells the user once when several text segments of one response fail https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const adapter = createLivePreviewAdapter({} as App);
      const onError = jest.fn();
      const container = document.createElement("div");

      adapter?.mount({ container, text: "answer", sourcePath: "note.md", onError });
      adapter?.mount({ container, text: "reasoning", sourcePath: "note.md", onError });

      expect(onError).toHaveBeenCalledTimes(2);
      expect(Notice).toHaveBeenCalledTimes(1);
    });
  });
});
