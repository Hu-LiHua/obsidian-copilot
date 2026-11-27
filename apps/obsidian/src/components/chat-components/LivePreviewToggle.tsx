import { MessageActionButton } from "@/components/chat-components/MessageActionButton";
import { useLivePreviewScope } from "@/lib/livePreviewScope";
import { BookOpen, Eye } from "lucide-react";
import React from "react";

// The button names the view it switches to, the way Obsidian's own preview command does.
// https://github.com/Hu-LiHua/obsidian-copilot/issues/5
export const LivePreviewToggle: React.FC = () => {
  const scope = useLivePreviewScope();
  if (!scope?.supported) return null;
  const label = scope.livePreview ? "Reading View" : "Live Preview";
  const Icon = scope.livePreview ? BookOpen : Eye;
  return <MessageActionButton label={label} icon={Icon} onClick={scope.toggle} />;
};
