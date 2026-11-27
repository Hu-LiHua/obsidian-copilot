import { useLivePreviewAdapter, type LivePreviewHandle } from "@/lib/livePreview";
import { useLivePreviewScope } from "@/lib/livePreviewScope";
import { logWarn } from "@/logger";
import React from "react";

interface LivePreviewTextProps {
  text: string;
  sourcePath: string;
  className?: string;
  onError?: (error: unknown) => void;
}

// The renderer only mounts the host's editor, so every surface of a response can show the same Live Preview.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
export function LivePreviewText({
  text,
  sourcePath,
  className,
  onError,
}: LivePreviewTextProps): React.ReactElement | null {
  const adapter = useLivePreviewAdapter();
  const scope = useLivePreviewScope();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = React.useRef<LivePreviewHandle | null>(null);
  const report = onError ?? scope?.reportError;

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !adapter) return;
    let handle: LivePreviewHandle | null = null;
    try {
      handle = adapter.mount({ container, text, sourcePath, onError: report });
    } catch (error) {
      // The host reports a failure it caught itself, so an error that reaches here is one it never saw.
      // https://github.com/Hu-LiHua/obsidian-copilot/issues/6
      logWarn("[LivePreview] the reply could not be shown as Live Preview", error);
      report?.(error);
      return;
    }
    if (!handle) return;
    handleRef.current = handle;
    return () => {
      handleRef.current = null;
      handle.destroy();
    };
  }, [adapter, text, sourcePath, report]);

  const collapse = React.useCallback(() => {
    handleRef.current?.collapse();
  }, []);

  // Esc belongs to the preview while it is open, so the chat does not read it as its own.
  // https://github.com/Hu-LiHua/obsidian-copilot/issues/6
  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      collapse();
    },
    [collapse]
  );

  // Clicking away from the preview leaves the reply as plain text, with no caret left behind in it.
  // https://github.com/Hu-LiHua/obsidian-copilot/issues/6
  const onBlur = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      if (next && event.currentTarget.contains(next)) return;
      collapse();
    },
    [collapse]
  );

  if (!adapter) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      data-live-preview=""
      onKeyDown={onKeyDown}
      onBlur={onBlur}
    />
  );
}
