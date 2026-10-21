import type { ThemeSpec } from './types';

/**
 * What a chart keeps of its house's chrome: the header (rules, tabs, wordmarks and logos above or
 * beside the title), the footer (the closing rule and the house's credit beside the source) and,
 * across both, the logos. Unset follows the theme. `false` turns all of it off.
 */
export type ChartChrome = false | { header?: boolean; footer?: boolean; logos?: boolean };

/** The theme with the chrome a chart turned off taken out; unchanged where the chart said nothing. */
export function withChrome(theme: ThemeSpec | undefined, chrome: ChartChrome | undefined): ThemeSpec | undefined {
    if (!theme || chrome === undefined) return theme;
    const off = chrome === false ? { header: false, footer: false, logos: false } : chrome;
    if (off.header !== false && off.footer !== false && off.logos !== false) return theme;
    const furniture = (theme.furniture ?? []).filter((item) => {
        const footer = item.kind === 'footerRule';
        if (footer && off.footer === false) return false;
        if (!footer && off.header === false) return false;
        if (item.kind === 'image' && off.logos === false) return false;
        return true;
    });
    let source = theme.source;
    if (source?.credit && off.footer === false) {
        const { credit: _credit, ...rest } = source;
        void _credit;
        source = rest;
    } else if (source?.credit?.image && off.logos === false) {
        // The logo goes; the credit's words stand in its place.
        const { image: _image, ...credit } = source.credit;
        void _image;
        source = { ...source, credit };
    }
    return { ...theme, furniture, ...(source !== undefined ? { source } : {}) };
}
