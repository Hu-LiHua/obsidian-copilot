import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { act, fireEvent, waitFor, within } from "@testing-library/react";
import { QuickAskOverlay } from "@/components/quick-ask/QuickAskOverlay";
import { QuickAskController } from "@/editor/quickAskController";
import { quickAskWidgetEffect } from "@/editor/quickAskExtension";
import { SelectionHighlight } from "@/editor/selectionHighlight";
import type CopilotPlugin from "@/main";

const ISSUE_3 = "https://github.com/Hu-LiHua/obsidian-copilot/issues/3";

function fakeView(text: string): {
  view: EditorView;
  dispatched: Array<{ effects?: unknown[] }>;
  focus: jest.Mock;
} {
  const state = EditorState.create({ doc: text });
  const dispatched: Array<{ effects?: unknown[] }> = [];
  const focus = jest.fn();
  const view = {
    state,
    focus,
    dispatch: jest.fn((spec: { effects?: unknown[] }) => {
      dispatched.push(spec);
    }),
  } as unknown as EditorView;
  return { view, dispatched, focus };
}

describe("quickAskController", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("QuickAskController", () => {
    describe("showAnnotation()", () => {
      it(`opens the annotation overlay anchored to the selection with a persistent highlight (${ISSUE_3})`, () => {
        const controller = new QuickAskController({} as CopilotPlugin);
        const { view, dispatched } = fakeView("First line\nSecond line");

        controller.showAnnotation({
          view,
          from: 0,
          to: 10,
          locationLabel: "L1",
          onSubmit: jest.fn(),
        });

        expect(dispatched).toHaveLength(1);
        const effects = dispatched[0].effects ?? [];
        const widgetEffect = effects
          .filter((effect) =>
            (effect as { is?: (type: unknown) => boolean }).is?.(quickAskWidgetEffect)
          )
          .pop() as
          | {
              value?: {
                bottomAnchorPos: number;
                topAnchorPos: number;
                options: { renderPanel?: unknown };
              };
            }
          | undefined;
        expect(widgetEffect?.value?.topAnchorPos).toBe(0);
        expect(widgetEffect?.value?.bottomAnchorPos).toBe(10);
        expect(typeof widgetEffect?.value?.options.renderPanel).toBe("function");

        const highlightEffects = SelectionHighlight.buildEffects(view, { from: 0, to: 10 });
        expect(effects.length).toBeGreaterThanOrEqual(1 + highlightEffects.length);
      });

      it(`closes the overlay, clears the highlight, and returns focus to the editor on submit (${ISSUE_3})`, () => {
        const closeOverlay = jest.spyOn(QuickAskOverlay, "closeCurrentWithAnimation");
        const controller = new QuickAskController({} as CopilotPlugin);
        const { view, dispatched, focus } = fakeView("First line\nSecond line");
        const onSubmit = jest.fn(() => true);

        controller.showAnnotation({
          view,
          from: 0,
          to: 10,
          locationLabel: "L1",
          onSubmit,
        });

        const effects = dispatched[0].effects ?? [];
        const widgetEffect = effects
          .filter((effect) =>
            (effect as { is?: (type: unknown) => boolean }).is?.(quickAskWidgetEffect)
          )
          .pop() as {
          value: {
            options: {
              onClose: () => void;
              renderPanel: (ctx: { onClose: () => void }) => {
                props: { onSubmit: (instruction: string) => void };
              };
            };
          };
        };

        const closeSpy = jest.fn(() => widgetEffect.value.options.onClose());
        const element = widgetEffect.value.options.renderPanel({ onClose: closeSpy });
        element.props.onSubmit("Check units");

        expect(onSubmit).toHaveBeenCalledWith("Check units");
        expect(closeSpy).toHaveBeenCalledTimes(1);
        expect(focus).toHaveBeenCalledTimes(1);
        expect(dispatched).toHaveLength(2);
        const closeEffects = dispatched[1].effects ?? [];
        const clearedWidget = closeEffects
          .filter((effect) =>
            (effect as { is?: (type: unknown) => boolean }).is?.(quickAskWidgetEffect)
          )
          .pop() as { value: unknown } | undefined;
        expect(clearedWidget?.value).toBeNull();
        expect(closeOverlay).not.toHaveBeenCalled();
      });

      it(`keeps the annotation overlay open when onSubmit returns false (${ISSUE_3})`, () => {
        const controller = new QuickAskController({} as CopilotPlugin);
        const { view, dispatched, focus } = fakeView("First line");
        const onSubmit = jest.fn(() => false);

        controller.showAnnotation({
          view,
          from: 0,
          to: 5,
          locationLabel: "L1",
          onSubmit,
        });

        const effects = dispatched[0].effects ?? [];
        const widgetEffect = effects
          .filter((effect) =>
            (effect as { is?: (type: unknown) => boolean }).is?.(quickAskWidgetEffect)
          )
          .pop() as {
          value: {
            options: {
              onClose: () => void;
              renderPanel: (ctx: { onClose: () => void }) => {
                props: { onSubmit: (instruction: string) => void };
              };
            };
          };
        };

        const closeSpy = jest.fn(() => widgetEffect.value.options.onClose());
        const element = widgetEffect.value.options.renderPanel({ onClose: closeSpy });
        element.props.onSubmit("Over limit");

        expect(onSubmit).toHaveBeenCalledWith("Over limit");
        expect(closeSpy).not.toHaveBeenCalled();
        expect(focus).not.toHaveBeenCalled();
        expect(dispatched).toHaveLength(1);
      });

      it(`mounts the annotation input inside a real EditorView and submits the entered instruction (${ISSUE_3})`, async () => {
        const controller = new QuickAskController({ app: {} } as CopilotPlugin);
        const parent = document.createElement("div");
        document.body.appendChild(parent);
        const view = new EditorView({
          state: EditorState.create({
            doc: "First line\nSecond line",
            extensions: [controller.createExtension()],
          }),
          parent,
        });
        jest
          .spyOn(view, "coordsAtPos")
          .mockReturnValue({ left: 10, right: 80, top: 20, bottom: 40 });
        const onSubmit = jest.fn(() => true);

        try {
          act(() => {
            controller.showAnnotation({
              view,
              from: 0,
              to: 10,
              locationLabel: "L1",
              onSubmit,
            });
          });

          const input = await within(view.dom).findByLabelText<HTMLTextAreaElement>(
            "Annotation instruction input"
          );
          expect(document.activeElement).toBe(input);

          fireEvent.change(input, { target: { value: "Clarify this" } });
          fireEvent.keyDown(input, { key: "Enter" });

          expect(onSubmit).toHaveBeenCalledWith("Clarify this");
          await waitFor(() => {
            expect(within(view.dom).queryByLabelText("Annotation instruction input")).toBeNull();
          });
        } finally {
          view.destroy();
          parent.remove();
        }
      });
    });
  });
});
