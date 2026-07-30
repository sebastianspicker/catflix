import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './editorial.css';
import './encounters.css';
import { routePathname } from './paths';

const ResearchPage = lazy(() => import('./components/ResearchPage').then((module) => ({ default: module.ResearchPage })));
const pathname = routePathname(window.location.pathname);
const isResearchRoute = pathname === '/research';

if (isResearchRoute) document.title = 'Scientific foundation — Catflix';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isResearchRoute
      ? <Suspense fallback={<main className="research-loading" role="status">Opening the research record…</main>}><ResearchPage /></Suspense>
      : <App />}
  </StrictMode>,
);
