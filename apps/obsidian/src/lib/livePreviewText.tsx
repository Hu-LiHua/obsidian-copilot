import { useLivePreviewAdapter } from "@/lib/livePreview";
import React from "react";

interface LivePreviewTextProps {
  text: string;
  sourcePath: string;
  className?: string;
  onError?: (error: unknown) => void;
}

// The renderer only mounts the host's editor, so every surface of a response can show the same Live Preview. A mount that fails is reported to the owner of the flag, which puts the reply back in Reading View.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
export function LivePreviewText({
  text,
  sourcePath,
  className,
  onError,
}: LivePreviewTextProps): React.ReactElement | null {
  const adapter = useLivePreviewAdapter();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !adapter) return;
    const handle = adapter.mount({ container, text, sourcePath, onError });
    return () => handle?.destroy();
  }, [adapter, text, sourcePath, onError]);

  if (!adapter) return null;

  return <div ref={containerRef} className={className} data-live-preview="" />;
}
