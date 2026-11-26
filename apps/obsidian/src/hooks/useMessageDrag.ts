import { useCallback, useEffect, useRef } from "react";
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from "react";

const INTERACTIVE_TARGETS = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
].join(",");

function isBackgroundTarget(target: EventTarget | null, surface: HTMLElement): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target === surface || target.closest(INTERACTIVE_TARGETS) === null;
}

export interface UseMessageDragOptions {
  text: string;
  enabled?: boolean;
}

export interface MessageDragHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onDragStart: (event: ReactDragEvent<HTMLElement>) => void;
}

export function useMessageDrag({
  text,
  enabled = true,
}: UseMessageDragOptions): MessageDragHandlers {
  const armedSurfaceRef = useRef<HTMLElement | null>(null);
  const removeListenersRef = useRef<(() => void) | null>(null);
  const active = enabled && text.length > 0;

  const disarm = useCallback(() => {
    armedSurfaceRef.current?.removeAttribute("draggable");
    armedSurfaceRef.current = null;
    removeListenersRef.current?.();
    removeListenersRef.current = null;
  }, []);

  useEffect(() => disarm, [disarm]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!active || event.defaultPrevented || event.button !== 0 || event.isPrimary === false) {
        return;
      }
      if (!isBackgroundTarget(event.target, event.currentTarget)) return;

      const surface = event.currentTarget;
      disarm();
      armedSurfaceRef.current = surface;
      surface.setAttribute("draggable", "true");

      const stop = () => disarm();
      const stopOnWindowBlur = (event: Event) => {
        if (event.target === window) stop();
      };
      window.addEventListener("pointerup", stop, true);
      window.addEventListener("pointercancel", stop, true);
      window.addEventListener("dragend", stop, true);
      window.addEventListener("blur", stopOnWindowBlur);
      removeListenersRef.current = () => {
        window.removeEventListener("pointerup", stop, true);
        window.removeEventListener("pointercancel", stop, true);
        window.removeEventListener("dragend", stop, true);
        window.removeEventListener("blur", stopOnWindowBlur);
      };
    },
    [active, disarm]
  );

  const onDragStart = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      if (!active || armedSurfaceRef.current !== event.currentTarget) {
        event.preventDefault();
        return;
      }
      const dataTransfer = event.dataTransfer;
      if (!dataTransfer) return;
      dataTransfer.effectAllowed = "copy";
      dataTransfer.setData("text/plain", text);
      dataTransfer.setData("text/markdown", text);
    },
    [active, text]
  );

  return { onPointerDown, onDragStart };
}
