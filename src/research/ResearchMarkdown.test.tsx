import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import researchMarkdown from '../../docs/research/feline-perception.md?raw';
import { ResearchMarkdown } from './ResearchMarkdown';

function markdownHrefs(source: string): string[] {
  const hrefs: string[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const linkStart = source.indexOf('](', cursor);
    if (linkStart === -1) break;

    const destinationStart = linkStart + 2;
    let depth = 0;
    let destinationEnd = destinationStart;
    for (; destinationEnd < source.length; destinationEnd += 1) {
      const character = source[destinationEnd];
      if (character === '(') depth += 1;
      if (character === ')') {
        if (depth === 0) break;
        depth -= 1;
      }
    }

    if (destinationEnd === source.length) break;
    hrefs.push(source.slice(destinationStart, destinationEnd));
    cursor = destinationEnd + 1;
  }

  return hrefs;
}

function renderedHrefs(html: string): string[] {
  return [...html.matchAll(/<a href="([^"]*)"/g)].map((match) => match[1]);
}

describe('research markdown safety', () => {
  it('does not enable raw HTML and makes unsafe links inert', () => {
    const rawHtml = renderToStaticMarkup(createElement(ResearchMarkdown, {
      source: '<script>alert(1)</script>',
    }));
    expect(rawHtml).not.toContain('<script>');

    const unsafeLinks = renderToStaticMarkup(createElement(ResearchMarkdown, {
      source: '[bad](javascript:alert(1)) [data](data:text/html,unsafe) [mail](mailto:research@example.test)',
    }));
    expect(renderedHrefs(unsafeLinks)).toEqual(['#', '#', '#']);
  });

  it('renders CommonMark and GFM blocks with safe external links', () => {
    const html = renderToStaticMarkup(createElement(ResearchMarkdown, {
      source: '# Finding\n\n- one\n- two\n\n1. first\n2. second\n\n> limited finding\n\n| Study | Result |\n| --- | --- |\n| COL-05 | visible |\n\n```\nplain <code>\n```\n\n[COL-05 DOI](https://doi.org/10.1126/science.628838)',
    }));
    expect(html).toContain('<h1 id="finding">Finding</h1>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<blockquote>');
    expect(html).toContain('<table>');
    expect(html).toContain('<pre><code>plain &lt;code&gt;');
    expect(html).toContain('href="https://doi.org/10.1126/science.628838"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
  });

  it('preserves every source href in the authored research corpus', () => {
    const sourceHrefs = markdownHrefs(researchMarkdown);
    const html = renderToStaticMarkup(createElement(ResearchMarkdown, { source: researchMarkdown }));

    expect(sourceHrefs).toHaveLength(60);
    expect(sourceHrefs).toContain('https://doi.org/10.1016/S0003-3472(85)80073-7');
    expect(renderedHrefs(html)).toEqual(sourceHrefs);
  });
});
