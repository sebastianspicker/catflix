import { describe, expect, it } from 'vitest';
import { publicUrl, routePathname } from './paths';

describe('deployment paths', () => {
  it('keeps root deployments root-relative', () => {
    expect(publicUrl('/assets/koi.webp', '/')).toBe('/assets/koi.webp');
    expect(routePathname('/research', '/')).toBe('/research');
  });

  it('prefixes public assets for a project Pages deployment', () => {
    expect(publicUrl('/assets/koi.webp', '/catflix/')).toBe('/catflix/assets/koi.webp');
  });

  it('maps project Pages routes back to the application route', () => {
    expect(routePathname('/catflix/', '/catflix/')).toBe('/');
    expect(routePathname('/catflix/research', '/catflix/')).toBe('/research');
  });
});
