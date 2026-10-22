/** Development-only default. Set PODIUM_AIR_SITE_ORIGINS when a host is approved. */
const DEV_ORIGIN = 'http://localhost:5173';
const configured = process.env.PODIUM_AIR_SITE_ORIGINS;
if (process.env.BITCHORD_STORE_BUILD === '1' && !configured) {
  throw new Error('Set PODIUM_AIR_SITE_ORIGINS explicitly for a store build.');
}
export const SITE_ORIGINS: string[] = (configured ?? DEV_ORIGIN)
  .split(',').map((o) => new URL(o.trim()).origin);

export function matchPatternsFor(origins: string[]): string[] {
  return [...new Set(origins.map((o) => {
    const url = new URL(o);
    return `${url.protocol}//${url.hostname}/*`;
  }))];
}
