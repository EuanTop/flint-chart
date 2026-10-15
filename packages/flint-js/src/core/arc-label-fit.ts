// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import type { DesignDecisions } from './theme/types';
import { measureValueLabels } from './value-label-measure';

/** How far past a pie's rim its outside numbers stand, in px: clear of the arc, not stuck to it. */
export const RADIAL_OUTSIDE_GAP = 22;

/** The room kept round a pie's drawing — its outlines and its outside numbers — in px. */
const ARC_HUG_MARGIN = 4;

/** A whole pie whose numbers ride outside it, as the plan sets it in its plot. */
export interface ArcLabelFit {
    /** The pie's outer radius, in px. */
    radius: number;
    /** The pie's centre in the plot, in px from its top-left corner. */
    center: { x: number; y: number };
    /** The height the drawing takes: the plot comes in to it. */
    height: number;
}

export interface ArcLabelFitInputs {
    design: DesignDecisions;
    rows: any[];
    /** The field each slice's angle measures. */
    field: string;
    /** The field that names the slices, where one does. */
    seriesField?: string;
    /** The order the slices are drawn from twelve o'clock: data order, or by value. */
    sort?: 'none' | 'ascending' | 'descending';
    /** The plot the pie is drawn in, its height as drawn under the title. */
    plot: { width: number; height: number };
    /** The radius the pie is drawn at with nothing outside it. */
    radius: number;
}

/**
 * A whole pie sized by where its numbers fall. A number stands beside its own slice, so room is
 * taken only on the sides that hold one: the pie is the largest whose numbers stay within the
 * plot, and the plot comes in to the drawing — no band of reserved room between the pie and what
 * stands above or below it. The pie keeps the plot's width, centred across it.
 */
export function fitArcLabels(inputs: ArcLabelFitInputs): ArcLabelFit | undefined {
    const { design: d, rows, field, seriesField, sort, plot } = inputs;
    const slices = arcSlices(rows, field, seriesField, sort);
    const total = slices.reduce((sum, value) => sum + value, 0);
    if (!(total > 0) || !(plot.width > 0) || !(plot.height > 0)) return undefined;
    const printed = measureValueLabels(
        rows.map((row) => row?.[field]).filter((v): v is number => typeof v === 'number' && Number.isFinite(v)),
        { format: d.dataLabels.format, compact: d.dataLabels.compact, unit: d.dataLabels.unit, text: d.dataLabels.text },
    );
    const fontSize = d.dataLabels.text.fontSize ?? 10;
    const labelHeight = fontSize * 1.2;
    // A slice whose arc at the label's radius is shorter than a line of text prints no number.
    const minArc = fontSize + 2;
    let start = 0;
    const mids = slices.map((value) => {
        const mid = (start + value / 2) / total * 2 * Math.PI;
        start += value;
        return { mid, share: value / total };
    });
    const box = (r: number) => {
        const out = { x1: -r, x2: r, y1: -r, y2: r };
        const reach = r + RADIAL_OUTSIDE_GAP;
        for (const { mid, share } of mids) {
            if (share * 2 * Math.PI * reach < minArc) continue;
            const x = Math.sin(mid) * reach;
            const y = -Math.cos(mid) * reach;
            out.x1 = Math.min(out.x1, x - printed.widest / 2);
            out.x2 = Math.max(out.x2, x + printed.widest / 2);
            out.y1 = Math.min(out.y1, y - labelHeight / 2);
            out.y2 = Math.max(out.y2, y + labelHeight / 2);
        }
        return { x1: out.x1 - ARC_HUG_MARGIN, x2: out.x2 + ARC_HUG_MARGIN, y1: out.y1 - ARC_HUG_MARGIN, y2: out.y2 + ARC_HUG_MARGIN };
    };
    const fits = (r: number) => {
        const b = box(r);
        return b.x2 - b.x1 <= plot.width && b.y2 - b.y1 <= plot.height;
    };
    // Never smaller than half the room's half: past that the numbers are cut rather than the pie.
    const floor = Math.min(plot.width, plot.height) / 4;
    let radius = Math.max(1, Math.floor(inputs.radius));
    if (!fits(radius)) {
        let low = floor;
        let high = radius;
        for (let pass = 0; pass < 24; pass++) {
            const mid = (low + high) / 2;
            if (fits(mid)) low = mid;
            else high = mid;
        }
        radius = Math.max(1, Math.floor(low));
    }
    const drawn = box(radius);
    const height = Math.min(plot.height, Math.ceil(drawn.y2 - drawn.y1));
    return {
        radius,
        center: {
            x: Math.round(plot.width / 2 - (drawn.x1 + drawn.x2) / 2),
            y: Math.round(-drawn.y1 + (height - (drawn.y2 - drawn.y1)) / 2),
        },
        height,
    };
}

/** A pie's slice values in the order they are drawn from twelve o'clock. */
function arcSlices(rows: any[], field: string, seriesField: string | undefined, sort: ArcLabelFitInputs['sort']): number[] {
    const sums = new Map<string, number>();
    rows.forEach((row, index) => {
        const value = Number(row?.[field]);
        if (!Number.isFinite(value)) return;
        const name = seriesField ? String(row?.[seriesField]) : String(index);
        sums.set(name, (sums.get(name) ?? 0) + Math.abs(value));
    });
    const values = [...sums.values()];
    if (seriesField && sort === 'ascending') return values.sort((a, b) => a - b);
    if (seriesField && sort === 'descending') return values.sort((a, b) => b - a);
    return values;
}
