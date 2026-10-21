import { computeMinSubplotDimensions } from './compute-layout';
import type { ChartStructure } from './structure';
import type { DesignDecisions } from './theme/types';
import type { AssembleOptions, ChannelSemantics, LayoutDeclaration, LayoutResult } from './types';

/** How a faceted chart's panels sit together. */
export interface FacetFurniture {
    /** The gap between panels: one number, or rows and columns apart. */
    spacing: number | { row: number; column: number };
    /** Whether each panel of a wrapped facet takes its own y scale. */
    independentY: boolean;
    /** Quantitative facet channels binned because they hold more values than panels fit. */
    binned: Array<'column' | 'row'>;
}

/** A vertical axis title laid flat at the head of its ruler. */
export interface FlatAxisTitle {
    /** How far above the plot the title's baseline sits, in px. */
    lift: number;
    /** The room it adds above the plot, in px; none where a facet header already holds that line. */
    top: number;
}

/** What a chart draws around its plot, as far as it takes room. */
export interface FurniturePlan {
    facets: FacetFurniture;
    yTitle?: FlatAxisTitle;
}

export interface FurnitureInputs {
    structure: ChartStructure;
    /** The theme's decisions; undefined where no theme is applied. */
    design?: DesignDecisions;
    channelSemantics: Record<string, ChannelSemantics>;
    declaration: LayoutDeclaration;
    layout: LayoutResult;
    options: AssembleOptions;
    /** The rows the chart draws, and the rows as the author gave them. */
    rows: any[];
    data: any[];
    canvas: { width: number; height: number };
    chartProperties?: Record<string, any>;
    /** The gap the panels were laid out for, which the plan keeps. */
    spacing?: FacetFurniture['spacing'];
}

const REFERENCE_SUBPLOT = 100;

/**
 * The gap between panels: the reference gap at a 100 px panel, scaled with the panel and never
 * under 6 px.
 */
function panelGap(layout: LayoutResult, options: AssembleOptions): number {
    const subplot = Math.min(layout.subplotWidth, layout.subplotHeight);
    return Math.max(6, Math.round((options.facetGap ?? 0) * subplot / REFERENCE_SUBPLOT));
}

/**
 * Whether the panels of a wrapped facet take their own y scale: as the author says, else where the
 * largest value of one panel is at least a hundred times another's and there are fewer than six
 * panels, so the small panels would otherwise read flat.
 */
function independentY(inputs: FurnitureInputs, wrapField: string | undefined): boolean {
    const { structure, channelSemantics, layout, data, chartProperties } = inputs;
    if (!wrapField || structure.y?.type !== 'quantitative') return false;
    const asked = chartProperties?.independentYAxis;
    if (asked !== undefined) return Boolean(asked);
    const yField = channelSemantics.y?.field;
    if (!yField) return false;
    const largest = new Map<unknown, number>();
    for (const row of data) {
        const value = row?.[yField];
        if (value == null || isNaN(value)) continue;
        largest.set(row[wrapField], Math.max(largest.get(row[wrapField]) || 0, Math.abs(value)));
    }
    const peaks = [...largest.values()].filter((value) => value > 0);
    if (peaks.length < 2) return false;
    const panels = (layout.facet?.columns ?? 1) * (layout.facet?.rows ?? 1);
    return Math.max(...peaks) / Math.min(...peaks) >= 100 && panels < 6;
}

/**
 * The facet channels to bin: a quantitative field with more distinct values than the most panels
 * the canvas holds at the smallest panel the chart can draw.
 */
function binnedFacets(inputs: FurnitureInputs, gap: number): Array<'column' | 'row'> {
    const { channelSemantics, declaration, rows, options, canvas } = inputs;
    const { minSubplotWidth, minSubplotHeight } = computeMinSubplotDimensions(channelSemantics, declaration, rows, options);
    const fixed = options.facetFixedPadding ?? { width: 0, height: 0 };
    const columns = Math.max(2, Math.floor((canvas.width * options.maxStretchX! - fixed.width) / (minSubplotWidth + gap)));
    const rowCount = Math.max(2, Math.floor((canvas.height * options.maxStretchY! - fixed.height) / (minSubplotHeight + gap)));
    const out: Array<'column' | 'row'> = [];
    for (const channel of ['column', 'row'] as const) {
        const cs = channelSemantics[channel];
        if (!cs?.field || cs.type !== 'quantitative') continue;
        if (new Set(rows.map((row) => row?.[cs.field])).size > columns * rowCount) out.push(channel);
    }
    return out;
}

