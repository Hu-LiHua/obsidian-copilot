import { SubAgentCard } from "@/agentMode/ui/SubAgentCard";
import type { GroupedTrailNode } from "@/agentMode/ui/activityGroups";
import type { ToolCallPart } from "@/agentMode/ui/agentTrail";
import { useApp } from "@/context";
import { LivePreviewAdapterProvider } from "@/lib/livePreview";
import { LivePreviewScopeProvider } from "@/lib/livePreviewScope";
import { livePreviewStub } from "@/lib/livePreviewStub";
import type { Meta, StoryObj } from "@/lib/story";
import React from "react";

type Props = React.ComponentProps<typeof SubAgentCard>;

const SUBAGENT: ToolCallPart = {
  kind: "tool_call",
  id: "subagent-1",
  title: "Agent",
  status: "completed",
  vendorToolName: "Agent",
  input: {
    subagent_type: "general-purpose",
    description: "Count the words in Welcome.md",
    prompt: "Count the words in Welcome.md and report the number.",
  },
  output: [{ type: "text", text: "<task_result>Welcome.md has 9 words.</task_result>" }],
};

const NO_CHILDREN: GroupedTrailNode[] = [];

const meta = {
  title: "Agent Mode/Subagent Card",
  component: SubAgentCard,
  args: {
    parent: SUBAGENT,
    childNodes: NO_CHILDREN,
    renderNode: () => null,
  },
  parameters: { gallery: { host: "leaf", layout: "padded" } },
} satisfies Meta<Props>;
export default meta;

const Demo: React.FC<Partial<Props>> = ({ parent = SUBAGENT, childNodes = NO_CHILDREN }) => {
  const app = useApp();
  return <SubAgentCard parent={parent} childNodes={childNodes} app={app} renderNode={() => null} />;
};

export const PromptAndResult: StoryObj<Props> = {
  render: (args) => <Demo {...args} />,
};

export const LivePreview: StoryObj<Props> = {
  render: (args) => (
    <LivePreviewAdapterProvider adapter={livePreviewStub}>
      <LivePreviewScopeProvider livePreview>
        <Demo {...args} />
      </LivePreviewScopeProvider>
    </LivePreviewAdapterProvider>
  ),
};
