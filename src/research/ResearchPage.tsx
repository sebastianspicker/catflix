import researchMarkdown from "../../docs/research/feline-perception.md?raw";
import { headingSlug, ResearchMarkdown } from './ResearchMarkdown';
import { publicUrl } from "../paths";

export interface ResearchPageProps {
  onBack?: () => void;
}

const contents = researchMarkdown.split('\n')
  .filter((line) => line.startsWith('## '))
  .map((line) => {
    const label = line.slice(3).trim();
    return [label, headingSlug(label)] as const;
  });

export function ResearchPage({ onBack }: ResearchPageProps) {
  return <main className="research-page">
    <header className="research-header">
      <a className="research-back-link" href={publicUrl('/')} onClick={onBack}>Back to catalogue</a>
      <p>Catflix research baseline</p>
      <strong>What we know.<br />What we don’t.</strong>
    </header>
    <div className="research-layout">
      <nav className="research-toc" aria-label="Research document contents">
        <p>On this page</p>
        <ol>{contents.map(([label, id]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ol>
      </nav>
      <article className="research-document" aria-label="Scientific foundation for Catflix curation">
        <ResearchMarkdown source={researchMarkdown} />
      </article>
    </div>
  </main>;
}
