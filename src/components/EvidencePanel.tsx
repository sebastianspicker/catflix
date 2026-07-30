import { useState } from 'react';
import { evidenceMethodNote, evidenceThemes, type EvidenceThemeId } from '../content/evidence';
import { useModalDialog } from './useModalDialog';
import { publicUrl } from '../paths';

interface EvidencePanelProps {
  initialTheme: EvidenceThemeId;
  onClose: () => void;
}

export function EvidencePanel({ initialTheme, onClose }: EvidencePanelProps) {
  const dialogRef = useModalDialog<HTMLElement>(onClose);
  const [expanded, setExpanded] = useState<Set<EvidenceThemeId>>(() => new Set([initialTheme]));

  const setThemeOpen = (themeId: EvidenceThemeId, isOpen: boolean) => {
    setExpanded((current) => {
      if (current.has(themeId) === isOpen) return current;
      const next = new Set(current);
      if (isOpen) next.add(themeId);
      else next.delete(themeId);
      return next;
    });
  };

  return (
    <div className="modal-backdrop">
      <section ref={dialogRef} className="evidence-dialog" role="dialog" aria-modal="true" aria-labelledby="evidence-dialog-title" tabIndex={-1}>
        <button className="icon-button dialog-close" type="button" aria-label="Close scientific evidence" onClick={onClose}>×</button>
        <p className="section-index">Scientific basis / Search closed 29 July 2026</p>
        <h2 id="evidence-dialog-title">What the evidence supports</h2>
        <p className="evidence-method">{evidenceMethodNote}</p>

        <div className="evidence-topics">
          {evidenceThemes.map((theme) => (
            <details key={theme.id} open={expanded.has(theme.id)} onToggle={(event) => { setThemeOpen(theme.id, event.currentTarget.open); }}>
              <summary>
                <span>{theme.title}</span>
                <strong>{theme.tldr}</strong>
                <i aria-hidden="true">+</i>
              </summary>
              <div className="evidence-topic-body">
                <p className="evidence-confidence"><span>Confidence</span>{theme.confidence}</p>
                <div className="evidence-boundaries">
                  <div><span>What this supports</span><p>{theme.supports}</p></div>
                  <div><span>What this does not show</span><p>{theme.doesNotShow}</p></div>
                </div>
                <p className="evidence-long-summary">{theme.longSummary}</p>
                <div className="evidence-sources">
                  <span>Selected studies</span>
                  <ul>{theme.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer"><b>{source.id}</b> {source.title} ({source.year})<span className="visually-hidden">, opens in a new tab</span></a></li>)}</ul>
                </div>
              </div>
            </details>
          ))}
        </div>

        <footer className="evidence-dialog-footer">
          <p>The full record includes the review method, decision table, metadata contract, limitations, and all 60 references.</p>
          <a href={publicUrl('/research')}>Read the complete research record</a>
        </footer>
      </section>
    </div>
  );
}
