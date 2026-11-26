import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickAskPanelShell } from "./QuickAskPanelShell";

const MIN_TEXTAREA_HEIGHT_PX = 48;
const MAX_TEXTAREA_HEIGHT_PX = 192;

export interface AnnotationPanelProps {
  locationLabel: string;
  initialInstruction?: string;
  onSubmit: (instruction: string) => void;
  onClose: () => void;
  onDragOffset?: (offset: { x: number; y: number }) => void;
}

export function AnnotationPanel({
  locationLabel,
  initialInstruction = "",
  onSubmit,
  onClose,
  onDragOffset,
}: AnnotationPanelProps) {
  const [draft, setDraft] = useState(initialInstruction);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.setCssProps?.({ "--copilot-autosize-height": "auto" });
    const nextHeight = Math.min(
      MAX_TEXTAREA_HEIGHT_PX,
      Math.max(MIN_TEXTAREA_HEIGHT_PX, textarea.scrollHeight)
    );
    textarea.setCssProps?.({ "--copilot-autosize-height": `${nextHeight}px` });
  }, []);

  useLayoutEffect(() => {
    adjustHeight();
  }, [draft, adjustHeight]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
  }, []);

  const canSubmit = draft.trim().length > 0;

  const submit = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }, [draft, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    },
    [submit]
  );

  return (
    <QuickAskPanelShell onClose={onClose} onDragOffset={onDragOffset}>
      <div className="tw-px-3 tw-pb-1 tw-pt-2">
        <div className="tw-relative">
          <textarea
            ref={textareaRef}
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Annotation instruction input"
            placeholder="Add an instruction..."
            className={cn(
              "tw-block tw-h-[var(--copilot-autosize-height,_48px)] tw-max-h-48 tw-min-h-12 tw-w-full tw-resize-none tw-overflow-y-auto tw-border-0 tw-bg-transparent tw-px-1 tw-py-2 tw-pr-8 tw-text-sm tw-leading-normal tw-text-normal tw-shadow-none tw-outline-none",
              "placeholder:tw-text-muted/60 focus-visible:tw-outline-none focus-visible:tw-ring-0"
            )}
          />
        </div>
      </div>

      <div className="tw-mt-auto tw-flex tw-items-center tw-justify-between tw-gap-2 tw-border-0 tw-border-t tw-border-solid tw-border-border tw-px-3 tw-py-[7px]">
        <div className="tw-flex tw-min-w-0 tw-items-center tw-gap-1.5">
          <span className="tw-rounded tw-border tw-border-solid tw-border-border tw-bg-secondary tw-px-1.5 tw-py-0.5 tw-font-mono tw-text-ui-smaller tw-text-muted">
            {locationLabel}
          </span>
        </div>

        <div className="tw-flex tw-shrink-0 tw-items-center tw-gap-1.5">
          <Button
            type="button"
            variant="secondary"
            className="tw-h-7 tw-rounded-md tw-border tw-border-solid tw-border-border tw-bg-primary-alt tw-px-2.5 tw-py-0 tw-text-ui-small tw-font-medium tw-text-muted tw-shadow-sm hover:tw-border-border-hover hover:tw-bg-modifier-hover hover:tw-text-normal"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={!canSubmit}
            className={cn(
              "tw-h-7 tw-rounded-md tw-border tw-border-solid tw-border-interactive-accent tw-px-3 tw-py-0 tw-text-ui-small tw-font-medium",
              "tw-shadow-[0_1px_2px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.18)]",
              "disabled:tw-border-border disabled:tw-bg-secondary disabled:tw-text-faint disabled:tw-opacity-100 disabled:tw-shadow-none"
            )}
            onClick={submit}
          >
            <CornerDownLeft className="tw-size-3" />
            <span>Done</span>
          </Button>
        </div>
      </div>
    </QuickAskPanelShell>
  );
}
