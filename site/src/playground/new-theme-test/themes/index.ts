import type { StyleGuideTheme } from '../types';

/** Every house mapped so far, one module per guide; order does not matter, the page sorts by name. */
const MODULES = import.meta.glob('./*.ts', { eager: true, import: 'default' }) as Record<string, StyleGuideTheme>;

export const STYLE_GUIDE_THEMES: StyleGuideTheme[] = Object.entries(MODULES)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .map(([, theme]) => theme)
  .filter(Boolean)
  .sort((a, b) => a.org.localeCompare(b.org));
