import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/editorial.css';
import './styles/encounters.css';
import { routePathname } from './paths';

const ResearchPage = lazy(() => import('./research/ResearchPage').then((module) => ({ default: module.ResearchPage })));
const pathname = routePathname(window.location.pathname);
const isResearchRoute = pathname === '/research';

if (isResearchRoute) document.title = 'Scientific foundation — Catflix';

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Catflix requires a root element.');

createRoot(rootElement).render(
  <StrictMode>
    {isResearchRoute
      ? <Suspense fallback={<main className="research-loading" role="status">Opening the research record…</main>}><ResearchPage /></Suspense>
      : <App />}
  </StrictMode>,
);
