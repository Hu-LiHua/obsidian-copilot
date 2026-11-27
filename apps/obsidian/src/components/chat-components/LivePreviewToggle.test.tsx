import { LivePreviewToggle } from "@/components/chat-components/LivePreviewToggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LivePreviewAdapterProvider, type LivePreviewAdapter } from "@/lib/livePreview";
import { LivePreviewScopeProvider } from "@/lib/livePreviewScope";
import { act, render, screen } from "@testing-library/react";
import React from "react";

const adapter: LivePreviewAdapter = {
  mount: () => ({ destroy: () => undefined, collapse: () => undefined }),
};

function renderToggle(withAdapter: boolean) {
  return render(
    <TooltipProvider>
      <LivePreviewAdapterProvider adapter={withAdapter ? adapter : null}>
        <LivePreviewScopeProvider>
          <LivePreviewToggle />
        </LivePreviewScopeProvider>
      </LivePreviewAdapterProvider>
    </TooltipProvider>
  );
}

describe("LivePreviewToggle", () => {
  describe("LivePreviewToggle()", () => {
    it("offers Live Preview while the response reads as Reading View (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      renderToggle(true);

      expect(screen.getByTitle("Live Preview")).not.toBeNull();
    });

    it("offers Reading View once the response reads as Live Preview (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      renderToggle(true);

      act(() => screen.getByTitle("Live Preview").click());

      expect(screen.getByTitle("Reading View")).not.toBeNull();
    });

    it("shows no toggle where Live Preview is unsupported (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      renderToggle(false);

      expect(screen.queryByTitle("Live Preview")).toBeNull();
      expect(screen.queryByTitle("Reading View")).toBeNull();
    });
  });
});
