import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownAstNode = {
  children?: MarkdownAstNode[];
  value?: string;
};

const relativeHrefPrefixes = ['/', './', '../', '#'];

function safeMarkdownHref(href: string): string {
  if (relativeHrefPrefixes.some((prefix) => href.startsWith(prefix))) return href;

  try {
    return ['http:', 'https:'].includes(new URL(href).protocol) ? href : '#';
  } catch {
    return '#';
  }
}

function headingSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function markdownNodeText(node: unknown): string {
  if (typeof node !== 'object' || node === null) return '';

  const markdownNode = node as MarkdownAstNode;
  if (typeof markdownNode.value === 'string') return markdownNode.value;
  return markdownNode.children?.map(markdownNodeText).join('') ?? '';
}

const components: Components = {
  a: ({ children, href, ...props }) => {
    const anchorProps = { ...props };
    delete anchorProps.node;
    const safeHref = safeMarkdownHref(href ?? '');
    const isExternal = /^https?:\/\//i.test(safeHref);

    return <a {...anchorProps} href={safeHref} {...(isExternal ? { rel: 'noreferrer', target: '_blank' } : {})}>{children}</a>;
  },
  h1: ({ children, node, ...props }) => <h1 {...props} id={headingSlug(markdownNodeText(node))}>{children}</h1>,
  h2: ({ children, node, ...props }) => <h2 {...props} id={headingSlug(markdownNodeText(node))}>{children}</h2>,
  h3: ({ children, node, ...props }) => <h3 {...props} id={headingSlug(markdownNodeText(node))}>{children}</h3>,
  table: ({ children, ...props }) => {
    const tableProps = { ...props };
    delete tableProps.node;
    return <div className="research-table-wrap"><table {...tableProps}>{children}</table></div>;
  },
};

export function ResearchMarkdown({ source }: { source: string }) {
  return <ReactMarkdown components={components} remarkPlugins={[remarkGfm]} skipHtml urlTransform={safeMarkdownHref}>{source}</ReactMarkdown>;
}
