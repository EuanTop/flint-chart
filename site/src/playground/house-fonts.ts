/** The open-licence house faces, shared by the new-theme-test and theme-improvement pages. */
import { useEffect, useState } from 'react';

/**
 * Open-licence faces the guides name, loaded for this page only so each house is drawn in its own
 * type rather than a silent fallback. Proprietary faces (Econ Sans, Helvetica Neue, Segoe) still fall back.
 */
export const HOUSE_FONTS = [
  'Lato:ital,wght@0,300;0,400;0,700;0,900;1,400',
  'Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,400',
  'Open+Sans:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400',
  'Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400',
  'IBM+Plex+Sans:ital,wght@0,400;0,600;1,400',
  'Noto+Sans:ital,wght@0,400;0,700;1,400',
  'Montserrat:wght@300;400;600;700',
  'Public+Sans:ital,wght@0,400;0,700;1,400',
  'Work+Sans:wght@400;600',
  'Fira+Sans:wght@400;600',
  'PT+Sans:wght@400;700',
  'Libre+Franklin:wght@400;700',
  'Merriweather:wght@400;700',
  'Poppins:wght@300;400;600',
  'Nunito+Sans:wght@300;400;700',
  'Arimo:wght@400;700',
];
const HOUSE_FONT_FAMILIES = HOUSE_FONTS.map((f) => f.split(':')[0].replace(/\+/g, ' '));
const HOUSE_FONTS_URL = `https://fonts.googleapis.com/css2?${HOUSE_FONTS.map((f) => `family=${f}`).join('&')}&display=swap`;

/** Fonts download only when asked for; ask for every house face before any chart measures text. */
export function useHouseFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    const timer = window.setTimeout(finish, 5000);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = HOUSE_FONTS_URL;
    link.onload = () => {
      const loads = HOUSE_FONT_FAMILIES.flatMap((family) => ['300', '400', '700', 'italic 400'].map((w) => document.fonts.load(`${w} 16px "${family}"`).catch(() => [])));
      void Promise.all(loads).then(finish);
    };
    link.onerror = finish;
    document.head.appendChild(link);
    return () => { window.clearTimeout(timer); link.remove(); };
  }, []);
  return ready;
}
