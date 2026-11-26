import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AnnotationPanel } from "@/components/quick-ask/AnnotationPanel";

const ISSUE_3 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/3";

/* eslint-disable @eslint-react/hooks-extra/no-unnecessary-use-prefix -- mocks the real hook; name must match the export */
jest.mock("@/hooks/use-draggable", () => ({
  useDraggable: () => ({ handlePointerDown: jest.fn() }),
}));
/* eslint-enable @eslint-react/hooks-extra/no-unnecessary-use-prefix */

describe("AnnotationPanel", () => {
  describe("AnnotationPanel()", () => {
    it(`focuses the instruction input with the caret at the end of a pre-filled instruction and shows the location label (${ISSUE_3})`, () => {
      render(
        <AnnotationPanel
          locationLabel="L225-226"
          initialInstruction="Check units"
          onSubmit={jest.fn()}
          onClose={jest.fn()}
        />
      );

      const input = screen.getByLabelText<HTMLTextAreaElement>("Annotation instruction input");
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe("Check units");
      expect(input.selectionStart).toBe("Check units".length);
      expect(input.selectionEnd).toBe("Check units".length);
      expect(screen.getByText("L225-226")).toBeTruthy();
    });

    it(`disables Done until non-whitespace text is entered and submits the trimmed instruction (${ISSUE_3})`, () => {
      const onSubmit = jest.fn();
      render(<AnnotationPanel locationLabel="L12" onSubmit={onSubmit} onClose={jest.fn()} />);

      const doneButton = screen.getByRole<HTMLButtonElement>("button", { name: "Done" });
      const input = screen.getByLabelText("Annotation instruction input");
      expect(doneButton.disabled).toBe(true);

      fireEvent.change(input, { target: { value: "   " } });
      expect(doneButton.disabled).toBe(true);

      fireEvent.change(input, { target: { value: "  Explain why  " } });
      expect(doneButton.disabled).toBe(false);
      fireEvent.click(doneButton);

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith("Explain why");
    });

    it(`submits on Enter, leaves Shift+Enter as a newline, and ignores Enter during IME composition (${ISSUE_3})`, () => {
      const onSubmit = jest.fn();
      render(<AnnotationPanel locationLabel="L12" onSubmit={onSubmit} onClose={jest.fn()} />);

      const input = screen.getByLabelText("Annotation instruction input");
      fireEvent.change(input, { target: { value: "Line 1" } });

      fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
      expect(onSubmit).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: "Enter", isComposing: true });
      expect(onSubmit).not.toHaveBeenCalled();

      fireEvent.keyDown(input, { key: "Enter" });
      expect(onSubmit).toHaveBeenCalledWith("Line 1");
    });

    it(`closes without submitting on Cancel, Close, or Escape (${ISSUE_3})`, () => {
      const onSubmit = jest.fn();
      const onClose = jest.fn();
      render(
        <AnnotationPanel
          locationLabel="L12"
          initialInstruction="Draft"
          onSubmit={onSubmit}
          onClose={onClose}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      fireEvent.click(screen.getByTitle("Close"));
      fireEvent.keyDown(screen.getByLabelText("Annotation instruction input"), { key: "Escape" });

      expect(onClose).toHaveBeenCalledTimes(3);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
