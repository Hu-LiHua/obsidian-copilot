import { EMPTY_MIYO_PATHS } from "@/miyo/agentMode/miyoSearchRun";
import { useMiyoLinkBadges } from "@/miyo/useMiyoLinkBadges";
import { Markdown } from "@/components/Markdown";
import { useSmoothedText } from "@/hooks/useSmoothedText";
import { useLivePreviewScope } from "@/lib/livePreviewScope";
import { LivePreviewText } from "@/lib/livePreviewText";
import type { App } from "obsidian";
import React from "react";

interface AgentMarkdownTextProps {
  text: string;
  streaming?: boolean;
  app: App;
  miyoPaths?: readonly string[];
}

export const AgentMarkdownText: React.FC<AgentMarkdownTextProps> = ({
  text,
  streaming = false,
  app,
  miyoPaths = EMPTY_MIYO_PATHS,
}) => {
  const sourcePath = app.workspace.getActiveFile()?.path ?? "";
  const { markFoundLinks, badges } = useMiyoLinkBadges(app, sourcePath, miyoPaths);
  const shown = useSmoothedText(text, streaming);
  const scope = useLivePreviewScope();
  // The reply stays in Reading View wherever the host cannot mount Obsidian's editor, so a mobile chat never shows a half-working preview.
  // https://github.com/Hu-LiHua/obsidian-copilot/issues/4
  if (scope?.livePreview && scope.supported) {
    return (
      <LivePreviewText
        text={shown}
        sourcePath={sourcePath}
        className="tw-p-1 tw-text-sm"
        onError={scope.reportError}
      />
    );
  }
  return (
    <>
      <Markdown
        className="tw-p-1 tw-text-sm"
        sourcePath={sourcePath}
        text={shown}
        streaming={streaming}
        onRendered={markFoundLinks}
        runDataviewQueries
      />
      {badges}
    </>
  );
};
