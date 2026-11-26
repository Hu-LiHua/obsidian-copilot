import { Notice, type App, type Editor, type TFile } from "obsidian";
import { editorSelectionReport } from "@/selection/selectionWatcher";
import {
  MAX_PINNED_SELECTIONS,
  pinSelection,
  type KeyedSelection,
} from "@/selection/selectionStore";

export interface ChatContextHost {
  app: App;
  activateChatViewForContext(): Promise<void>;
}

export function buildEditorSelectionReport(editor: Editor, file: TFile): KeyedSelection | null {
  const report = editorSelectionReport({ editor, file });
  return report?.context ? report : null;
}

export function tryPinSelection(selection: KeyedSelection): boolean {
  if (pinSelection(selection)) return true;
  new Notice(
    `You can attach up to ${MAX_PINNED_SELECTIONS} selections. Remove one to add another.`
  );
  return false;
}

// An explicitly added selection joins the ones already attached instead of replacing them, so a message can
// point at several passages of one note.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/1
export async function addSelectionToChatContext(
  plugin: ChatContextHost,
  selection: KeyedSelection
): Promise<void> {
  if (!tryPinSelection(selection)) return;
  await plugin.activateChatViewForContext();
}
