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

/**
 * Break a title to its block: each line filled to the block, as a headline is set, the words that
 * do not fit falling to the next. Only where that leaves a widow — a last line under a third of the
 * block — are the last two lines evened out, so no line stands alone. Even lines everywhere leave a
 * headline narrower than its block, with a ragged edge where none was needed.
 */
export function filledLines(text: string, block: number, fontSize: number, measure: TitleMeasure): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [text];
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && measure(candidate, fontSize) > block) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    if (line) lines.push(line);
    if (lines.length >= 2 && measure(lines[lines.length - 1], fontSize) < block * WIDOW_SHARE) {
        const tail = balancedLines(`${lines[lines.length - 2]} ${lines[lines.length - 1]}`, 2, fontSize, measure);
        lines.splice(lines.length - 2, 2, ...tail);
    }
    return lines;
}

/** A last line shorter than this share of the block is a widow, and the last two lines are evened out. */
const WIDOW_SHARE = 1 / 3;

/** The width inside the canvas the caller asked for, once the theme's padding is kept on both sides. */
export function canvasContentWidth(layout: { canvasWidth?: number; padding?: number }): number {
    return layout.canvasWidth ? Math.max(0, layout.canvasWidth - 2 * (layout.padding ?? 0)) : 0;
}

/** The shortest a plot may be squeezed to make room for a taller headline. */
const MIN_PLOT_HEIGHT = 80;

/** A plot's height once a title takes `px` from it, never below the shortest a plot may be. */
export function plotHeightAfter(height: number, px: number): number {
    return Math.max(MIN_PLOT_HEIGHT, height - px);
}

/**
 * Fit a headline that runs wider than its block: set down a size where that brings it onto one line;
 * else broken, each line filled to the block (a widow evened out), at its own size — shrinking it and
 * breaking it too pays twice — unless a size down saves a line. The extra lines' height comes out of
 * the plot. Undefined leaves it.
 */
export function fitHeadlineText(
    text: string, block: number, fontSize: number, deckFontSize: number, measure: TitleMeasure,
): { smaller: number; fontSize?: number; lines?: string[]; taken: number } | undefined {
    if (measure(text, fontSize) <= block) return undefined;
    const smaller = Math.max(Math.round(fontSize * MIN_HEADLINE_SCALE), deckFontSize + 1);
    if (smaller < fontSize && measure(text, smaller) <= block) return { smaller, fontSize: smaller, taken: 0 };
    // Broken at its own size, unless a size down saves a line: then both, for the shorter block.
    const own = filledLines(text, block, fontSize, measure);
    const down = smaller < fontSize ? filledLines(text, block, smaller, measure) : own;
    const size = down.length < own.length ? smaller : fontSize;
    const lines = size === fontSize ? own : down;
    if (lines.length < 2) return undefined;
    return { smaller, ...(size < fontSize ? { fontSize: size } : {}), lines, taken: Math.round((lines.length - 1) * size * 1.3) };
}

/**
 * Break a deck that runs wider than its block, each line filled to the block (a widow evened out);
 * it is never set smaller. The extra lines' height comes out of the plot. Undefined leaves it.
 */
export function fitDeckText(
    text: string, block: number, fontSize: number, measure: TitleMeasure,
): { lines: string[]; taken: number } | undefined {
    if (measure(text, fontSize) <= block) return undefined;
    const lines = filledLines(text, block, fontSize, measure);
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
