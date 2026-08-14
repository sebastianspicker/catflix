import { ResearchMarkdownRenderer } from "./ResearchMarkdownRenderer";

export function ResearchMarkdown({ source }: { source: string }) {
  return <ResearchMarkdownRenderer source={source} />;
}
