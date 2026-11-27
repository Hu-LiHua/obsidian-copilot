import type {
  LivePreviewAdapter,
  LivePreviewHandle,
  LivePreviewMountOptions,
} from "@/lib/livePreview";

export interface FakeLivePreviewAdapter extends LivePreviewAdapter {
  mounts: LivePreviewMountOptions[];
  readonly destroyed: number;
}

export function fakeLivePreviewAdapter(): FakeLivePreviewAdapter {
  const mounts: LivePreviewMountOptions[] = [];
  let destroyed = 0;
  return {
    mounts,
    get destroyed(): number {
      return destroyed;
    },
    mount(options: LivePreviewMountOptions): LivePreviewHandle | null {
      mounts.push(options);
      return {
        destroy(): void {
          destroyed += 1;
        },
        collapse(): void {},
      };
    },
  };
}
