import { stackedAxis, type ChartStructure } from './structure';
import type { DesignDecisions } from './theme/types';
import type { ChannelSemantics } from './types';
import { insideMinValue, LABEL_GAP, measureValueLabels } from './value-label-measure';
import type { ArcLabelFit } from './arc-label-fit';

/** Mark families that carry data values, as opposed to chrome. */
export const DATA_MARKS = new Set([
    'bar', 'line', 'area', 'point', 'circle', 'square', 'arc', 'rect',
    'trail', 'tick', 'boxplot', 'errorbar', 'errorband', 'geoshape',
]);

/** Marks with a body a label can sit on. */
const BODY_MARKS = new Set(['bar', 'arc', 'rect', 'area']);

/** The fraction of the span from zero a vertical scale extends past labelled bar ends, where the plot's height is not known. */
const HEADROOM = 0.15;

/** The value labels a chart prints, as far as they shape its layout. */
export interface ValueLabelPlan {
    /** The channel whose values are printed: a measure axis, a pie's angle, or a heat map's colour. */
    channel: 'x' | 'y' | 'theta' | 'color';
    field: string;
    /** Printed in each cell, along each slice, in the middle of each stacked segment, or at each mark's end. */
    form: 'cells' | 'radial' | 'segments' | 'ends';
    /** Whether the mark has a body a label can sit on. */
    body: boolean;
    /** Whether labels sit inside the mark rather than past its end. */
    inside: boolean;
    /** Whether some value is negative, so labels flip to the far side of marks that grow down. */
    negative: boolean;
    /** The smallest segment that keeps its label, in data units. */
    segmentMinValue?: number;
    /** The smallest share of its own stack a segment of a normalized stack needs to keep its label. */
    segmentMinShare?: number;
    /** The domain ends a vertical scale extends to so labels past bar ends stay in the plot. */
    headroom?: { min?: number; max?: number };
    /** The px kept clear at each labelled end of a horizontal scale for labels past bar ends. */
    inset?: number;
    /**
     * Inside labels measured against the drawn axis: bars below `minValue` cannot hold their own
     * label and print it past the end; no `minValue` means every bar holds its label.
     */
    insideFit?: { minValue?: number; overflow?: { end?: number; start?: number } };
    /** A whole pie with its numbers outside: its radius and centre, sized by where the numbers fall. */
    arc?: ArcLabelFit;
}

export interface ValueLabelInputs {
    design: DesignDecisions;
    structure: ChartStructure;
    /** Whether some band holds several stacked segments. */
    segmented: boolean;
    channelSemantics: Record<string, ChannelSemantics>;
    rows: any[];
    /** The plot's drawn length along each axis, where known: room past a bar's end is kept in px. */
    lengths?: { x: number; y: number };
    /** Print every label past its bar's end, whatever the placement (`fallback: "allOutside"`). */
    outside?: boolean;
}

/**
 * The value labels a chart prints, where the theme or a live layout asks for them, or why it
 * prints none. A pie prints its angle and a heat map its colour; otherwise the first measure axis.
 * A template that prints its own labels keeps them, and a measure the chart computes has no value
 * to print. Labels centre on stacked segments, sit in cells and along slices, and otherwise at the
 * mark's end, inside it where the theme asks and the mark has a body. Segments thinner than the
 * theme's share of the tallest stack drop their labels. Labels past bar ends get room (L2): a
 * vertical scale extends far enough past each labelled end that a line of the label's text and the
 * gap fit between the tallest bar and the plot's edge (15% of the span where the plot's height is not
 * known); a horizontal one keeps the widest printed value clear, measured in the label's font, plus
 * the gap.
 */
