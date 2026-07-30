import { useState } from 'react';
import type { ContentManifest, VariantSelection } from '../content/types';
import { useModalDialog } from './useModalDialog';

export type ComparisonDimension = 'contrast' | 'motion' | 'sound' | 'novelty';

interface CuratorPanelProps {
  manifests: ContentManifest[];
  onClose: () => void;
  onStart: (_sceneId: ContentManifest['id'], _variant: VariantSelection, _comparison: { dimension: ComparisonDimension; label: string }) => void;
}

function variantFor(dimension: ComparisonDimension, order: 'a' | 'b'): VariantSelection {
  const variant: VariantSelection = { figureGround: 'natural', motion: 'continuous', sound: 'off', novelty: 'familiar' };
  if (order === 'a') return variant;
  if (dimension === 'contrast') variant.figureGround = 'enhanced';
  if (dimension === 'motion') variant.motion = 'intermittent';
  if (dimension === 'sound') variant.sound = 'on';
  if (dimension === 'novelty') variant.novelty = 'alternate';
  return variant;
}

function dimensionLabel(dimension: ComparisonDimension) {
  if (dimension === 'motion') return 'Motion intermittency';
  if (dimension === 'sound') return 'Coherent sound';
  return dimension;
}

export function CuratorPanel({ manifests, onClose, onStart }: CuratorPanelProps) {
  const [sceneId, setSceneId] = useState(manifests[0].id);
  const [dimension, setDimension] = useState<ComparisonDimension>('contrast');
  const [order, setOrder] = useState<'a' | 'b'>('a');
  const dialogRef = useModalDialog<HTMLElement>(onClose);
  const variant = variantFor(dimension, order);

  return (
    <div className="modal-backdrop" role="presentation">
      <section ref={dialogRef} className="curator-dialog" role="dialog" aria-modal="true" aria-labelledby="curator-title" tabIndex={-1}>
        <button className="icon-button dialog-close" type="button" aria-label="Close curator" onClick={onClose}>×</button>
        <p className="section-index">Curator tools</p>
        <h2 id="curator-title">One change.<br />Two observations.</h2>
        <p className="plain-language">Matched comparisons change one dimension at a time. The result remains a household observation, never a ranking.</p>
        <div className="comparison-form">
          <label>Scene<select value={sceneId} onChange={(event) => { setSceneId(event.target.value as ContentManifest['id']); }}>{manifests.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
          <fieldset><legend>Dimension</legend>{(['contrast', 'motion', 'sound', 'novelty'] as ComparisonDimension[]).map((item) => <label key={item}><input type="radio" name="dimension" value={item} checked={dimension === item} onChange={() => { setDimension(item); }} /><span>{dimensionLabel(item)}</span></label>)}</fieldset>
          <fieldset><legend>Run</legend><label><input type="radio" name="order" checked={order === 'a'} onChange={() => { setOrder('a'); }} /><span>A / baseline</span></label><label><input type="radio" name="order" checked={order === 'b'} onChange={() => { setOrder('b'); }} /><span>B / changed dimension</span></label></fieldset>
        </div>
        <div className="comparison-preview"><span>Fixed</span><strong>{variant.figureGround} contrast · {variant.motion} motion · sound {variant.sound} · {variant.novelty}</strong></div>
        <div className="modal-actions"><button className="text-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="button" onClick={() => { onStart(sceneId, variant, { dimension, label: `${order.toUpperCase()} / ${dimension}` }); }}>Prepare this run</button></div>
      </section>
    </div>
  );
}
