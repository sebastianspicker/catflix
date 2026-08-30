import { lazy, Suspense } from 'react';
import { Catalogue } from './catalogue/ui/Catalogue';
import { CatalogueOverlays } from './app/CatalogueOverlays';
import { useCatalogueApp } from './app/useCatalogueApp';

const Player = lazy(() => import('./encounter/ui/Player').then((module) => ({ default: module.Player })));

export function App() {
  const app = useCatalogueApp();
  if (app.active) return <Suspense fallback={<div className="player-loading" role="status">Preparing the scene…</div>}><Player plan={app.active} onSceneMotionModeChange={app.changeSceneMotionMode} onExit={app.endSession} /></Suspense>;
  return <Catalogue app={app}><CatalogueOverlays app={app} /></Catalogue>;
}
