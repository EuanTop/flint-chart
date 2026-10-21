/**
 * Value labels measured as they are printed (L1).
 *
 * A value label is a text mark the renderer never lays out: Vega-Lite places it where it is told
 * and draws it in the font it is given. So its room is the width of its glyphs in that font, weight
 * and case, after the number format and the unit — not Vega's layout estimate, and not a count of
 * characters. Grounding, the layout plan and realization all ask this one module, so a label that
 * was judged to fit is given exactly the room it was judged on.
 */
import { formatCompact, type CompactPrint } from './number-compact';
import { format as formatNumber } from 'd3-format';
import type { TextMeasurer } from './legend-layout';
import type { ResolvedText } from './theme/types';
import { applyTextCase } from './text-case';
import { hostTextMeasurer, tableTextMeasurer } from './text-width';

/** The air between a bar's end and a label printed past it, px. */
export const LABEL_GAP = 4;
/** The air between a bar's end and a label printed inside it, px; the label keeps as much at its other side. */
export const LABEL_INSET = 5;
/** The air a label keeps from each side of the bar or slot it sits across, px. */
export const LABEL_SIDE = 2;
/** The extra a line of text needs above its size to sit between two edges without touching them, px. */
export const LINE_SLACK = 4;

/** Units written before the number. */
export const PREFIX_UNITS = new Set(['$', '£', '€', '¥', '₹', '₩', 'R$', 'US$', 'A$', 'CA$', 'CHF']);

/** A number as a label prints it: the format, then the unit (a word unit after a space). */
export function printValue(value: number, pattern?: string, unit?: string, compact?: CompactPrint): string {
    const shown = compact ? formatCompact(value, compact, formatNumber) : pattern ? formatNumber(pattern)(value) : String(value);
    if (!unit) return shown;
    if (PREFIX_UNITS.has(unit)) return `${unit}${shown}`;
    return /^[A-Za-z]/.test(unit) ? `${shown} ${unit}` : `${shown}${unit}`;
}

/** How value labels are measured: as the host's renderer says, else from the width table. */
export function valueLabelMeasurer(): TextMeasurer {
    return hostTextMeasurer() ?? tableTextMeasurer;
}

export interface PrintedValueLabels {
    /** The string a value prints as. */
    text: (value: number) => string;
    /** Its width in px. */
    width: (value: number) => number;
    /** The widest printed value, px. */
    widest: number;
    /** A line of the label's text, px. */
    height: number;
}

/** The printed value labels of a chart, measured in the label's own font, weight, slope and case. */
export function measureValueLabels(
    values: number[],
    options: { format?: string; unit?: string; compact?: CompactPrint; text: ResolvedText; measure?: TextMeasurer },
): PrintedValueLabels {
    const t = options.text;
    const fontSize = t.fontSize ?? 10;
    const measureWith = (options.measure ?? valueLabelMeasurer())(fontSize, t.font ?? 'sans-serif', t.fontWeight ?? 'normal', t.fontStyle ?? 'normal');
    const text = (value: number) => {
        const printed = printValue(value, options.format, options.unit, options.compact);
        return t.textCase ? applyTextCase(printed, t.textCase) : printed;
    };
    const width = (value: number) => measureWith(text(value));
    let widest = 0;
    for (const value of values) if (Number.isFinite(value)) widest = Math.max(widest, width(value));
    return { text, width, widest, height: fontSize };
}

/**
 * The smallest magnitude whose bar holds its own label inside, where every larger one does too;
 * `undefined` when all of them do, `Infinity` when none does. Along a horizontal bar the label's
 * width has to fit, with the inset at both ends; along a vertical bar, a line of text.
 */
export function insideMinValue(
    values: number[],
    labels: PrintedValueLabels,
    bar: { horizontal: boolean; length: number; domain: [number, number] },
): number | undefined {
    const span = bar.domain[1] - bar.domain[0];
    if (!(span > 0) || !(bar.length > 0)) return undefined;
    const px = (value: number) => (Math.abs(value) / span) * bar.length;
    const need = (value: number) => (bar.horizontal ? labels.width(value) : labels.height) + 2 * LABEL_INSET;
    const sorted = values.filter((v) => Number.isFinite(v) && v !== 0).sort((a, b) => Math.abs(b) - Math.abs(a));
    let min: number | undefined;
    for (const value of sorted) {
        if (px(value) < need(value)) return min ?? Infinity;
        min = Math.abs(value);
    }
    return undefined;
}
