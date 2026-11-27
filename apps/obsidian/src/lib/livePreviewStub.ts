import type { LivePreviewAdapter } from "@/lib/livePreview";

// The gallery has no Obsidian editor to mount, so a story shows the raw Markdown the preview would read.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/5
export const livePreviewStub: LivePreviewAdapter = {
  mount: ({ container, text }) => {
    container.textContent = text;
    return { destroy: () => undefined, collapse: () => undefined };
  },
};
