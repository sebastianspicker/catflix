export type IconName = 'play' | 'pause' | 'stop' | 'sound' | 'mute' | 'queue' | 'close' | 'arrow';

export function Icon({ name }: { name: IconName }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'play') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z" {...common} /></svg>;
  if (name === 'pause') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12" {...common} /></svg>;
  if (name === 'stop') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" {...common} /></svg>;
  if (name === 'sound') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h4l5 4V6l-5 4H5Z" {...common} /><path d="M17 9c1 1 1 5 0 6M19 7c3 3 3 7 0 10" {...common} /></svg>;
  if (name === 'mute') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h4l5 4V6l-5 4H5Z" {...common} /><path d="m17 10 4 4m0-4-4 4" {...common} /></svg>;
  if (name === 'queue') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h8M6 12h8M6 17h5" {...common} /><path d="M18 15v6m-3-3h6" {...common} /></svg>;
  if (name === 'close') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" {...common} /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" {...common} /></svg>;
}
