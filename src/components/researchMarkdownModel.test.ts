import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ResearchMarkdown } from './ResearchMarkdown';
import { parseMarkdownBlocks, safeMarkdownHref } from './researchMarkdownModel';

describe('research markdown safety', () => {
  it('keeps raw script literal and makes javascript-like links inert', () => {
    const [block] = parseMarkdownBlocks('<script>alert(1)</script> [bad](javascript:alert(1))');
    expect(block).toEqual({ type: 'paragraph', text: '<script>alert(1)</script> [bad](javascript:alert(1))' });
    expect(safeMarkdownHref('javascript:alert(1)')).toBe('#');
    expect(safeMarkdownHref('data:text/html,unsafe')).toBe('#');
    expect(safeMarkdownHref('https://evidence.example/source')).toBe('https://evidence.example/source');

    const html = renderToStaticMarkup(createElement(ResearchMarkdown, {
      source: '<script>alert(1)</script> [bad](javascript:alert(1))',
    }));
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('href="#"');
  });
});
