import { lazy, Suspense } from 'react';
import { Catalogue } from './app/Catalogue';
import { useCatalogueApp } from './app/useCatalogueApp';

const Player = lazy(() => import('./components/Player').then((module) => ({ default: module.Player })));

export function App() {
  const app = useCatalogueApp();
  if (app.active) return <Suspense fallback={<div className="player-loading" role="status">Preparing the scene…</div>}><Player plan={app.active} onSceneMotionModeChange={app.changeSceneMotionMode} onExit={app.endSession} /></Suspense>;
  return <Catalogue app={app} />;
}
