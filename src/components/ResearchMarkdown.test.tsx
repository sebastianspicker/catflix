import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ResearchMarkdown } from './ResearchMarkdown';

describe('ResearchMarkdown', () => {
  it('renders the supported research constructs without interpreting raw HTML', () => {
    const source = [
      '# Research title',
      '',
      'Status: current  ',
      'Search closed: today',
      '',
      '| Claim | Confidence |',
      '| --- | --- |',
      '| Bounded | Moderate |',
      '',
      '- **Attention** is observable.',
      '',
      '[Study](https://doi.org/example)',
      '',
      '<script>unsafe()</script>',
    ].join('\n');

    const html = renderToStaticMarkup(<ResearchMarkdown source={source} />);
    expect(html).toContain('<h1 id="research-title">Research title</h1>');
    expect(html).toContain('Status: current<br/>Search closed: today');
    expect(html).toContain('<table>');
    expect(html).toContain('<strong>Attention</strong>');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('&lt;script&gt;unsafe()&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
});
