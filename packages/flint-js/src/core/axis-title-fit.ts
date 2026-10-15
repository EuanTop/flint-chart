// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * An axis title longer than its axis. Drawn on one line it runs past the plot's ends, and the
 * drawing grows to hold it: one long label stretching the whole chart. Instead it wraps onto two
 * lines at the axis's length, split where the two come out most even; where two lines will not
 * hold it, the second is cut with an ellipsis. It never runs past its axis.
 */

export interface AxisTitleFit {
    /** The title's lines, one or two. */
    lines: string[];
    /** The width every line is held to, in px: a line past it is cut with an ellipsis. */
    limit: number;
    /** Whether a line is cut. */
    cut: boolean;
    /** The height of a line, in px. */
    lineHeight: number;
}

/** The fit of an axis title to its axis's length, or undefined where it stands within it on one line. */
export function fitAxisTitle(text: string, length: number, widthOf: (text: string) => number, fontSize: number): AxisTitleFit | undefined {
    if (!text || !(length > 0) || widthOf(text) <= length) return undefined;
    const lineHeight = Math.ceil(fontSize * 1.2);
    const limit = Math.floor(length);
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2) return { lines: [text], limit, cut: true, lineHeight };
    // The most even split: the break whose longer line is shortest.
    let best: { lines: string[]; widest: number } | undefined;
    for (let at = 1; at < words.length; at++) {
        const lines = [words.slice(0, at).join(' '), words.slice(at).join(' ')];
        const widest = Math.max(...lines.map(widthOf));
        if (!best || widest < best.widest) best = { lines, widest };
    }
    if (best && best.widest <= length) return { lines: best.lines, limit, cut: false, lineHeight };
    // Two lines will not hold it: the first takes all it can, the second the rest, cut at the axis.
    let at = 1;
    while (at < words.length && widthOf(words.slice(0, at + 1).join(' ')) <= length) at++;
    return { lines: [words.slice(0, at).join(' '), words.slice(at).join(' ')], limit, cut: true, lineHeight };
}
