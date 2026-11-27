import { TooltipProvider } from "@/components/ui/tooltip";
import { useApp } from "@/context";
import { LivePreviewAdapterProvider } from "@/lib/livePreview";
import { livePreviewStub } from "@/lib/livePreviewStub";
import type { Meta, StoryObj } from "@/lib/story";
import type { ChatMessage } from "@/types/message";
import React from "react";
import ChatMessages from "./ChatMessages";

interface PlainChatProps {
  chatHistory: ChatMessage[];
}

function PlainChat({ chatHistory }: PlainChatProps) {
  const app = useApp();
  return (
    <TooltipProvider>
      <div className="tw-flex tw-h-96 tw-flex-col tw-overflow-hidden">
        <ChatMessages
          chatHistory={chatHistory}
          currentAiMessage=""
          app={app}
          onRegenerate={() => undefined}
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
      </div>
    </TooltipProvider>
  );
}

function sent(daysAgo: number, hour: number, minute: number, sender: string, text: string) {
  const now = new Date();
  const epoch = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    hour,
    minute
  ).getTime();
  return {
    id: `${sender}-${epoch}`,
    sender,
    message: text,
    isVisible: true,
    timestamp: { epoch, display: "", fileName: "" },
  };
}

const meta = {
  title: "Chat/Chat Messages",
  component: PlainChat,
  parameters: { gallery: { host: "leaf", layout: "padded" } },
} satisfies Meta<PlainChatProps>;
export default meta;

export const SpansTwoDays: StoryObj<PlainChatProps> = {
  args: {
    chatHistory: [
      sent(1, 21, 30, "user", "What did we pick for the Q4 reading list?"),
      sent(
        1,
        21,
        30,
        "AI",
        "Three books: The Order of Time, Thinking, Fast and Slow, and The Dawn of Everything."
      ),
      sent(0, 9, 9, "user", "Which one is shortest?"),
      sent(0, 9, 9, "AI", "The Order of Time, at about 240 pages. The other two run past 400."),
    ],
  },
};

// The gallery has no Obsidian editor to mount, so the story shows the raw Markdown the preview would read.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/4
const LIVE_PREVIEW_CHAT = [
  sent(0, 9, 15, "user", "Show me the table as it is written."),
  sent(0, 9, 15, "AI", "| Month | Reading |\n| --- | --- |\n| Nov | *Thinking, Fast and Slow* |"),
];

export const LivePreviewOffered: StoryObj<PlainChatProps> = {
  args: { chatHistory: LIVE_PREVIEW_CHAT },
  render: () => (
    <LivePreviewAdapterProvider adapter={livePreviewStub}>
      <PlainChat chatHistory={LIVE_PREVIEW_CHAT} />
    </LivePreviewAdapterProvider>
  ),
};
