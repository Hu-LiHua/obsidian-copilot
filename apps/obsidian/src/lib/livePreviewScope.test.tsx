import { LivePreviewAdapterProvider, type LivePreviewAdapter } from "@/lib/livePreview";
import { LivePreviewScopeProvider, useLivePreviewScope } from "@/lib/livePreviewScope";
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

const adapter: LivePreviewAdapter = {
  mount: () => ({ destroy: () => undefined, collapse: () => undefined }),
};

function ScopeProbe(): React.ReactElement {
  const scope = useLivePreviewScope();
  if (!scope) return <span>outside</span>;
  return (
    <button onClick={scope.toggle} type="button">
      {scope.livePreview ? "live" : "reading"}
    </button>
  );
}

function FailingScopeProbe(): React.ReactElement {
  const scope = useLivePreviewScope();
  return (
    <button onClick={() => scope?.reportError(new Error("no editor"))} type="button">
      fail
    </button>
  );
}

function renderScope(withAdapter: boolean) {
  return render(
    <LivePreviewAdapterProvider adapter={withAdapter ? adapter : null}>
      <LivePreviewScopeProvider>
        <ScopeProbe />
      </LivePreviewScopeProvider>
    </LivePreviewAdapterProvider>
  );
}

describe("livePreviewScope", () => {
  describe("useLivePreviewScope()", () => {
    it("reports no scope outside a response", () => {
      render(<ScopeProbe />);

      expect(screen.getByText("outside")).not.toBeNull();
    });

    it("starts the response in Reading View (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      renderScope(true);

      expect(screen.getByRole("button").textContent).toBe("reading");
    });

    it("switches the response to Live Preview when the scope is toggled (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      renderScope(true);

      act(() => screen.getByRole("button").click());

      expect(screen.getByRole("button").textContent).toBe("live");
    });

    it("keeps the response in Reading View when the host offers no Live Preview (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      renderScope(false);

      act(() => screen.getByRole("button").click());

      expect(screen.getByRole("button").textContent).toBe("reading");
    });

    it("puts the response back in Reading View when the preview cannot be shown (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewScopeProvider>
            <ScopeProbe />
            <FailingScopeProbe />
          </LivePreviewScopeProvider>
        </LivePreviewAdapterProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "reading" }));
      expect(screen.getByRole("button", { name: "live" })).not.toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "fail" }));

      expect(screen.getByRole("button", { name: "reading" })).not.toBeNull();
    });

    it("keeps a nested notice in Reading View while the response around it reads as Live Preview (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", () => {
      render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewScopeProvider livePreview>
            <ScopeProbe />
            <LivePreviewScopeProvider livePreview={false}>
              <ScopeProbe />
            </LivePreviewScopeProvider>
          </LivePreviewScopeProvider>
        </LivePreviewAdapterProvider>
      );

      const [response, notice] = screen.getAllByRole("button");
      expect(response.textContent).toBe("live");
      expect(notice.textContent).toBe("reading");
    });
  });
});
