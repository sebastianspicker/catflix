import type { ReactNode } from "react";
import { parseMarkdownBlocks, parseMarkdownLink, safeMarkdownHref, type MarkdownBlock } from "./researchMarkdownModel";

const inlinePattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
const headingSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function inlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.flatMap((line, lineIndex) => {
    const formatted = line.split(inlinePattern).filter(Boolean).map((part, index) => {
      const key = `${keyPrefix}-${lineIndex}-${index}`;
      if (part.startsWith("**") && part.endsWith("**")) return <strong key={key}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("`") && part.endsWith("`")) return <code key={key}>{part.slice(1, -1)}</code>;
      if (part.startsWith("*") && part.endsWith("*")) return <em key={key}>{part.slice(1, -1)}</em>;
      return part;
    });
    return lineIndex < lines.length - 1 ? [...formatted, <br key={`${keyPrefix}-break-${lineIndex}`} />] : formatted;
  });
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let searchStart = 0;
  while (searchStart < text.length) {
    const start = text.indexOf("[", searchStart);
    if (start === -1) break;
    const link = parseMarkdownLink(text, start);
    if (!link) { searchStart = start + 1; continue; }
    if (start > cursor) nodes.push(...inlineFormatting(text.slice(cursor, start), `text-${cursor}`));
    const href = safeMarkdownHref(link.href);
    const external = /^https?:\/\//i.test(href);
    nodes.push(<a key={`link-${start}`} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{inlineFormatting(link.text, `link-text-${start}`)}</a>);
    cursor = link.end;
    searchStart = link.end;
  }
  if (cursor < text.length) nodes.push(...inlineFormatting(text.slice(cursor), `text-${cursor}`));
  return nodes;
}

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  if (block.type === "heading") {
    const Heading = `h${block.level}` as "h1" | "h2" | "h3";
    return <Heading id={headingSlug(block.text)} key={`heading-${index}`}>{inline(block.text)}</Heading>;
  }
  if (block.type === "paragraph") return <p key={`paragraph-${index}`}>{inline(block.text)}</p>;
  if (block.type === "code") return <pre key={`code-${index}`}><code>{block.text}</code></pre>;
  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";
    return <List key={`list-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</List>;
  }
  return <div className="research-table-wrap" key={`table-${index}`}><table><thead><tr>{block.header.map((cell, cellIndex) => <th key={cellIndex} scope="col">{inline(cell)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
}

export function ResearchMarkdownRenderer({ source }: { source: string }) {
  return <>{parseMarkdownBlocks(source).map(renderBlock)}</>;
}
