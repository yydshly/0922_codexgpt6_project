/** Public files live under the Vite base on repository-hosted deployments. */
export function publicAsset(path: string): string {
  const base = import.meta.env?.BASE_URL ?? '/';
  return `${base}${path.replace(/^\/+/, '')}`;
}
