/** Quiet decorative marks for human-facing catalogue and observation surfaces. */
export function CatDoodle({ pose, className }: { pose: 'peek' | 'curl' | 'loaf'; className?: string }) {
  return <svg className={className} viewBox="0 0 100 72" width="100" height="72" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {pose === 'curl' ? <>
      <path d="M43 31C49 8 82 9 90 31c9 23-7 33-26 29M71 38c-17-4-16 19-2 17 10-1 12-12 6-17" />
      <path d="M17 44l-1-17 13 9c5-2 10-2 15 0l11-10 1 18c10 20-8 23-22 22-18 0-26-7-17-22Z" />
    </> : <>
      {pose === 'loaf' ? <path d="M34 41C4 40 4 67 25 66h45c12-1 14-11 7-17M32 62l1 4m24-4-1 4" /> : null}
      <path d="M26 36l2-23c1-3 3-3 5 0l10 12c5-2 10-2 15 0l10-12c2-3 4-3 5 0l2 23c10 20-4 28-24 28S16 55 26 36Z" />
    </>}
    <g transform={pose === 'curl' ? 'translate(-13 12)' : undefined}>
      <path d="M36 43l3 2 3-2m17 0 3 2 3-2M45 51q3 6 6 0 3 6 6 0M24 43l-7-2m7 7-7 1m59-6 7-2m-7 7 7 1" />
      <path d="M49 48h4l-2 2Z" fill="currentColor" strokeWidth="1" />
    </g>
  </svg>;
}
