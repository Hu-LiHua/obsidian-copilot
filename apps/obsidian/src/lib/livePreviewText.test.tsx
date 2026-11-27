import { LivePreviewText } from "@/lib/livePreviewText";
import { LivePreviewAdapterProvider } from "@/lib/livePreview";
import { fakeLivePreviewAdapter } from "@/lib/testing/fakeLivePreviewAdapter";
import { render } from "@testing-library/react";
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
  });
});
