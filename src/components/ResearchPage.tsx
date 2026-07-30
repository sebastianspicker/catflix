import researchMarkdown from "../../docs/research/feline-perception.md?raw";
import { ResearchMarkdown } from "./ResearchMarkdown";

export interface ResearchPageProps {
  onBack?: () => void;
}

const contents = [
  ["Executive conclusion", "executive-conclusion"],
  ["Executive decision table", "executive-decision-table"],
  ["Method", "method"],
  ["Evidence map", "evidence-map"],
  ["Synthesis by decision area", "synthesis-by-decision-area"],
  ["Curation metadata contract", "curation-metadata-contract"],
  ["Playback and safety principles", "playback-and-safety-principles"],
  ["Household observation protocol", "household-observation-protocol-for-arri-ozzy-and-mika"],
  ["Product claim rules", "product-claim-rules"],
  ["Limitations and research gaps", "limitations-and-research-gaps"],
  ["Numbered bibliography", "numbered-bibliography"],
] as const;

export function ResearchPage({ onBack }: ResearchPageProps) {
  return <main className="research-page">
    <header className="research-header">
      <a className="research-back-link" href="/" onClick={onBack}>Back to catalogue</a>
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
