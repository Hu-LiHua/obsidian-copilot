import type { NewAgentChatMessage, PromptContent } from "@/agentMode/session/types";
import { agentMentionsBlock } from "@/agents/agentMentionPrompt";
import { USER_SENDER, WEB_SELECTED_TEXT_TAG } from "@/constants";
import { ContextProcessor } from "@/contextProcessor";
import { escapeXml } from "@/LLMProviders/chainRunner/utils/xmlParsing";
import { formatDateTime } from "@/utils";
import {
  hasSelectedTextInstructions,
  isNoteSelectedTextContext,
  isWebSelectedTextContext,
  type MessageContext,
  type NoteSelectedTextContext,
} from "@/types/message";

const OPEN_TAG = "<user-message>";
const CLOSE_TAG = "</user-message>";
const DEFAULT_EXCERPT_INSTRUCTION_PROMPT =
  "Follow the instructions attached to the excerpts above.";

function excerptInstruction(excerpt: NoteSelectedTextContext): string | undefined {
  const instruction = excerpt.instruction?.trim();
  return instruction ? instruction : undefined;
}

export function stripUserMessageWrapper(content: string): string {
  const end = content.lastIndexOf(CLOSE_TAG);
  const start = end === -1 ? -1 : content.lastIndexOf(OPEN_TAG, end);
  if (start === -1 || end <= start) return content;
  return content
    .slice(start + OPEN_TAG.length, end)
    .replace(/^\n/, "")
    .replace(/\n$/, "");
}

// Some agents end the turn when a reply is cut off, mid tool call or mid text, so the plugin hands the cause back once. https://github.com/Brevilabs/obsidian-copilot-private/issues/739
export const OUTPUT_LIMIT_CONTINUATION_PROMPT =
  "Your last reply hit the output limit and was cut off, so any unfinished step did not run. Continue in smaller steps without recapping.";

type DisplayContentItem =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export function buildUserDisplayContent(
  displayText: string,
  promptContent?: PromptContent[]
): DisplayContentItem[] | undefined {
  const images = (promptContent ?? []).filter(
    (p): p is Extract<PromptContent, { type: "image" }> => p.type === "image"
  );
  if (images.length === 0) return undefined;
  const content: DisplayContentItem[] = [];
  if (displayText.trim()) content.push({ type: "text", text: displayText });
  for (const img of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${img.mimeType};base64,${img.data}` },
    });
  }
  return content;
}

export function buildUserMessage(
  id: string,
  text: string,
  context: MessageContext | undefined,
  promptContent: PromptContent[] | undefined
): NewAgentChatMessage {
  return {
    id,
    message: text,
    sender: USER_SENDER,
    timestamp: formatDateTime(new Date()),
    isVisible: true,
    context,
    content: buildUserDisplayContent(text, promptContent),
  };
}

export function buildPromptBlocks(
  displayText: string,
  context?: MessageContext,
  content?: PromptContent[],
  webTabBlock?: string,
  projectContextBlock?: string | null,
  leadingContextBlock?: string | null,
  projectContextUpdatesBlock?: string | null
): PromptContent[] {
  const sections = [
    projectContextBlock?.trim() || null,
    projectContextUpdatesBlock?.trim() || null,
    leadingContextBlock?.trim() || null,
    buildContextEnvelope(context),
    agentMentionsBlock(context?.agents),
    buildWebSelectionBlocks(context),
    webTabBlock?.trim() || null,
  ].filter((s): s is string => Boolean(s));
  const head = sections.length > 0 ? sections.join("\n\n") : null;
  // When the user submits only excerpt-attached instructions with an empty main input, supply a minimal
  // directive inside <user-message> so the turn is never an empty user prompt.
  // https://github.com/Hu-LiHua/obsidian-copilot/issues/3
  const userMessageText =
    !displayText.trim() && hasSelectedTextInstructions(context?.selectedTextContexts)
      ? DEFAULT_EXCERPT_INSTRUCTION_PROMPT
      : displayText;
  const headText = head
    ? `${head}\n\n<user-message>\n${userMessageText}\n</user-message>`
    : userMessageText;
  const extras = content ?? [];
  if (extras.length === 0) return [{ type: "text", text: headText }];
  return [{ type: "text", text: headText }, ...extras];
}

export async function serializeWebTabContext(context: MessageContext | undefined): Promise<string> {
  const webTabs = context?.webTabs;
  if (!webTabs || webTabs.length === 0) return "";
  return (await ContextProcessor.getInstance().processContextWebTabs(webTabs)).trim();
}

function buildWebSelectionBlocks(context: MessageContext | undefined): string | null {
  const selections = (context?.selectedTextContexts ?? []).filter(isWebSelectedTextContext);
  if (selections.length === 0) return null;
  return selections
    .map((s) =>
      [
        `<${WEB_SELECTED_TEXT_TAG}>`,
        `<title>${escapeXml(s.title)}</title>`,
        `<url>${escapeXml(s.url)}</url>`,
        `<content>\n${escapeXml(s.content)}\n</content>`,
        `</${WEB_SELECTED_TEXT_TAG}>`,
      ].join("\n")
    )
    .join("\n\n");
}

function buildContextEnvelope(context: MessageContext | undefined): string | null {
  if (!context) return null;
  const notePaths = (context.notes ?? []).map((n) => n.path).filter(Boolean);
  const excerpts = (context.selectedTextContexts ?? []).filter(isNoteSelectedTextContext);
  const folderPaths = (context.folders ?? []).filter(Boolean);
  if (notePaths.length === 0 && folderPaths.length === 0 && excerpts.length === 0) return null;

  const lines: string[] = [
    "<copilot-context>",
    "The user attached the following vault items as context. The vault is your current working directory; open them if you need their contents.",
  ];
  if (notePaths.length > 0) {
    lines.push("", "Notes:");
    for (const p of notePaths) lines.push(`- ${p}`);
  }
  if (folderPaths.length > 0) {
    lines.push("", "Folders:");
    for (const p of folderPaths) lines.push(`- ${p}`);
  }
  if (excerpts.length > 0) {
    const hasInstructions = excerpts.some((excerpt) => Boolean(excerptInstruction(excerpt)));
    lines.push(
      "",
      hasInstructions
        ? "Selected excerpts (already inlined; no need to re-read). Each <instruction> paired by id is a direct instruction from the user to execute on the corresponding <excerpt>, not passive background context:"
        : "Selected excerpts (already inlined; no need to re-read):"
    );
    const units = excerpts.map((excerpt, index) => {
      const id = index + 1;
      const linesAttr =
        excerpt.startLine > 0 ? ` lines="${excerpt.startLine}-${excerpt.endLine}"` : "";
      // Excerpt bodies stay unescaped so LaTeX or Markdown angle brackets reach the agent intact;
      // the closing </excerpt> tag acts as the boundary.
      // https://github.com/Hu-LiHua/obsidian-copilot/issues/3
      const body = [
        `<excerpt id="${id}" path="${escapeXml(excerpt.notePath)}"${linesAttr}>`,
        excerpt.content,
        "</excerpt>",
      ];
      const instruction = excerptInstruction(excerpt);
      if (instruction) {
        body.push(`<instruction id="${id}">${instruction}</instruction>`);
      }
      return body.join("\n");
    });
    lines.push(units.join("\n\n"));
  }
  lines.push("</copilot-context>");
  return lines.join("\n");
}

export function extractText(content: PromptContent): string {
  if (content.type === "text") return content.text;
  return "";
}
