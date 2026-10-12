// A title fitted to the block it sits over: set down a size, or broken over even lines with the
// height taken out of the plot. Shared by the plan and by theme realization.

/**
 * Roughly how wide a glyph runs, as a fraction of the font size.
 *
 * Tuned for a browser, where Vega measures text with the canvas API. Node has
 * no canvas backend here, so Vega falls back to an approximation that runs
 * ~45% wider — measurements taken from a headless render read high and are not
 * grounds for raising this.
 */
const HEADLINE_CHAR_RATIO = 0.55;

/** How far past the block a headline may run before anything is done about it. */
const STRETCH_TOLERANCE = 1.18;

/** How far the headline may be set down before it is broken instead. */
const MIN_HEADLINE_SCALE = 0.82;

const CJK_RE = /[\u3000-\u303F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;

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
export function balancedLines(text: string, count: number, fontSize: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [text];
    const target = textPx(text, fontSize) / count;
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        // Break once the line is closer to the target with this word left off.
        if (line && lines.length < count - 1
            && textPx(candidate, fontSize) - target > target - textPx(line, fontSize)) {
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
 * Fit a headline that runs wider than its block. One that only just overhangs is left alone; one
 * that overhangs more is set down a size; only one that still does not fit at the smaller size is
 * broken, over even lines, and the extra lines' height comes out of the plot. Undefined leaves it.
 */
export function fitHeadlineText(
    text: string, block: number, fontSize: number, deckFontSize: number,
): { smaller: number; fontSize?: number; lines?: string[]; taken: number } | undefined {
    const budget = block * STRETCH_TOLERANCE;
    if (textPx(text, fontSize) <= budget) return undefined;
    const smaller = Math.max(Math.round(fontSize * MIN_HEADLINE_SCALE), deckFontSize + 1);
    if (smaller < fontSize && textPx(text, smaller) <= budget) return { smaller, fontSize: smaller, taken: 0 };
    const count = Math.max(2, Math.ceil(textPx(text, smaller) / budget));
    const lines = balancedLines(text, count, smaller);
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
export function fitDeckText(text: string, block: number, fontSize: number): { lines: string[]; taken: number } | undefined {
    if (textPx(text, fontSize) <= block * STRETCH_TOLERANCE) return undefined;
    const count = Math.max(2, Math.ceil(textPx(text, fontSize) / block));
    const lines = balancedLines(text, count, fontSize);
    if (lines.length < 2) return undefined;
    return { lines, taken: Math.round((lines.length - 1) * fontSize * 1.3) };
}
