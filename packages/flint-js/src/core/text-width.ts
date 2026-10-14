import { TEXT_WIDTHS } from './text-widths.generated';
import type { TextMeasurer } from './legend-layout';

/** Whether a UTF-16 code unit is a CJK glyph: CJK punctuation, ideographs, compatibility ideographs or full-width forms. */
const isCJK = (code: number): boolean => (code >= 0x3000 && code <= 0x303f) || (code >= 0x3400 && code <= 0x9fff)
    || (code >= 0xf900 && code <= 0xfaff) || (code >= 0xff00 && code <= 0xffef);

const families = new Map<string, string | undefined>();

/** The first family of a CSS font stack the width table knows, if any. */
function knownFamily(font: string | undefined): string | undefined {
    const stack = font ?? 'sans-serif';
    if (families.has(stack)) return families.get(stack);
    let known: string | undefined;
    for (const entry of stack.split(',')) {
        const family = entry.trim().replace(/^['"]|['"]$/g, '');
        if (TEXT_WIDTHS[family]) {
            known = family;
            break;
        }
    }
    families.set(stack, known);
    return known;
}

/**
 * Whether the face a font stack draws in is one the width table knows: its first family is in the
 * table. When it is not, the table measures a fallback, and a face it does not know may run wider.
 */
export function measuresDrawnFace(font: string | undefined): boolean {
    const first = (font ?? 'sans-serif').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    return Boolean(TEXT_WIDTHS[first]);
}

/** Measured widths in em, by family and weight, then by text; a table past its size starts again. */
const measured = new Map<string, Map<string, number>>();
const MEASURED_LIMIT = 20000;

/**
 * The width of a line of text in px, from per-character widths measured for the font's first
 * family the table knows: a CJK glyph is a full em, and a character the table lacks, or a font it
 * does not know, takes 0.62 em. Bold weights (600 and up) read the bold widths.
 */
export function textWidth(text: string, fontSize: number, font?: string, weight: string | number = 'normal'): number {
    return emMeasurer(font, weight)(text) * fontSize;
}

/** The width in em of a line of text in one font and weight, as `textWidth` measures it. */
function emMeasurer(font: string | undefined, weight: string | number): (text: string) => number {
    const family = knownFamily(font);
    const bold = weight === 'bold' || Number(weight) >= 600;
    const key = `${family ?? ''}|${bold}`;
    let byText = measured.get(key);
    if (!byText) measured.set(key, byText = new Map());
    const cache = byText;
    const widths = family ? TEXT_WIDTHS[family][bold ? 'bold' : 'normal'] : undefined;
    return (text) => {
        let em = cache.get(text);
        if (em === undefined) {
            em = 0;
            for (const char of text) {
                const code = char.charCodeAt(0);
                em += isCJK(code) ? 1 : widths && code >= 32 && code < 127 ? widths[code - 32] : 0.62;
            }
            if (cache.size >= MEASURED_LIMIT) cache.clear();
            cache.set(text, em);
        }
        return em;
    };
}

/** Measures text from the width table, the same in every environment. */
export const tableTextMeasurer: TextMeasurer = (fontSize, font, weight) => {
    const em = emMeasurer(font, weight);
    return (text) => em(text) * fontSize;
};

/** Vega's own estimate where it has no canvas, as in Node: 0.8 em a character, truncated to whole px. */
export const vegaEstimateMeasurer: TextMeasurer = (fontSize) => (text) => Math.trunc(0.8 * text.length * fontSize);

let hostMeasurer: TextMeasurer | undefined;

/**
 * Sets how the renderer a host draws with measures text, such as a canvas a server renders with;
 * undefined goes back to the default.
 */
export function setTextMeasurer(measure: TextMeasurer | undefined): void {
    hostMeasurer = measure;
}

/** How the host says its renderer measures text, if it does. */
export function hostTextMeasurer(): TextMeasurer | undefined {
    return hostMeasurer;
}

/**
 * Measures text as a renderer will: as the host says, else a canvas, which the width table is
 * calibrated to, or Vega's estimate without one.
 */
export const rendererTextMeasurer: TextMeasurer = (fontSize, font, weight, style) =>
    (hostMeasurer ?? (typeof document === 'undefined' ? vegaEstimateMeasurer : tableTextMeasurer))(fontSize, font, weight, style);

/** Text widths in px in one font family, as a template asks for them. */
export type FamilyMeasure = (text: string, fontSize: number, weight?: string | number) => number;

/** A measurer bound to the family a chart's text is set in. */
export function familyMeasure(measure: TextMeasurer, family: string): FamilyMeasure {
    return (text, fontSize, weight = 'normal') => measure(fontSize, family, weight, 'normal')(text);
}
