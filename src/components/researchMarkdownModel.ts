export interface TableBlock {
  type: "table";
  header: string[];
  rows: string[][];
}

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string }
  | TableBlock;

export interface MarkdownLink {
  end: number;
  href: string;
  text: string;
}

const headingPattern = /^(#{1,3})\s+(.+)$/;
const unorderedPattern = /^[-*]\s+(.+)$/;
const orderedPattern = /^\d+\.\s+(.+)$/;

class LineReader {
  private readonly lines: string[];
  private index = 0;

  constructor(source: string) {
    this.lines = source.replace(/\r\n?/g, "\n").split("\n");
  }

  current(): string | undefined { return this.lines[this.index]; }
  peek(): string | undefined { return this.lines[this.index + 1]; }
  advance(): void { this.index += 1; }
}

const tableCells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());

function isTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function readCode(lines: LineReader): MarkdownBlock {
  const code: string[] = [];
  lines.advance();
  while (lines.current() !== undefined && !lines.current()?.startsWith("```")) {
    code.push(lines.current() ?? "");
    lines.advance();
  }
  if (lines.current() !== undefined) lines.advance();
  return { type: "code", text: code.join("\n") };
}

function readTable(lines: LineReader): TableBlock {
  const header = tableCells(lines.current() ?? "");
  const rows: string[][] = [];
  lines.advance();
  lines.advance();
  while (lines.current()?.startsWith("|")) {
    rows.push(tableCells(lines.current() ?? ""));
    lines.advance();
  }
  return { type: "table", header, rows };
}

function readList(lines: LineReader, ordered: boolean): MarkdownBlock {
  const pattern = ordered ? orderedPattern : unorderedPattern;
  const items: string[] = [];
  for (let match = lines.current()?.match(pattern); match; match = lines.current()?.match(pattern)) {
    items.push(match[1]);
    lines.advance();
  }
  return { type: "list", ordered, items };
}

function isParagraphContinuation(line: string): boolean {
  const beginsAnotherBlock = headingPattern.test(line)
    || line.startsWith("```")
    || line.startsWith("|")
    || unorderedPattern.test(line)
    || orderedPattern.test(line);
  return line.trim() !== "" && !beginsAnotherBlock;
}

function readParagraph(lines: LineReader): MarkdownBlock {
  const paragraph = [lines.current() ?? ""];
  lines.advance();
  while (lines.current() !== undefined && isParagraphContinuation(lines.current() ?? "")) {
    paragraph.push(lines.current() ?? "");
    lines.advance();
  }
  const text = paragraph
    .map((line) => line.endsWith("  ") ? `${line.trimEnd()}\n` : line)
    .join(" ")
    .replace(/\n /g, "\n");
  return { type: "paragraph", text };
}

function readBlock(lines: LineReader): MarkdownBlock {
  const line = lines.current() ?? "";
  const heading = line.match(headingPattern);
  if (heading) {
    lines.advance();
    return { type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] };
  }
  if (line.startsWith("```")) return readCode(lines);
  if (line.startsWith("|") && lines.peek() !== undefined && isTableSeparator(lines.peek() ?? "")) return readTable(lines);
  if (unorderedPattern.test(line)) return readList(lines, false);
  if (orderedPattern.test(line)) return readList(lines, true);
  return readParagraph(lines);
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = new LineReader(source);
  const blocks: MarkdownBlock[] = [];
  while (lines.current() !== undefined) {
    if (lines.current()?.trim() === "") {
      lines.advance();
    } else {
      blocks.push(readBlock(lines));
    }
  }
  return blocks;
}

function isLinkTitle(title: string): boolean {
  return title === "" || (title.length <= 203 && /^\s+"[^"]{0,200}"$/.test(title));
}

export function parseMarkdownLink(text: string, start: number): MarkdownLink | undefined {
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

const isRelativeHref = (href: string) => ["/", "./", "../", "#"].some((prefix) => href.startsWith(prefix));

export function safeMarkdownHref(href: string): string {
  if (isRelativeHref(href)) return href;
  try {
    return ["http:", "https:"].includes(new URL(href).protocol) ? href : "#";
  } catch {
    return "#";
  }
}
