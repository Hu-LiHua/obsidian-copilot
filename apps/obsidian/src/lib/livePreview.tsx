import React from "react";

export interface LivePreviewMountOptions {
  container: HTMLElement;
  text: string;
  sourcePath: string;
  onError?: (error: unknown) => void;
}

export interface LivePreviewHandle {
  destroy(): void;
  collapse(): void;
}

export interface LivePreviewAdapter {
  mount(options: LivePreviewMountOptions): LivePreviewHandle | null;
}

const LivePreviewAdapterContext = React.createContext<LivePreviewAdapter | null>(null);

export function useLivePreviewAdapter(): LivePreviewAdapter | null {
  return React.useContext(LivePreviewAdapterContext);
}

interface LivePreviewAdapterProviderProps {
  adapter: LivePreviewAdapter | null;
  children: React.ReactNode;
}

// The chat cannot reach Obsidian's internal editor, so the host hands it an adapter here; without one the reply stays in Reading View.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
export function LivePreviewAdapterProvider({
  adapter,
  children,
}: LivePreviewAdapterProviderProps): React.ReactElement {
  return (
    <LivePreviewAdapterContext.Provider value={adapter}>
      {children}
    </LivePreviewAdapterContext.Provider>
  );
}
