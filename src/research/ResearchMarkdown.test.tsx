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
      const character = source.charAt(destinationEnd);
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

function rendersMarkup(markup: string, expectedMarkup: string): boolean {
  return markup.includes(expectedMarkup);
}

describe('research markdown safety', () => {
  it('does not enable raw HTML and makes unsafe links inert', () => {
    const scriptMarkup = '<script>alert(1)</script>';
    const renderedMarkup = renderToStaticMarkup(createElement(ResearchMarkdown, {
      source: scriptMarkup,
    }));
    expect(rendersMarkup(renderedMarkup, scriptMarkup)).toBe(false);

    const unsafeLinkMarkup = renderToStaticMarkup(createElement(ResearchMarkdown, {
      source: '[bad](javascript:alert(1)) [data](data:text/html,unsafe) [mail](mailto:research@example.test)',
    }));
    expect(renderedHrefs(unsafeLinkMarkup)).toEqual(['#', '#', '#']);
  });

  it('renders CommonMark and GFM blocks with safe external links', () => {
    const markdownInput = '# Finding\n\n- one\n- two\n\n1. first\n2. second\n\n> limited finding\n\n| Study | Result |\n| --- | --- |\n| COL-05 | visible |\n\n```\nplain <code>\n```\n\n[COL-05 DOI](https://doi.org/10.1126/science.628838)';
    const renderedMarkup = renderToStaticMarkup(createElement(ResearchMarkdown, {
      source: markdownInput,
    }));
    const expectedMarkup = ['<h1 id="finding">Finding</h1>', '<ul>', '<ol>', '<blockquote>', '<table>', '<pre><code>plain &lt;code&gt;', 'href="https://doi.org/10.1126/science.628838"', 'target="_blank"', 'rel="noreferrer"'];
    expect(expectedMarkup.every((expected) => rendersMarkup(renderedMarkup, expected))).toBe(true);
  });

  it('preserves every source href in the authored research corpus', () => {
    const sourceHrefs = markdownHrefs(researchMarkdown);
    const renderedMarkup = renderToStaticMarkup(createElement(ResearchMarkdown, { source: researchMarkdown }));

    expect(sourceHrefs).toHaveLength(60);
    expect(sourceHrefs).toContain('https://doi.org/10.1016/S0003-3472(85)80073-7');
    expect(renderedHrefs(renderedMarkup)).toEqual(sourceHrefs);
  });
});
