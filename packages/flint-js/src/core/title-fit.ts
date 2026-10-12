// A title fitted to the block it sits over: set down a size, or broken over even lines with the
// height taken out of the plot. Shared by the plan and by theme realization.

/** Roughly how wide a glyph runs, as a fraction of the font size. */
const HEADLINE_CHAR_RATIO = 0.55;

/** How far the headline may be set down before it is broken instead. */
const MIN_HEADLINE_SCALE = 0.82;

const CJK_RE = /[\u3000-\u303F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;

/** The width of a string in px at a font size, in the font the text is set in. */
export type TitleMeasure = (text: string, fontSize: number) => number;

/** Width of a string in pixels, counting a CJK glyph as a full em. */
export function textPx(s: string, fontSize: number): number {
    let em = 0;
    for (const ch of s) em += CJK_RE.test(ch) ? 1 : HEADLINE_CHAR_RATIO;
    return em * fontSize;
}

/**
 * Break the headline into `count` lines of even length.
 *
 * Filling each line to the brim and letting the remainder fall through is what
 * leaves a headline ending in a single orphaned word. Aiming at the average
 * line instead spreads the text over the lines it needs.
 */
export function balancedLines(text: string, count: number, fontSize: number, measure: TitleMeasure): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [text];
    const target = measure(text, fontSize) / count;
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        // Break once the line is closer to the target with this word left off.
        if (line && lines.length < count - 1
            && measure(candidate, fontSize) - target > target - measure(line, fontSize)) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);
    return lines;
}

/** The shortest a plot may be squeezed to make room for a taller headline. */
const MIN_PLOT_HEIGHT = 80;

/** A plot's height once a title takes `px` from it, never below the shortest a plot may be. */
export function plotHeightAfter(height: number, px: number): number {
    return Math.max(MIN_PLOT_HEIGHT, height - px);
}

/**
 * Fit a headline that runs wider than its block. It is set down a size; only one that still does
 * not fit at the smaller size is broken, over even lines, and the extra lines' height comes out of
 * the plot. Undefined leaves it.
 */
export function fitHeadlineText(
    text: string, block: number, fontSize: number, deckFontSize: number, measure: TitleMeasure,
): { smaller: number; fontSize?: number; lines?: string[]; taken: number } | undefined {
    if (measure(text, fontSize) <= block) return undefined;
    const smaller = Math.max(Math.round(fontSize * MIN_HEADLINE_SCALE), deckFontSize + 1);
    if (smaller < fontSize && measure(text, smaller) <= block) return { smaller, fontSize: smaller, taken: 0 };
    const count = Math.max(2, Math.ceil(measure(text, smaller) / block));
    const lines = balancedLines(text, count, smaller, measure);
    if (lines.length < 2) return undefined;
    return {
        smaller,
        ...(smaller < fontSize ? { fontSize: smaller } : {}),
        lines,
        taken: Math.round((lines.length - 1) * smaller * 1.3),
    };
}

/**
 * Break a deck that runs wider than its block, to the block itself; it is never set smaller. The
 * extra lines' height comes out of the plot. Undefined leaves it.
 */
export function fitDeckText(
    text: string, block: number, fontSize: number, measure: TitleMeasure,
): { lines: string[]; taken: number } | undefined {
    if (measure(text, fontSize) <= block) return undefined;
    const count = Math.max(2, Math.ceil(measure(text, fontSize) / block));
    const lines = balancedLines(text, count, fontSize, measure);
    if (lines.length < 2) return undefined;
    return { lines, taken: Math.round((lines.length - 1) * fontSize * 1.3) };
}

/** How a theme's headline and deck measure, in the font and weight each is set in. */
export function titleMeasures(
    title: { headline: { font?: string; fontWeight?: string | number }; deck: { font?: string; fontWeight?: string | number } },
    bodyFont: string | undefined,
    measureText: (fontSize: number, font: string, weight: string | number, style: string) => (text: string) => number,
): { headline: TitleMeasure; deck: TitleMeasure } {
    const of = (font: string | undefined, weight: string | number): TitleMeasure =>
        (text, fontSize) => measureText(fontSize, font ?? bodyFont ?? 'sans-serif', weight, 'normal')(text);
    return {
        headline: of(title.headline.font, title.headline.fontWeight ?? 700),
        deck: of(title.deck.font, title.deck.fontWeight ?? 'normal'),
    };
}
