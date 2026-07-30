const defaultBasePath = import.meta.env.BASE_URL;

function normalizedBasePath(basePath: string): string {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return `${withLeadingSlash.replace(/\/+$/, '')}/`;
}

export function publicUrl(path: string, basePath = defaultBasePath): string {
  return `${normalizedBasePath(basePath)}${path.replace(/^\/+/, '')}`;
}

export function routePathname(pathname: string, basePath = defaultBasePath): string {
  const base = normalizedBasePath(basePath).replace(/\/$/, '');
  const current = pathname.replace(/\/+$/, '') || '/';
  if (base !== '/' && (current === base || current.startsWith(`${base}/`))) {
    return current.slice(base.length) || '/';
  }
  return current;
}
