import { describe, expect, it } from 'vitest';
import { listContentManifests } from './registry';
import { validateContentManifest } from './types';

describe('content registry', () => {
  it('declares encounter, presentation, provenance, and risk metadata for every scene', () => {
    for (const manifest of listContentManifests()) {
      expect(manifest.encounter.authoredScore).not.toBe('');
      expect(manifest.encounter.finale).not.toBe('');
      expect(manifest.encounter.presentation.tablet.distance).toBe('near-screen');
      expect(manifest.encounter.presentation.television.distance).toBe('room-display');
      expect(Object.values(manifest.encounter.riskRationale).every(Boolean)).toBe(true);
      expect(manifest.encounter.editorialClaims.every((claim) => claim.evidenceEndpoint.length > 0)).toBe(true);
      expect(manifest.audio?.provenance?.every((record) => record.source && record.license && typeof record.eligible === 'boolean')).toBe(true);
    }
  });
  it('ships five complete runtime-valid manifests', () => {
    const manifests = listContentManifests();
    expect(manifests).toHaveLength(5);
    for (const manifest of manifests) {
      expect(validateContentManifest(manifest)).toEqual({ ok: true, value: manifest });
      expect(manifest.assets.length).toBeGreaterThanOrEqual(2);
      expect(manifest.assets.every((asset) => /^[a-f0-9]{64}$/.test(asset.checksum))).toBe(true);
      expect(manifest.riskFlags.length).toBeGreaterThan(0);
      expect(manifest.motion.trajectory.length).toBeGreaterThan(0);
      expect(manifest.motion.entranceEdges.length).toBeGreaterThan(0);
      expect(manifest.motion.exitEdges.length).toBeGreaterThan(0);
      expect(manifest.motion.occlusion.duration).toBeTruthy();
      expect(manifest.apparentSize.frameWidthPercent[0]).toBeGreaterThan(0);
      expect(manifest.apparentSize.frameWidthPercent[1]).toBeGreaterThanOrEqual(manifest.apparentSize.frameWidthPercent[0]);
      expect(manifest.apparentSize.visualAngle).toBe('device-dependent');
      expect(manifest.apparentSize.basis).toBe('editorial-legibility');
      expect(manifest.evidenceEndpoint).toContain('docs/research/');
      expect(manifest.supervision).toContain('Supervised');
    }
  });

  it('returns an independent manifest list', () => {
    const manifests = listContentManifests();
    Array.prototype.pop.call(manifests);
    expect(listContentManifests()).toHaveLength(5);
  });

  it('rejects missing provenance and safety metadata', () => {
    const manifest = structuredClone(listContentManifests()[0]);
    manifest.assets = [];
    manifest.riskFlags = undefined as never;
    const result = validateContentManifest(manifest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining(['Risk metadata is required.', 'At least one provenance record is required.']));
  });

  it('rejects incomplete editorial motion, remote provenance, and unsafe audio metadata', () => {
    const manifest = structuredClone(listContentManifests()[0]);
    manifest.motion.entranceEdges = [];
    manifest.assets[0].source = 'https://example.invalid/asset.png';
    const audio = manifest.audio;
    expect(audio).toBeDefined();
    if (!audio) throw new Error('Expected a registry audio profile.');
    audio.excluded = [];
    const result = validateContentManifest(manifest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(expect.arrayContaining([
      'Complete editorial motion metadata is required.',
      'Asset 1 has incomplete provenance.',
      'Audio metadata must name coherent events and exclusions.',
    ]));
  });

  it('rejects apparent-size claims without a bounded authored range', () => {
    const manifest = structuredClone(listContentManifests()[0]);
    manifest.apparentSize.frameWidthPercent = [12, 4];
    const result = validateContentManifest(manifest);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain('Complete apparent-size metadata is required.');
  });

});
