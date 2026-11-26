import React, { useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraggable } from "@/hooks/use-draggable";
import { cn } from "@/lib/utils";

export interface QuickAskPanelShellProps {
  onClose: () => void;
  onDragOffset?: (offset: { x: number; y: number }) => void;
  className?: string;
  children: React.ReactNode;
}

export function QuickAskPanelShell({
  onClose,
  onDragOffset,
  className,
  children,
}: QuickAskPanelShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getCurrentPanelPosition = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 };
  }, []);

  const handleDragPositionChange = useCallback(
    (pos: { x: number; y: number }) => {
      onDragOffset?.(pos);
    },
    [onDragOffset]
  );

  const { handlePointerDown: handleDragPointerDown } = useDraggable({
    dragRef: containerRef,
    bounds: null,
    writeToDom: false,
    getPosition: getCurrentPanelPosition,
    onPositionChange: handleDragPositionChange,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  const handleStopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "tw-group tw-relative tw-flex tw-size-full tw-flex-col tw-rounded-lg tw-border tw-border-solid tw-border-border tw-bg-primary tw-shadow-lg",
        className
      )}
      onKeyDown={handleKeyDown}
      onKeyUp={handleStopPropagation}
      onBeforeInput={handleStopPropagation}
      onInput={handleStopPropagation}
      onMouseDown={handleStopPropagation}
      onMouseUp={handleStopPropagation}
      onClick={handleStopPropagation}
    >
      <div className="tw-relative tw-flex-none">
        <div
          className="tw-flex tw-h-4 tw-cursor-grab tw-touch-none tw-items-center tw-justify-center hover:tw-bg-[color-mix(in_srgb,var(--background-modifier-hover)_20%,transparent)] active:tw-cursor-grabbing"
          onPointerDown={handleDragPointerDown}
        >
          <div className="tw-h-[5px] tw-w-16 tw-rounded-sm tw-bg-[color-mix(in_srgb,var(--text-muted)_40%,transparent)] hover:tw-bg-[color-mix(in_srgb,var(--text-muted)_65%,transparent)]" />
        </div>
        <Button
          className="tw-absolute tw-right-2 tw-top-1 tw-rounded tw-p-1 tw-text-normal"
          variant="ghost2"
          onClick={onClose}
          title="Close"
        >
          <X className="tw-size-4" />
        </Button>
      </div>

      {children}
    </div>
  );
}
