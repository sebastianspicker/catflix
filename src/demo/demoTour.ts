import catalogueDesktop from '../../docs/screenshots/catalogue-desktop.webp';
import catalogueMobile from '../../docs/screenshots/catalogue-mobile.webp';
import safetyGate from '../../docs/screenshots/safety-gate.webp';
import tabletScene from '../../docs/screenshots/tablet-scene.webp';

export type DemoTourStop = {
  id: string;
  step: string;
  title: string;
  image: string;
  alt: string;
  caption: string;
};

export const demoTourStops: DemoTourStop[] = [
  {
    id: 'catalogue',
    step: '01',
    title: 'Browse the catalogue',
    image: catalogueDesktop,
    alt: 'Desktop catalogue listing five finite encounters',
    caption:
      'Five finite encounters with theme, subject, and rhythm filters, a local watchlist, and a curator note for each scene.',
  },
  {
    id: 'safety-gate',
    step: '02',
    title: 'Set the room',
    image: safetyGate,
    alt: 'Safety gate asking for a stable device, protected cables, a clear exit, and supervision',
    caption:
      'Playback stays locked until you choose a screen context and confirm a stable device, protected cables, a clear exit, and continuous supervision.',
  },
  {
    id: 'tablet-scene',
    step: '03',
    title: 'Watch together',
    image: tabletScene,
    alt: 'Paused tablet scene player with owner controls outside the scene',
    caption:
      'The player starts muted and keeps owner controls outside the scene, with pause, stop, and a scene-motion setting.',
  },
  {
    id: 'mobile',
    step: '04',
    title: 'Take it anywhere',
    image: catalogueMobile,
    alt: 'Catalogue at a 412 by 915 mobile viewport',
    caption: 'The same catalogue at a 412 × 915 viewport — no separate mobile app.',
  },
];
