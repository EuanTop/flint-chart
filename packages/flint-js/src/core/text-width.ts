import { TEXT_WIDTHS } from './text-widths.generated';
import type { TextMeasurer } from './legend-layout';

const CJK = /[　-〿㐀-鿿豈-﫿＀-￯]/;

/** The first family of a CSS font stack the width table knows, if any. */
function knownFamily(font: string | undefined): string | undefined {
    for (const entry of (font ?? 'sans-serif').split(',')) {
        const family = entry.trim().replace(/^['"]|['"]$/g, '');
        if (TEXT_WIDTHS[family]) return family;
    }
    return undefined;
}

/**
 * The width of a line of text in px, from per-character widths measured for the font's first
 * family the table knows: a CJK glyph is a full em, and a character the table lacks, or a font it
 * does not know, takes 0.62 em. Bold weights (600 and up) read the bold widths.
 */
export function textWidth(text: string, fontSize: number, font?: string, weight: string | number = 'normal'): number {
    const family = knownFamily(font);
    const bold = weight === 'bold' || Number(weight) >= 600;
    const widths = family ? TEXT_WIDTHS[family][bold ? 'bold' : 'normal'] : undefined;
    let em = 0;
    for (const char of text) {
        const code = char.charCodeAt(0);
        em += CJK.test(char) ? 1 : widths && code >= 32 && code < 127 ? widths[code - 32] : 0.62;
    }
    return em * fontSize;
}

/** Measures text from the width table, the same in every environment. */
export const tableTextMeasurer: TextMeasurer = (fontSize, font, weight) => (text) => textWidth(text, fontSize, font, weight);

/** Vega's own estimate where it has no canvas, as in Node: 0.8 em a character, truncated to whole px. */
export const vegaEstimateMeasurer: TextMeasurer = (fontSize) => (text) => Math.trunc(0.8 * text.length * fontSize);
