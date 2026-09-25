import { publicUrl } from '../../paths';

export function ScenePoster({ posterUrl, loading = 'lazy' }: { posterUrl: string; loading?: 'lazy' | 'eager' }) {
  return <picture><source srcSet={publicUrl(posterUrl.replace(/\.webp$/, '.avif'))} type="image/avif" /><img src={publicUrl(posterUrl)} alt="" decoding="async" loading={loading} /></picture>;
}
