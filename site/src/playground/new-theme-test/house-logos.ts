/**
 * House logos. The real artwork is the organisations' trademark and is never committed: a file
 * dropped into `./logos/` (gitignored; see its README) is used when present, and a labelled
 * placeholder of the same size stands in otherwise. Vite resolves the files at build time; the node
 * scripts have no `import.meta.glob`, so they always draw the placeholder.
 */

let found: Record<string, string> = {};
try {
  found = import.meta.glob('./logos/*.{svg,png}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
} catch {
  found = {};
}

/** The URL of a house's real logo in `./logos/`, if one was dropped there. */
export function realLogo(name: string): string | undefined {
  return found[`./logos/${name}.svg`] ?? found[`./logos/${name}.png`];
}

/** A dashed box naming the logo it stands in for: obviously a slot, never mistaken for the mark. */
export function placeholderLogo(label: string, color: string, width = 100, height = 24): string {
  const size = Math.round(height * 0.42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    + `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="3" fill="none" stroke="${color}" stroke-dasharray="3 2"/>`
    + `<text x="${width / 2}" y="${height / 2 + size * 0.36}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" fill="${color}">${label}</text>`
    + '</svg>';
}

/** An image piece's source: the real logo where present, else the placeholder. */
export function logoImage(name: string, label: string, color: string, width: number, height: number): { src: string } | { svg: string } {
  const real = realLogo(name);
  return real ? { src: real } : { svg: placeholderLogo(label, color, width, height) };
}
