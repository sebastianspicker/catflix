import { lazy, Suspense } from 'react';
import { Catalogue } from './catalogue/ui/Catalogue';
import { CatalogueOverlays } from './app/CatalogueOverlays';
import { useCatalogueApp } from './app/useCatalogueApp';

const Player = lazy(() => import('./encounter/ui/Player').then((module) => ({ default: module.Player })));

export function App() {
  const app = useCatalogueApp();
  const content = app.active ? <Suspense fallback={<div className="player-loading" role="status">Preparing the scene…</div>}><Player plan={app.active} onSceneMotionModeChange={app.changeSceneMotionMode} onExit={app.endSession} /></Suspense> : <Catalogue app={app}><CatalogueOverlays app={app} /></Catalogue>;
  return <>{app.persistenceError ? <div className="storage-warning persistence-alert" role="alert"><span>Local data was not saved: {app.persistenceError}</span><button type="button" onClick={app.dismissPersistenceError} aria-label="Dismiss local data alert">Dismiss</button></div> : null}{content}</>;
}
