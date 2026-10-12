import type { AxisLabelPlan } from './axis-labels';
import type { ChartStructure } from './structure';
import type { DesignDecisions } from './theme/types';
import { tableTextMeasurer } from './text-width';
import { canvasContentWidth, fitDeckText, fitHeadlineText, plotHeightAfter, textPx, titleMeasures } from './title-fit';
import type { LayoutResult } from './types';

/** How a single-view chart's title is fitted to the block it sits over. */
export interface TitlePlan {
    /** The width the title is fitted to: the plot, the category labels beside it, or the canvas. */
    block: number;
    /** The headline, set down a size or broken over lines. */
    headline?: ReturnType<typeof fitHeadlineText>;
    /** The deck the theme writes: the author's, then the axis titles it moves there. */
    deck?: string;
    /** The deck broken over lines. */
    deckFit?: ReturnType<typeof fitDeckText>;
}

export interface TitlePlanInputs {
    structure: ChartStructure;
    design: DesignDecisions;
    layout: LayoutResult;
    axisLabels: Record<'x' | 'y', AxisLabelPlan>;
    /** The title each axis prints. */
    axisTitles: Record<'x' | 'y', string | null | undefined>;
    plot: { width: number; height: number };
    rows: any[];
    /** The author's headline and deck. */
    title?: { text: string; subtitle?: string[] };
    /** The field the rows are faceted by, if any. */
    rowFacet?: string;
    /** Whether a theme is applied, so it moves axis titles to the deck where it keeps them there. */
    themed: boolean;
    /** The width the views of a chart of several views span, which its title sits over in place of one plot. */
    viewsWidth?: number;
}

/**
 * The titles each axis prints once the chart is laid out and themed: a row-faceted chart folds its
 * y title into the row header (a band of names needs none), and a theme hides titles it does not
 * show and adds a unit once.
 */
function printedAxisTitles(inputs: TitlePlanInputs): Record<'x' | 'y', string[]> {
    const { structure, design, layout, rowFacet, themed } = inputs;
    const facetRows = layout.facet?.rows ?? 1;
    const titled = (title: string | null | undefined) => (typeof title === 'string' && title ? [title] : []);
    const out = { x: titled(inputs.axisTitles.x), y: titled(inputs.axisTitles.y) };
    if (structure.y && (rowFacet || facetRows > 1)) {
        if (structure.y.type === 'nominal' || (rowFacet && out.y.length)) out.y = [];
    }
    if (!themed) return out;
    for (const channel of ['x', 'y'] as const) {
        const axis = design.axes[channel];
        if (!axis) continue;
        if (!axis.title.show) out[channel] = [];
        else if (axis.title.unit) {
            const unit = axis.title.unit;
            out[channel] = out[channel].map((title) => (title.includes(`(${unit})`) ? title : `${title} (${unit})`));
        }
    }
    return out;
}

/** The deck the theme writes: the author's, then each axis title it keeps in the deck, named by axis when both are. */
function deckText(inputs: TitlePlanInputs): string | undefined {
    const authored = inputs.title?.subtitle?.join(' ');
    if (!inputs.themed) return authored;
    const printed = printedAxisTitles(inputs);
    const moved = (['x', 'y'] as const)
        .filter((channel) => inputs.design.axes[channel]?.title.placement === 'subtitle' && printed[channel].length > 0);
    if (!moved.length) return authored;
    const labels = moved.map((channel) => `${moved.length > 1 ? `${channel.toUpperCase()}: ` : ''}${[...new Set(printed[channel])].join(', ')}`);
    return [authored ?? '', ...labels].filter(Boolean).join('; ');
}

/** The category labels beside the plot: as wide as the longest name, its padding and its tick. */
function labelGutter(inputs: TitlePlanInputs): number {
    const { structure, design, axisLabels, layout, rows } = inputs;
    const y = structure.y;
    const field = y?.derived ? undefined : y?.fields[0];
    const axis = design.axes.y;
    if ((!field && !y?.categories) || (y!.type !== 'nominal' && y!.type !== 'ordinal')) return 0;
    if (axis?.label.show === false || (axisLabels.y.angle ?? 0) !== 0) return 0;
    const names = [
        ...(field ? rows.map((row) => row?.[field]) : y!.categories!),
        ...layout.truncations.filter((truncation) => truncation.channel === 'y').map((truncation) => truncation.placeholder),
    ];
    let width = 0;
    for (const name of names) {
        if (name == null) continue;
        for (const line of String(name).split('\n')) width = Math.max(width, textPx(line, axisLabels.y.fontSize));
    }
    const limit = axisLabels.y.limit ?? 180;
    if (limit > 0) width = Math.min(width, limit);
    const ticks = axis?.ticks.show === false ? 0 : Math.max(0, axis?.ticks.size ?? 5);
    return width + Math.max(0, axis?.label.padding ?? 2) + ticks;
}

/**
 * The width of the block a chart's title and rules span: the plot, or the views of a chart of
 * several, widened a little for their axes, plus the category labels beside them. A title spans
 * at least the canvas the theme sizes to (`toCanvas`); a rule closes only what is drawn.
 */
export function chartBlock(inputs: TitlePlanInputs, toCanvas = true): number | undefined {
    const { structure, design, layout, plot, rows } = inputs;
    const field = structure.x?.derived ? undefined : structure.x?.fields[0];
    const bands = layout.xNominalCount > 0 && field ? new Set(rows.map((row) => row?.[field]).filter((v) => v != null)).size : 0;
    const plotWidth = Math.round((inputs.viewsWidth ?? (bands ? layout.xStep * bands : plot.width)) * 1.07);
    const block = Math.max(plotWidth + labelGutter(inputs), toCanvas ? canvasContentWidth(design.layout) : 0);
    return block && Number.isFinite(block) ? block : undefined;
}

/**
 * Fit a chart's title to the block it sits over: the plot, or the views of a chart of several,
 * widened a little for their axes, plus the category labels beside them, and never narrower than
 * the canvas the theme sizes to.
 */
export function planTitle(inputs: TitlePlanInputs): TitlePlan | undefined {
    const { structure, design } = inputs;
    const block = chartBlock(inputs);
    if (!block) return undefined;
    // Measured as the glyphs draw, in every environment: a title is drawn with real metrics even where
    // a chart is compiled without a canvas.
    const measure = titleMeasures(design.title, design.font, tableTextMeasurer);
    const headlineText = inputs.title?.text ?? structure.title;
    const headline = headlineText && headlineText.trim()
        ? fitHeadlineText(headlineText, block, design.title.headline.fontSize ?? 14, design.title.deck.fontSize ?? 11, measure.headline)
        : undefined;
    const deck = deckText(inputs);
    const deckFit = deck && deck.trim() ? fitDeckText(deck, block, design.title.deck.fontSize ?? 11, measure.deck) : undefined;
    return { block, ...(headline ? { headline } : {}), ...(deck !== undefined ? { deck } : {}), ...(deckFit ? { deckFit } : {}) };
}

/** The plot's height once the fitted title's extra lines are taken out of it. */
export function heightAfterTitle(height: number, title: TitlePlan | undefined): number {
    let out = height;
    if (title?.headline?.lines) out = plotHeightAfter(out, title.headline.taken);
    if (title?.deckFit) out = plotHeightAfter(out, title.deckFit.taken);
    return out;
}
