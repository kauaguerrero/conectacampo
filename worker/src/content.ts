export interface TextContent {
  type: "text";
  text: string;
}

export function isTextContent(content: unknown): content is TextContent {
  return (
    typeof content === "object" &&
    content !== null &&
    (content as { type?: unknown }).type === "text" &&
    typeof (content as { text?: unknown }).text === "string"
  );
}

export interface PollContent {
  type: "poll";
  question: string;
  options: string[];
}

export function isPollContent(content: unknown): content is PollContent {
  if (typeof content !== "object" || content === null) {
    return false;
  }
  const candidate = content as { type?: unknown; question?: unknown; options?: unknown };
  return (
    candidate.type === "poll" &&
    typeof candidate.question === "string" &&
    Array.isArray(candidate.options) &&
    candidate.options.length >= 2 &&
    candidate.options.every((option) => typeof option === "string")
  );
}

export function isSendableContent(content: unknown): content is TextContent | PollContent {
  return isTextContent(content) || isPollContent(content);
}
