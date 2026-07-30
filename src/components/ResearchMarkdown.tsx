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
const inlinePattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;

interface MarkdownLink {
  end: number;
  href: string;
  text: string;
}

class LineReader {
  private readonly iterator: Iterator<string>;
  private currentResult: IteratorResult<string>;
  private nextResult: IteratorResult<string>;

  constructor(source: string) {
    this.iterator = source.replace(/\r\n?/g, "\n").split("\n").values();
    this.currentResult = this.iterator.next();
    this.nextResult = this.iterator.next();
  }

  current() {
    return this.currentResult.done ? undefined : this.currentResult.value;
  }

  peek() {
    return this.nextResult.done ? undefined : this.nextResult.value;
  }

  advance() {
    this.currentResult = this.nextResult;
    this.nextResult = this.iterator.next();
  }
}

function tableCells(line: string) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string) {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function safeHref(href: string) {
  if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../') || href.startsWith('#')) return href;
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? href : '#';
  } catch {
    return '#';
  }
}

function parseLink(text: string, start: number): MarkdownLink | undefined {
  const titleEnd = text.indexOf("](", start + 1);
  if (titleEnd === -1 || titleEnd - start - 1 > 200) return undefined;

  const destinationStart = titleEnd + 2;
  const destinationEnd = text.indexOf(")", destinationStart);
  if (destinationEnd === -1) return undefined;

  const destination = text.slice(destinationStart, destinationEnd);
  const titleStart = destination.search(/\s/);
  const href = titleStart === -1 ? destination : destination.slice(0, titleStart);
  const title = titleStart === -1 ? "" : destination.slice(titleStart);
  if (href.length === 0 || href.length > 2048 || !isLinkTitle(title)) return undefined;

  return { end: destinationEnd + 1, href, text: text.slice(start + 1, titleEnd) };
}

function isLinkTitle(title: string) {
  return title === "" || (title.length <= 203 && /^\s+"[^"]{0,200}"$/.test(title));
}

function isParagraphContinuation(line: string) {
  return line.trim() !== "" && !headingPattern.test(line) && !line.startsWith("```") && !line.startsWith("|") && !unorderedPattern.test(line) && !orderedPattern.test(line);
}

function parseBlocks(source: string): Block[] {
  const lines = new LineReader(source);
  const blocks: Block[] = [];

  for (let line = lines.current(); line !== undefined; line = lines.current()) {
    if (line.trim() === "") { lines.advance(); continue; }

    const heading = line.match(headingPattern);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      lines.advance();
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      lines.advance();
      for (let codeLine = lines.current(); codeLine !== undefined && !codeLine.startsWith("```"); codeLine = lines.current()) {
        code.push(codeLine);
        lines.advance();
      }
      if (lines.current() !== undefined) lines.advance();
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    const nextLine = lines.peek();
    if (line.startsWith("|") && nextLine !== undefined && isTableSeparator(nextLine)) {
      const header = tableCells(line);
      const rows: string[][] = [];
      lines.advance();
      lines.advance();
      while (lines.current()?.startsWith("|")) {
        const row = lines.current();
        if (row === undefined) break;
        rows.push(tableCells(row));
        lines.advance();
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }
    const unordered = line.match(unorderedPattern);
    const ordered = line.match(orderedPattern);
    if (unordered ?? ordered) {
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      for (let itemLine = lines.current(); itemLine !== undefined; itemLine = lines.current()) {
        const item = itemLine.match(isOrdered ? orderedPattern : unorderedPattern);
        if (!item) break;
        items.push(item[1]);
        lines.advance();
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }
    const paragraph = [line];
    lines.advance();
    for (let paragraphLine = lines.current(); paragraphLine !== undefined && isParagraphContinuation(paragraphLine); paragraphLine = lines.current()) {
      paragraph.push(paragraphLine);
      lines.advance();
    }
    const paragraphText = paragraph.map((paragraphLine) => paragraphLine.endsWith("  ") ? `${paragraphLine.trimEnd()}\n` : paragraphLine).join(" ").replace(/\n /g, "\n");
    blocks.push({ type: "paragraph", text: paragraphText });
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let linkSearchStart = 0;
  while (linkSearchStart < text.length) {
    const start = text.indexOf("[", linkSearchStart);
    if (start === -1) break;
    const link = parseLink(text, start);
    if (!link) {
      linkSearchStart = start + 1;
      continue;
    }
    if (start > cursor) nodes.push(...inlineFormatting(text.slice(cursor, start), `text-${cursor}`));
    const href = safeHref(link.href);
    const external = /^https?:\/\//i.test(href);
    nodes.push(<a key={`link-${start}`} href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{inlineFormatting(link.text, `link-text-${start}`)}</a>);
    cursor = link.end;
    linkSearchStart = link.end;
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
