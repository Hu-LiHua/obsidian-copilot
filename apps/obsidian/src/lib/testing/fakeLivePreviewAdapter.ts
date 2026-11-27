import type {
  LivePreviewAdapter,
  LivePreviewHandle,
  LivePreviewMountOptions,
} from "@/lib/livePreview";

export interface FakeLivePreviewAdapter extends LivePreviewAdapter {
  mounts: LivePreviewMountOptions[];
  readonly destroyed: number;
  readonly collapsed: number;
}

export function fakeLivePreviewAdapter(): FakeLivePreviewAdapter {
  const mounts: LivePreviewMountOptions[] = [];
  let destroyed = 0;
  let collapsed = 0;
  return {
    mounts,
    get destroyed(): number {
      return destroyed;
    },
    get collapsed(): number {
      return collapsed;
    },
    mount(options: LivePreviewMountOptions): LivePreviewHandle | null {
      mounts.push(options);
      return {
        destroy(): void {
          destroyed += 1;
        },
        collapse(): void {
          collapsed += 1;
        },
      };
    },
  };
}
