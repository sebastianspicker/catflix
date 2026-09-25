import type { DemoTourStop } from './demoTour';

export function DemoTourStopCard({ stop }: { stop: DemoTourStop }) {
  return (
    <li className="demo-stop" id={stop.id}>
      <div className="demo-stop-copy">
        <span className="demo-step" aria-hidden="true">{stop.step}</span>
        <h2>{stop.title}</h2>
        <p>{stop.caption}</p>
      </div>
      <img src={stop.image} alt={stop.alt} loading="lazy" decoding="async" />
    </li>
  );
}