export function planValueLabels(inputs: ValueLabelInputs): ValueLabelPlan | { refused: string } | undefined {
    const { design: d, structure, segmented, channelSemantics, rows, lengths, outside } = inputs;
    if (!d.dataLabels.show && !d.dataLabels.liveSignal) return undefined;
    const marks = structure.marks.filter((mark) => DATA_MARKS.has(mark));
    if (marks.length === 0) return { refused: 'no data mark found to label' };
    const radial = marks.includes('arc');
    const cells = !radial && d.bound.measureChannels.length === 0 && marks.every((mark) => mark === 'rect');
    const channel = radial ? 'theta' : cells ? 'color' : d.bound.measureChannels[0];
    if (!channel) return { refused: 'no measure axis to label' };
    if (structure.marks.includes('text')) return { refused: 'template already prints its own labels — left alone' };

    const axis = channel === 'x' || channel === 'y' ? structure[channel] : channel === 'theta' ? structure.angle : undefined;
    const ends = axis?.range ? 2 : 1;
    if (axis && axis.fields.length > ends) {
        return { refused: `the mark carries ${axis.fields.length} measures (${axis.fields.join(', ')}) — no single value to print` };
    }
    if (radial && (axis?.type !== 'quantitative' || structure.radius)) {
        return { refused: 'category angles or a data-driven radius need their own label geometry — pie-style labels are not applied' };
    }
    const field = axis ? (axis.derived ? undefined : axis.fields[0]) : channelSemantics[channel]?.field;
    if (!field) return { refused: `measure channel \`${channel}\` has no field` };
    if (axis?.derived) return { refused: `the measure is the template's own running total — a working column, not a value to print` };

    const segments = (channel === 'x' || channel === 'y') && structure.stacking !== 'none'
        && stackedAxis(structure) === channel && segmented;
    const body = BODY_MARKS.has(marks[0]);
    const inside = d.dataLabels.placement === 'atMark' && body && !outside;
    const values = rows.map((row) => row?.[field]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const negative = values.some((v) => v < 0);
    const form = cells ? 'cells' : radial ? 'radial' : segments ? 'segments' : 'ends';
    const plan: ValueLabelPlan = { channel, field, form, body, inside, negative };

    const minShare = d.dataLabels.segmentMinShare;
    if (segments && minShare !== undefined && minShare > 0 && structure.stacking === 'normalized') plan.segmentMinShare = minShare;
    else if (segments && minShare !== undefined && minShare > 0) {
        const band = structure[channel === 'x' ? 'y' : 'x'];
        const bandField = band && !band.derived ? band.fields[0] : undefined;
        const totals = new Map<unknown, number>();
        for (const row of rows) {
            const value = row?.[field];
            if (typeof value !== 'number' || !Number.isFinite(value)) continue;
            const key = bandField ? row?.[bandField] : '';
            totals.set(key, (totals.get(key) ?? 0) + Math.abs(value));
        }
        const tallest = Math.max(0, ...totals.values());
        if (tallest > 0) plan.segmentMinValue = minShare * tallest;
    }

    if (!inside && form === 'ends' && body && values.length) {
        if (channel === 'y') {
            const max = Math.max(...values);
            const min = Math.min(...values);
            const pad = headroomPad(Math.max(max, 0) - Math.min(min, 0), Number(max > 0) + Number(min < 0), d.dataLabels.text.fontSize ?? 10, lengths?.y);
            if (pad > 0) plan.headroom = { ...(max > 0 ? { max: max + pad } : {}), ...(min < 0 ? { min: min - pad } : {}) };
        } else if (channel === 'x') {
            const printed = measureValueLabels(values, { format: d.dataLabels.format, compact: d.dataLabels.compact, unit: d.dataLabels.unit, text: d.dataLabels.text });
            plan.inset = Math.ceil(printed.widest + LABEL_GAP + 2);
        }
    }
    return plan;
}

/**
 * How far, in data units, a vertical scale extends past each labelled end so a line of text and the
 * gap fit there: with `ends` ends padded by `p` over a span `a`, each pad takes `p / (a + ends·p)` of
 * the plot, which has to be the room over the plot's height.
 */
function headroomPad(span: number, ends: number, fontSize: number, length: number | undefined): number {
    if (!(span > 0) || ends === 0) return 0;
    if (!(length && length > 0)) return span * HEADROOM;
    const share = (fontSize + LABEL_GAP + 2) / length;
    // A plot too short to give each end its line falls back to the old fraction rather than a scale
    // that is mostly headroom.
    if (share * ends >= 0.5) return span * HEADROOM;
    return (share * span) / (1 - ends * share);
}

/**
 * Inside labels checked one by one against the axis as drawn: the domain the ruler settled (or the
 * data's, rounded as the backend rounds it) over the plot's length along the bars. A bar too short
 * for its own label prints it past the end, so when not one bar can hold its label, every label is.
 */
export function fitInsideLabels(
    plan: ValueLabelPlan, design: DesignDecisions, rows: any[], axis: { length: number; domain?: [number, number] },
): ValueLabelPlan {
    if (!plan.inside || plan.form !== 'ends' || (plan.channel !== 'x' && plan.channel !== 'y')) return plan;
    const values = rows.map((row) => row?.[plan.field]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (!values.length) return plan;
    const domain = axis.domain ?? niceExtent(Math.min(0, ...values), Math.max(0, ...values));
    const labels = measureValueLabels(values, { format: design.dataLabels.format, compact: design.dataLabels.compact, unit: design.dataLabels.unit, text: design.dataLabels.text });
    const horizontal = plan.channel === 'x';
    const found = insideMinValue(values, labels, { horizontal, length: axis.length, domain });
    if (found === undefined) return { ...plan, insideFit: {} };
    // Not one bar holds its label: every label moves past its end, through the same split.
    const minValue = found === Infinity ? 2 * Math.max(...values.map(Math.abs)) : found;
    // A label moved past its end needs that room inside the plot; what it runs over is kept as margin.
    const span = domain[1] - domain[0];
    const overflow: { end?: number; start?: number } = {};
    for (const value of values) {
        if (Math.abs(value) >= minValue || !(span > 0)) continue;
        const reach = (Math.abs(value) / span) * axis.length + LABEL_GAP + (horizontal ? labels.width(value) : labels.height);
        const side = value < 0 ? 'start' : 'end';
        const over = Math.ceil(reach - ((value < 0 ? -domain[0] : domain[1]) / span) * axis.length);
        if (over > 0) overflow[side] = Math.max(overflow[side] ?? 0, over);
    }
    return { ...plan, insideFit: { minValue, ...(overflow.end || overflow.start ? { overflow } : {}) } };
}

/**
 * Whether some bar is too short to hold its own label inside, judged before the rulers settle (the
 * data's extent rounded as the backend rounds it): what `fallback: "allOutside"` asks.
 */
export function someLabelsOverrun(plan: ValueLabelPlan, design: DesignDecisions, rows: any[], length: number): boolean {
    if (!plan.inside || plan.form !== 'ends' || (plan.channel !== 'x' && plan.channel !== 'y')) return false;
    const values = rows.map((row) => row?.[plan.field]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (!values.length) return false;
    const labels = measureValueLabels(values, { format: design.dataLabels.format, compact: design.dataLabels.compact, unit: design.dataLabels.unit, text: design.dataLabels.text });
    const domain = niceExtent(Math.min(0, ...values), Math.max(0, ...values));
    return insideMinValue(values, labels, { horizontal: plan.channel === 'x', length, domain }) !== undefined;
}

/** An extent rounded out the way Vega-Lite's `nice` rounds a linear scale, to ten ticks. */
function niceExtent(min: number, max: number): [number, number] {
    const span = max - min;
    if (!(span > 0)) return [min, max];
    const raw = span / 10;
    const power = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map((k) => k * power).find((k) => k >= raw) ?? 10 * power;
    return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}
