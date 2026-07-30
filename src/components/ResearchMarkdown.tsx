import type { ReactNode } from "react";

interface ResearchMarkdownProps {
  source: string;
}

interface TableBlock {
  type: "table";
  header: string[];
  rows: string[][];
}

type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string }
  | TableBlock;

const headingSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const headingPattern = /^(#{1,3})\s+(.+)$/;
const unorderedPattern = /^[-*]\s+(.+)$/;
const orderedPattern = /^\d+\.\s+(.+)$/;
const linkPattern = /\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g;
const inlinePattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

function tableCells(line: string) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") { index += 1; continue; }

    const heading = line.match(headingPattern);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      index += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (line.startsWith("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const header = tableCells(line);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].startsWith("|")) rows.push(tableCells(lines[index++]));
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const unordered = line.match(unorderedPattern);
    const ordered = line.match(orderedPattern);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(isOrdered ? orderedPattern : unorderedPattern);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() !== "" && !headingPattern.test(lines[index]) && !lines[index].startsWith("```") && !lines[index].startsWith("|") && !unorderedPattern.test(lines[index]) && !orderedPattern.test(lines[index])) paragraph.push(lines[index++]);
    const paragraphText = paragraph.map((paragraphLine) => paragraphLine.endsWith("  ") ? `${paragraphLine.trimEnd()}\n` : paragraphLine).join(" ").replace(/\n /g, "\n");
    blocks.push({ type: "paragraph", text: paragraphText });
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(linkPattern)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(...inlineFormatting(text.slice(cursor, start), `text-${cursor}`));
    const href = match[2];
    const external = /^https?:\/\//i.test(href);
    nodes.push(<a key={`link-${start}`} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{inlineFormatting(match[1], `link-text-${start}`)}</a>);
    cursor = start + match[0].length;
  }
  if (cursor < text.length) nodes.push(...inlineFormatting(text.slice(cursor), `text-${cursor}`));
  return nodes;
}

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

export function ResearchMarkdown({ source }: ResearchMarkdownProps) {
  return <>{parseBlocks(source).map((block, index) => {
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
  })}</>;
}
