import { settingsStore } from "@/settings/model";
import type { SelectedTextContext } from "@/types/message";
import { atom, useAtomValue } from "jotai";
import type { EditorPosition } from "obsidian";

export interface KeyedSelection {
  location: string;
  key: string;
  context: SelectedTextContext;
}

// A passage keeps one identity whichever way it was selected, so the editor's own report and an explicit
// add of the same passage describe one excerpt instead of two.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/7
export function noteSelectionKey(
  path: string,
  first: EditorPosition,
  second: EditorPosition
): string {
  const firstStartsEarlier =
    first.line < second.line || (first.line === second.line && first.ch <= second.ch);
  const start = firstStartsEarlier ? first : second;
  const end = firstStartsEarlier ? second : first;
  return `${path}:${start.line}:${start.ch}:${end.line}:${end.ch}`;
}

export type SelectionReport = KeyedSelection | { location: string; context: null };

const NO_CONTEXTS = Object.freeze([]) as unknown as SelectedTextContext[];
const NO_PINNED = Object.freeze([]) as unknown as KeyedSelection[];

export const MAX_PINNED_SELECTIONS = 10;

const liveAtom = atom<KeyedSelection | null>(null);
const pinnedAtom = atom<KeyedSelection[]>(NO_PINNED);

const contextsAtom = atom((get) => {
  const pinned = get(pinnedAtom);
  const live = get(liveAtom);
  const pinnedContexts = pinned.map((pinnedSelection) => pinnedSelection.context);
  if (!live) return pinnedContexts.length > 0 ? pinnedContexts : NO_CONTEXTS;
  return [...pinnedContexts, live.context];
});

// Click-read sources re-report an unchanged selection on every click, so only a different one replaces the
// attached badge; once the badge is sent or removed, the next report of the same selection attaches it again.
// https://github.com/Brevilabs/obsidian-copilot-private/issues/842
export function reportSelection(report: SelectionReport): void {
  const live = settingsStore.get(liveAtom);
  const pinned = settingsStore.get(pinnedAtom);
  if (!report.context) {
    // Nothing selected in another note or page says nothing about the attached selection.
    // https://github.com/Brevilabs/obsidian-copilot-private/issues/797
    if (report.location === live?.location) {
      settingsStore.set(liveAtom, null);
    }
    return;
  }
  if (
    report.key === live?.key ||
    pinned.some((pinnedSelection) => pinnedSelection.key === report.key)
  ) {
    return;
  }
  settingsStore.set(liveAtom, report);
}

// An explicitly added excerpt joins the excerpts already attached, so one message can point at several
// passages of a note; a fresh selection still replaces only the excerpt it is showing.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/1
export function pinSelection(selection: KeyedSelection): boolean {
  const pinned = settingsStore.get(pinnedAtom);
  const live = settingsStore.get(liveAtom);
  if (pinned.some((pinnedSelection) => pinnedSelection.key === selection.key)) {
    return true;
  }
  const replacesLive = live?.key === selection.key;
  if (!replacesLive && pinned.length >= MAX_PINNED_SELECTIONS) {
    return false;
  }
  settingsStore.set(pinnedAtom, [...pinned, selection]);
  if (replacesLive) {
    settingsStore.set(liveAtom, null);
  }
  return true;
}

export function dismissSelection(id: string): void {
  const live = settingsStore.get(liveAtom);
  if (live?.context.id === id) {
    settingsStore.set(liveAtom, null);
    return;
  }
  const pinned = settingsStore.get(pinnedAtom);
  const remaining = pinned.filter((pinnedSelection) => pinnedSelection.context.id !== id);
  if (remaining.length !== pinned.length) {
    settingsStore.set(pinnedAtom, remaining);
  }
}

export function clearSelection(): void {
  settingsStore.set(liveAtom, null);
  settingsStore.set(pinnedAtom, NO_PINNED);
}

export function getSelectedTextContexts(): SelectedTextContext[] {
  return settingsStore.get(contextsAtom);
}

export function useSelectedTextContexts(): SelectedTextContext[] {
  return useAtomValue(contextsAtom, { store: settingsStore });
}

export function subscribeSelection(
  listener: (contexts: SelectedTextContext[]) => void
): () => void {
  return settingsStore.sub(contextsAtom, () => listener(settingsStore.get(contextsAtom)));
}
