import { demoTourStops } from './demoTour';
import { DemoTourStopCard } from './DemoTourStopCard';
import { publicUrl } from '../paths';

const repositoryUrl = 'https://github.com/sebastianspicker/catflix';

export function DemoPage() {
  return (
    <main className="demo-page">
      <header className="demo-header">
        <p className="section-index">Catflix demo</p>
        <h1>Screenshot tour</h1>
        <p className="demo-lead">
          Four surfaces, one browser tab. Every screen below is the shipped app — no
          mockups. Records stay on the device, playback is finite, and the encounter
          ends on its own.
        </p>
        <nav className="demo-actions" aria-label="Demo links">
          <a className="demo-primary" href={publicUrl('/')}>Open the catalogue</a>
          <a href={publicUrl('/research')}>Read the research record</a>
          <a href={repositoryUrl}>View the source</a>
        </nav>
      </header>
      <ol className="demo-tour">
        {demoTourStops.map((stop) => <DemoTourStopCard key={stop.id} stop={stop} />)}
      </ol>
      <p className="demo-footnote">
        Screens were captured at desktop, tablet, and 412 × 915 viewports. See the
        checked-in <a href={`${repositoryUrl}/blob/main/docs/SCREENSHOTS.md`}>screenshot gallery</a> for the same set.
      </p>
    </main>
  );
}
