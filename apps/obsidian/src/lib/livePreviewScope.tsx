import { useLivePreviewAdapter } from "@/lib/livePreview";
import React from "react";

// The scope carries one response's Live Preview choice to every surface of that response, and the owner of the choice decides what a preview that could not be shown means.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
export interface LivePreviewScope {
  livePreview: boolean;
  supported: boolean;
  toggle: () => void;
  reportError: (error: unknown) => void;
}

const LivePreviewScopeContext = React.createContext<LivePreviewScope | null>(null);

export function useLivePreviewScope(): LivePreviewScope | null {
  return React.useContext(LivePreviewScopeContext);
}

interface LivePreviewScopeProviderProps {
  livePreview?: boolean;
  onToggle?: () => void;
  onError?: (error: unknown) => void;
  children: React.ReactNode;
}

// Every surface of one response reads the same flag, so a toggle on the response carries to the subagent prompt and result inside it. The choice is a reading aid that lasts as long as the response is on screen, so reopening a chat starts in Reading View again. An owner that passes the flag in keeps it where it can also read it, which is how a row learns that its response is in Live Preview.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/5
export function LivePreviewScopeProvider({
  livePreview: livePreviewProp,
  onToggle: onToggleProp,
  onError,
  children,
}: LivePreviewScopeProviderProps): React.ReactElement {
  const [ownLivePreview, setOwnLivePreview] = React.useState(false);
  const adapter = useLivePreviewAdapter();
  const supported = adapter !== null;
  const livePreview = livePreviewProp ?? ownLivePreview;
  const toggle = React.useCallback(() => {
    if (onToggleProp) {
      onToggleProp();
      return;
    }
    setOwnLivePreview((value) => !value);
  }, [onToggleProp]);
  const reportError = React.useCallback(
    (error: unknown) => {
      if (onError) {
        onError(error);
        return;
      }
      setOwnLivePreview(false);
    },
    [onError]
  );
  const scope = React.useMemo<LivePreviewScope>(
    () => ({
      livePreview: livePreview && supported,
      supported,
      toggle,
      reportError,
    }),
    [livePreview, supported, toggle, reportError]
  );
  return (
    <LivePreviewScopeContext.Provider value={scope}>{children}</LivePreviewScopeContext.Provider>
  );
}
