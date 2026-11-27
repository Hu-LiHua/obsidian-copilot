import { LivePreviewText } from "@/lib/livePreviewText";
import { LivePreviewAdapterProvider, type LivePreviewAdapter } from "@/lib/livePreview";
import { LivePreviewScopeProvider } from "@/lib/livePreviewScope";
import { fakeLivePreviewAdapter } from "@/lib/testing/fakeLivePreviewAdapter";
import { fireEvent, render } from "@testing-library/react";
import React from "react";

describe("livePreviewText", () => {
  describe("LivePreviewText()", () => {
    it("mounts the reply's Markdown in the source path it was given", () => {
      const adapter = fakeLivePreviewAdapter();

      render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="$$x^2$$" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );

      expect(adapter.mounts).toHaveLength(1);
      expect(adapter.mounts[0].text).toBe("$$x^2$$");
      expect(adapter.mounts[0].sourcePath).toBe("Notes/Ideas.md");
      expect(adapter.mounts[0].container).toBeInstanceOf(HTMLElement);
    });

    it("destroys the mount when the reply's text changes", () => {
      const adapter = fakeLivePreviewAdapter();
      const { rerender } = render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="first" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );

      rerender(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="second" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );

      expect(adapter.mounts).toHaveLength(2);
      expect(adapter.destroyed).toBe(1);
    });

    it("destroys the mount when it unmounts", () => {
      const adapter = fakeLivePreviewAdapter();
      const { unmount } = render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );

      unmount();

      expect(adapter.destroyed).toBe(1);
    });

    it("renders nothing when the host offers no adapter", () => {
      const { container } = render(
        <LivePreviewAdapterProvider adapter={null}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );

      expect(container.innerHTML).toBe("");
    });

    it("folds the preview and hides the caret when the reply loses focus https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const adapter = fakeLivePreviewAdapter();
      const { container } = render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );
      const preview = container.querySelector("[data-live-preview]") as HTMLElement;

      fireEvent.focusOut(preview);

      expect(adapter.collapsed).toBe(1);
    });

    it("keeps the preview open while the focus stays inside it https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const adapter = fakeLivePreviewAdapter();
      const { container } = render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );
      const preview = container.querySelector("[data-live-preview]") as HTMLElement;
      const inside = document.createElement("span");
      preview.appendChild(inside);

      fireEvent.focusOut(preview, { relatedTarget: inside });

      expect(adapter.collapsed).toBe(0);
    });

    it("folds the preview when Esc is pressed inside it https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const adapter = fakeLivePreviewAdapter();
      const { container } = render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );
      const preview = container.querySelector("[data-live-preview]") as HTMLElement;

      fireEvent.keyDown(preview, { key: "Escape" });

      expect(adapter.collapsed).toBe(1);
    });

    it("leaves the preview open when another key is pressed inside it", () => {
      const adapter = fakeLivePreviewAdapter();
      const { container } = render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
        </LivePreviewAdapterProvider>
      );
      const preview = container.querySelector("[data-live-preview]") as HTMLElement;

      fireEvent.keyDown(preview, { key: "a" });

      expect(adapter.collapsed).toBe(0);
    });

    it("reports a mount that fails, so the reply goes back to Reading View https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const failure = new Error("Obsidian's editor is not available");
      const adapter: LivePreviewAdapter = {
        mount: () => {
          throw failure;
        },
      };
      const onError = jest.fn();

      render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" onError={onError} />
        </LivePreviewAdapterProvider>
      );

      expect(onError).toHaveBeenCalledWith(failure);
    });

    it("reports a mount that brings back nothing, so the reply is not left blank https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const adapter: LivePreviewAdapter = { mount: () => null };
      const onError = jest.fn();

      render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" onError={onError} />
        </LivePreviewAdapterProvider>
      );

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("keeps the preview mounted when the owner of the choice re-renders https://github.com/Hu-LiHua/obsidian-copilot/issues/6", () => {
      const adapter = fakeLivePreviewAdapter();
      const { rerender } = render(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewScopeProvider
            livePreview
            onToggle={() => undefined}
            onError={() => undefined}
          >
            <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
          </LivePreviewScopeProvider>
        </LivePreviewAdapterProvider>
      );

      rerender(
        <LivePreviewAdapterProvider adapter={adapter}>
          <LivePreviewScopeProvider
            livePreview
            onToggle={() => undefined}
            onError={() => undefined}
          >
            <LivePreviewText text="reply" sourcePath="Notes/Ideas.md" />
          </LivePreviewScopeProvider>
        </LivePreviewAdapterProvider>
      );

      expect(adapter.mounts).toHaveLength(1);
    });
  });
});