/**
 * A theme's flat y title: it clears the topmost value by a line of the label's size plus the
 * theme's gap (a title line and 6 px unless stated), and a facet header above the first row too.
 * It adds its own line and that lift above the plot unless a header already holds that line.
 */
function flatYTitle(design: DesignDecisions, structure: ChartStructure, topHeader: boolean): FlatAxisTitle | undefined {
    const axis = design.axes.y;
    if (!structure.y || !axis?.title.show) return undefined;
    if (axis.title.placement !== 'flatAboveAxis' && axis.title.placement !== 'inline') return undefined;
    const titleSize = axis.title.fontSize ?? 11;
    const gap = axis.title.gap ?? titleSize + 6;
    const headerClearance = design.facets.header.show && topHeader ? Math.round((design.facets.header.fontSize ?? 11) * 1.7) : 0;
    const lift = gap + Math.round((axis.label.fontSize ?? 11) * 0.75) + headerClearance;
    return { lift, top: topHeader ? 0 : titleSize + lift };
}

/**
 * How far a panel's y ruler labels hang past its top and bottom together: half a line each, unless
 * the theme flushes them inside the panel or the axis prints no ruler.
 */
export function rulerOverhang(structure: ChartStructure, design: DesignDecisions | undefined): number {
    const yLabels = design?.axes.y?.label;
    const ruled = structure.y !== undefined && ['quantitative', 'temporal'].includes(structure.y.type ?? '');
    return ruled && yLabels?.show !== false && !yLabels?.flush ? Math.ceil(yLabels?.fontSize ?? 10) : 0;
}

/**
 * What a chart draws around its plot, as far as it takes room. Panels sit a scaled gap apart; a
 * theme may set its own, and widens the gap between rows to hold a header line (1.7 em) or a flat
 * y title that every row repeats.
 */
export function planFurniture(inputs: FurnitureInputs): FurniturePlan {
    const { design, channelSemantics, layout, options, structure } = inputs;
    const wrapField = channelSemantics.column?.field && !channelSemantics.row?.field ? channelSemantics.column.field : undefined;
    const topHeader = Boolean(channelSemantics.column?.field);
    const gap = panelGap(layout, options);
    const independent = independentY(inputs, wrapField);
    const yTitle = design ? flatYTitle(design, structure, topHeader) : undefined;

    let spacing: FacetFurniture['spacing'] = gap;
    if (design) {
        const themed = design.facets.spacing;
        const base = themed ?? gap;
        const row = themed ?? gap;
        let needed = design.facets.header.show === false ? 0 : Math.round((design.facets.header.fontSize ?? 11) * 1.7);
        const repeated = yTitle && !(wrapField && !independent);
        if (repeated) needed = Math.max(needed, Math.ceil(yTitle.lift + (design.axes.y?.title.fontSize ?? 11) + 6));
        if (needed > row) spacing = { row: needed, column: base };
        else if (themed != null) spacing = themed;
    }
    // Stacked panels each print their y ruler, whose end labels hang half a line past the panel
    // unless flushed inside it: the gap between rows holds the two that meet.
    const stacked = Boolean(channelSemantics.row?.field) || (Boolean(wrapField) && (layout.facet?.rows ?? 1) > 1);
    const overhang = rulerOverhang(structure, design);
    if (stacked && overhang > 0) {
        const { row, column } = typeof spacing === 'number' ? { row: spacing, column: spacing } : spacing;
        spacing = { row: row + overhang, column };
    }
    return {
        facets: { spacing: inputs.spacing ?? spacing, independentY: independent, binned: binnedFacets(inputs, gap) },
        ...(yTitle ? { yTitle } : {}),
    };
}
