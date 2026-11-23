import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useMessageDrag } from "@/hooks/useMessageDrag";

function DragRow({ text, enabled = true }: { text: string; enabled?: boolean }) {
  const drag = useMessageDrag({ text, enabled });
  return (
    <div data-testid="row" {...drag}>
      <span data-testid="label">Worked for 42s</span>
      <button data-testid="action" type="button">
        Copy
      </button>
    </div>
  );
}

function pointerDown(target: EventTarget): void {
  const event = new MouseEvent("pointerdown", {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  Object.defineProperty(event, "isPrimary", { value: true });
  act(() => {
    target.dispatchEvent(event);
  });
}

function makeDataTransfer(): DataTransfer {
  return { effectAllowed: "", setData: jest.fn() } as unknown as DataTransfer;
}

describe("useMessageDrag", () => {
  describe("useMessageDrag()", () => {
    it("https://github.com/Hu-LiHua/obsidian-copilot/issues/2 carries the reply text when a drag starts on the row", () => {
      render(<DragRow text="Reply **body**" />);
      const dataTransfer = makeDataTransfer();

      pointerDown(screen.getByTestId("label"));
      fireEvent.dragStart(screen.getByTestId("row"), { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "Reply **body**");
      expect(dataTransfer.setData).toHaveBeenCalledWith("text/markdown", "Reply **body**");
      expect(dataTransfer.effectAllowed).toBe("copy");
    });

    it("https://github.com/Hu-LiHua/obsidian-copilot/issues/2 leaves the row's buttons to their own clicks", () => {
      render(<DragRow text="Reply" />);

      pointerDown(screen.getByTestId("action"));

      expect(screen.getByTestId("row").hasAttribute("draggable")).toBe(false);
    });

    it("stops arming after the pointer is released without a drag", () => {
      render(<DragRow text="Reply" />);

      pointerDown(screen.getByTestId("label"));
      expect(screen.getByTestId("row").getAttribute("draggable")).toBe("true");

      act(() => {
        document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
      });

      expect(screen.getByTestId("row").hasAttribute("draggable")).toBe(false);
    });

    it("stays armed when a focused control blurs on the way to the message", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      render(<DragRow text="Reply" />);

      pointerDown(screen.getByTestId("label"));
      act(() => input.blur());

      expect(screen.getByTestId("row").getAttribute("draggable")).toBe("true");
      input.remove();
    });

    it("does not arm while dragging is disabled", () => {
      render(<DragRow text="Reply" enabled={false} />);

      pointerDown(screen.getByTestId("label"));

      expect(screen.getByTestId("row").hasAttribute("draggable")).toBe(false);
    });

    it("https://github.com/Hu-LiHua/obsidian-copilot/issues/2 does not arm without text to carry", () => {
      render(<DragRow text="" />);

      pointerDown(screen.getByTestId("label"));

      expect(screen.getByTestId("row").hasAttribute("draggable")).toBe(false);
    });
  });
});
