import { evidenceThemes, type EvidenceThemeId } from '../content/evidence';
import { publicUrl } from '../paths';

interface EvidenceSectionProps {
  onOpen: (_themeId: EvidenceThemeId) => void;
}

export function EvidenceSection({ onOpen }: EvidenceSectionProps) {
  return (
    <section className="evidence-section" aria-labelledby="evidence-title">
      <div className="evidence-lead">
        <div>
          <p className="evidence-principle">Attention is observable. Enjoyment is not assumed.</p>
          <h2 id="evidence-title">What we know.<br /><span>What we don’t.</span></h2>
        </div>
        <div className="evidence-intro">
          <p>Catflix is shaped by peer-reviewed research, with the limits kept as visible as the findings.</p>
          <button type="button" onClick={() => { onOpen(evidenceThemes[0].id); }}>Read the evidence</button>
          <a href={publicUrl('/research')}>Full research record</a>
        </div>
      </div>

      <div className="evidence-summary-list" aria-label="Scientific evidence summaries">
        {evidenceThemes.map((theme) => (
          <button type="button" key={theme.id} aria-haspopup="dialog" onClick={() => { onOpen(theme.id); }}>
            <span>{theme.title}</span>
            <strong><i>TL;DR</i>{theme.tldr}</strong>
            <b aria-hidden="true">↗</b>
          </button>
        ))}
      </div>
    </section>
  );
}
