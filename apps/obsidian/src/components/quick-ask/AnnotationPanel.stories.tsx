import type { Meta, StoryObj } from "@/lib/story";
import { AnnotationPanel, type AnnotationPanelProps } from "./AnnotationPanel";

const meta = {
  title: "Quick Ask/Annotation Panel",
  component: AnnotationPanel,
  args: {
    locationLabel: "L225-226",
    initialInstruction: "",
    onSubmit: () => undefined,
    onClose: () => undefined,
  },
  parameters: { gallery: { host: "popover", layout: "padded" } },
} satisfies Meta<AnnotationPanelProps>;
export default meta;

export const Empty: StoryObj<AnnotationPanelProps> = {};

export const SingleLineLocation: StoryObj<AnnotationPanelProps> = {
  args: {
    locationLabel: "L12",
    initialInstruction: "Check whether the sign matches the previous paragraph.",
  },
};

export const MultiLineDraft: StoryObj<AnnotationPanelProps> = {
  args: {
    locationLabel: "L225-234",
    initialInstruction:
      "The previous section already introduced this definition.\nKeep only the derived conclusion and highlight the boundary term.",
  },
};

export const LongInstructionOverflow: StoryObj<AnnotationPanelProps> = {
  args: {
    locationLabel: "Selection",
    initialInstruction:
      "Compare this formula with the external specification and rewrite the derivation step by step. ".repeat(
        6
      ),
  },
};
