import { format as formatNumber } from 'd3-format';
import { stackedAxis, type ChartStructure } from './structure';
import type { DesignDecisions } from './theme/types';
import type { ChannelSemantics } from './types';

/** Mark families that carry data values, as opposed to chrome. */
export const DATA_MARKS = new Set([
    'bar', 'line', 'area', 'point', 'circle', 'square', 'arc', 'rect',
    'trail', 'tick', 'boxplot', 'errorbar', 'errorband', 'geoshape',
]);

/** Marks with a body a label can sit on. */
const BODY_MARKS = new Set(['bar', 'arc', 'rect', 'area']);

/** The fraction of the span from zero a vertical scale extends past labelled bar ends. */
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
}

export interface ValueLabelInputs {
    design: DesignDecisions;
    structure: ChartStructure;
    /** Whether some band holds several stacked segments. */
    segmented: boolean;
    channelSemantics: Record<string, ChannelSemantics>;
    rows: any[];
}

/**
 * The value labels a chart prints, where the theme or a live layout asks for them, or why it
 * prints none. A pie prints its angle and a heat map its colour; otherwise the first measure axis.
 * A template that prints its own labels keeps them, and a measure the chart computes has no value
 * to print. Labels centre on stacked segments, sit in cells and along slices, and otherwise at the
 * mark's end, inside it where the theme asks and the mark has a body. Segments thinner than the
 * theme's share of the tallest stack drop their labels. Labels past bar ends get room: a vertical
 * scale extends 15% of its span from zero at each labelled end; a horizontal one keeps the widest
 * printed value clear, at 0.8 em per character plus 8 px.
 */
export function planValueLabels(inputs: ValueLabelInputs): ValueLabelPlan | { refused: string } | undefined {
    const { design: d, structure, segmented, channelSemantics, rows } = inputs;
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
    const inside = d.dataLabels.placement === 'atMark' && body;
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
            const pad = (Math.max(max, 0) - Math.min(min, 0)) * HEADROOM;
            if (pad > 0) plan.headroom = { ...(max > 0 ? { max: max + pad } : {}), ...(min < 0 ? { min: min - pad } : {}) };
        } else if (channel === 'x') {
            const print = formatNumber(d.dataLabels.format ?? '');
            const chars = Math.max(1, ...values.map((value) => print(value).length))
                + (d.dataLabels.unit ? d.dataLabels.unit.length + 1 : 0);
            plan.inset = Math.ceil(chars * (d.dataLabels.text.fontSize ?? 10) * 0.8 + 8);
        }
    }
    return plan;
}
