import type React from "react";
import type { EditorView } from "@codemirror/view";
import type { Editor } from "obsidian";
import type CopilotPlugin from "@/main";
import type { ReplaceGuard } from "@/editor/replaceGuard";
import type { ResizeDirection } from "@/hooks/use-resizable";

export type QuickAskMode = "ask" | "edit" | "edit-direct";

export interface QuickAskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface QuickAskPanelProps {
  plugin: CopilotPlugin;
  editor: Editor;
  view: EditorView;
  selectedText: string;
  replaceGuard: ReplaceGuard;
  onClose: () => void;
  onDragOffset?: (offset: { x: number; y: number }) => void;
  onResizeStart?: (
    direction: ResizeDirection,
    start: { x: number; y: number; pointerId: number }
  ) => void;
  hasCustomHeight?: boolean;
}

export interface QuickAskOverlayPanelContext {
  onClose: () => void;
  onDragOffset: (offset: { x: number; y: number }) => void;
  onResizeStart: (
    direction: ResizeDirection,
    start: { x: number; y: number; pointerId: number }
  ) => void;
  hasCustomHeight: boolean;
}

export type QuickAskOverlayOptions = {
  plugin: CopilotPlugin;
  view: EditorView;
  onClose: () => void;
  replaceGuard?: ReplaceGuard;
} & (
  | {
      editor: Editor;
      selectedText: string;
      selectionFrom: number;
      selectionTo: number;
      renderPanel?: undefined;
    }
  | {
      renderPanel: (context: QuickAskOverlayPanelContext) => React.ReactNode;
    }
);

export interface QuickAskWidgetPayload {
  bottomAnchorPos: number;
  topAnchorPos?: number | null;
  focusAnchorPos?: number | null;
  options: QuickAskOverlayOptions;
}
