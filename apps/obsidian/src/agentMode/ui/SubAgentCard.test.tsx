import { SubAgentCard } from "@/agentMode/ui/SubAgentCard";
import type { ToolCallPart } from "@/agentMode/ui/agentTrail";
import { AppContext } from "@/context";
import { LivePreviewAdapterProvider, type LivePreviewAdapter } from "@/lib/livePreview";
import { LivePreviewScopeProvider } from "@/lib/livePreviewScope";
import { fakeLivePreviewAdapter } from "@/lib/testing/fakeLivePreviewAdapter";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "obsidian";
import React from "react";

jest.mock("@/utils/renderMarkdown", () => ({
  renderMarkdown: jest.fn(async (_app: unknown, text: string, target: HTMLElement) => {
    target.textContent = text;
  }),
}));

const { renderMarkdown: renderMarkdownMock } = jest.requireMock<{
  renderMarkdown: jest.Mock;
}>("@/utils/renderMarkdown");

const PROMPT = "Count the words in Welcome.md";
const RESULT = "Welcome.md has 9 words.";

const PARENT: ToolCallPart = {
  kind: "tool_call",
  id: "call-1",
  title: "Agent",
  status: "completed",
  vendorToolName: "Agent",
  input: { prompt: PROMPT, subagent_type: "general-purpose" },
  output: [{ type: "text", text: `<task_result>${RESULT}</task_result>` }],
};

function renderCard(adapter: LivePreviewAdapter | null, livePreview: boolean) {
  const app = new App();
  render(
    <AppContext.Provider value={app}>
      <LivePreviewAdapterProvider adapter={adapter}>
        <LivePreviewScopeProvider livePreview={livePreview}>
          <SubAgentCard parent={PARENT} childNodes={[]} app={app} renderNode={() => null} />
        </LivePreviewScopeProvider>
      </LivePreviewAdapterProvider>
    </AppContext.Provider>
  );
  fireEvent.click(screen.getByRole("button", { expanded: false }));
  fireEvent.click(screen.getByText("Prompt"));
}

describe("SubAgentCard", () => {
  describe("SubAgentCard()", () => {
    it("shows the subagent's prompt and result in Live Preview with the response around it (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", async () => {
      const adapter = fakeLivePreviewAdapter();

      renderCard(adapter, true);

      await waitFor(() => expect(adapter.mounts).toHaveLength(2));
      expect(adapter.mounts.map((mount) => mount.text)).toEqual(
        expect.arrayContaining([PROMPT, RESULT])
      );
      expect(renderMarkdownMock).not.toHaveBeenCalled();
    });

    it("keeps the subagent's prompt and result in Reading View where the host has no Live Preview (https://github.com/Hu-LiHua/obsidian-copilot/issues/5)", async () => {
      renderCard(null, true);

      await waitFor(() => expect(renderMarkdownMock).toHaveBeenCalledTimes(2));
      expect(renderMarkdownMock.mock.calls.map((call) => call[1])).toEqual(
        expect.arrayContaining([PROMPT, RESULT])
      );
    });
  });
});
