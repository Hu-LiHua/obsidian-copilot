import { useLivePreviewAdapter, type LivePreviewHandle } from "@/lib/livePreview";
import { useLivePreviewScope } from "@/lib/livePreviewScope";
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
      report?.(error);
      return;
    }
    // A mount that brings back nothing would leave the reply blank, so the owner puts it back in Reading View.
    // https://github.com/Hu-LiHua/obsidian-copilot/issues/6
    if (!handle) {
      report?.(new Error("The Live Preview editor could not be mounted."));
      return;
    }
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
