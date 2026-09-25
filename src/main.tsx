import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/base.css';
import './styles/data.css';
import './styles/editorial.css';
import './styles/encounters.css';
import './styles/owner-records.css';
import './styles/demo.css';
import { routePathname } from './paths';

const ResearchPage = lazy(() => import('./research/ResearchPage').then((module) => ({ default: module.ResearchPage })));
const DemoPage = lazy(() => import('./demo/DemoPage').then((module) => ({ default: module.DemoPage })));
const pathname = routePathname(window.location.pathname);
const isResearchRoute = pathname === '/research';
const isDemoRoute = pathname === '/demo';

if (isResearchRoute) document.title = 'Scientific foundation — Catflix';
if (isDemoRoute) document.title = 'Screenshot tour — Catflix';

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Catflix requires a root element.');

createRoot(rootElement).render(
  <StrictMode>
    {isResearchRoute
      ? <Suspense fallback={<main className="research-loading" role="status">Opening the research record…</main>}><ResearchPage /></Suspense>
      : isDemoRoute
        ? <Suspense fallback={<main className="research-loading" role="status">Opening the screenshot tour…</main>}><DemoPage /></Suspense>
        : <App />}
  </StrictMode>,
);
