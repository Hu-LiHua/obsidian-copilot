import { useLivePreviewAdapter } from "@/lib/livePreview";
import React from "react";

// One response's Live Preview choice reaches every surface of that response.
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

// Every surface of one response reads the same flag, so a toggle on the response carries to the subagent prompt and result inside it.
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
  const onToggleRef = React.useRef(onToggleProp);
  const onErrorRef = React.useRef(onError);
  React.useEffect(() => {
    onToggleRef.current = onToggleProp;
    onErrorRef.current = onError;
  }, [onToggleProp, onError]);
  // The owner's callbacks change identity on every render, so the scope keeps the last ones and hands out the same functions, which keeps a mounted preview from being torn down and mounted again on every update.
  // https://github.com/Hu-LiHua/obsidian-copilot/issues/6
  const toggle = React.useCallback(() => {
    const owner = onToggleRef.current;
    if (owner) {
      owner();
      return;
    }
    setOwnLivePreview((value) => !value);
  }, []);
  const reportError = React.useCallback((error: unknown) => {
    const owner = onErrorRef.current;
    if (owner) {
      owner(error);
      return;
    }
    setOwnLivePreview(false);
  }, []);
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
