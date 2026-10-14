import type { ThemeSpec } from 'flint-chart';
import { themeInks } from '../shared/house-themes';

/** A theme's first inks as a small striped square, standing in for it in a picker. */
export function ThemeSwatches({ theme, size = 15 }: { theme: ThemeSpec; size?: number }) {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', flex: '0 0 auto', overflow: 'hidden', width: size, height: size, borderRadius: 3 }}>
      {themeInks(theme).map((color) => <i key={color} style={{ flex: 1, minWidth: 0, background: color }} />)}
    </span>
  );
}
