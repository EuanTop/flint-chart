import type { ChartAnalysis } from './analyze';
import type { AssembleOptions, ChartWarning, LayoutDeclaration, LayoutResult, OverflowResult, PlotPlanContext } from './types';
import type { ThemeReport, ThemeSpec } from './theme/types';
import { computeChannelBudgets, computeLayout, deriveStretchCaps, planBandLabels, resolveFacetColumnsOption } from './compute-layout';
import { resolveBandFraction, resolveThemeFontSize } from './theme/ground';
import { filterOverflow } from './filter-overflow';

/** The layout options a backend lays out with when neither the caller, the theme, nor the template sets them. */
export interface BackendLayoutProfile {
    /** Under the caller's options and the template's overrides. */
    defaults: AssembleOptions;
    /** Filled in after the theme's band step is settled, wherever the option is still unset. */
    fallbacks: AssembleOptions;
    /** Padding, in steps, of a band axis whose offset channel nests marks within each band. */
    nestedBandPadding: { inner: number; outer: number };
}

/** The size a chart is planned into. */
export interface LayoutSize {
    /** The target size, clamped to `canvasSize`. */
    baseSize: { width: number; height: number };
    /** The hard ceiling, when the spec or the theme sets one. */
    canvasSize?: { width: number; height: number };
}

export interface LayoutPlan {
    /** The plot the chart draws: a banded axis spans its step times its count. One panel's, when composite. */
    plot: { width: number; height: number };
    /** Whether the chart draws several views (facets, or a composite template), so it has no single plot. */
    composite: boolean;
    layout: LayoutResult;
    /** The theme's axis label size at this plot size; undefined without a theme. */
    axisLabelFontSize: number | undefined;
    declaration: LayoutDeclaration;
    /** The options the plan was made with. */
    options: AssembleOptions;
    facetGrid: ReturnType<typeof computeChannelBudgets>['facetGrid'];
    /** The rows that fit, after overflow truncation. */
    rows: any[];
    nominalCounts: OverflowResult['nominalCounts'];
    viewports: OverflowResult['viewports'];
    warnings: ChartWarning[];
    report: ThemeReport[];
}

/** A key charges the dimension it sits along, and only that one. */
const SIDE_KEY = new Set(['right', 'left', 'seriesEnd']);
const STACKED_KEY = new Set(['top', 'bottom']);

/**
 * A soft margin for what a chart draws *around* its plot.
 *
 * Read off presence rather than measured: is there a title block, where does
 * the key sit, is the axis labelled at all. Wrong in the small — a long name
 * costs more than a short one, a facet pays per panel — but it stops the fit
 * aiming a banded axis at room the axes and key have already spent.
 */
const FURNITURE = {
    /** Tick labels down the side of the plot. */
    valueGutter: 70,
    /** One line of tick labels under it. */
    tickGutter: 35,
    /** Headline plus deck. */
    titleBlock: 30,
    /** A key in the side margin. */
    sideKey: 100,
    /** A key above or below. */
    stackedKey: 30,
};

/** Everything a plan reads besides the analysis. */
export interface PlanContext {
    /** Chart properties after the theme's chart defaults. */
    chartProperties: Record<string, any> | undefined;
    /** Chart properties as the spec states them. */
    authoredProperties: Record<string, any> | undefined;
    /** The spec's semantic types, as it states them. */
    semanticTypes: PlotPlanContext['semanticTypes'];
    /** Compile options after the theme's compile defaults. */
    options: AssembleOptions;
    size: LayoutSize;
    /** Whether a title or subtitle is drawn above the plot. */
    titled: boolean;
    /** The chart type the spec names. */
    chartType: string;
    /** The rows in view when a window or a filter narrows them: a subset of the analysis rows. */
    rows?: any[];
    /** Decisions held at the values given. */
    pins?: { plot?: { width: number; height: number } };
    /** The theme's settings that change how the chart is laid out. */
    theme: Pick<ThemeSpec, 'layout' | 'legend' | 'type' | 'marks' | 'geometry'> | undefined;
    profile: BackendLayoutProfile;
    /**
     * Whether names on a banded axis may wrap onto two lines, widening the band to hold them;
     * `skip` leaves an axis whose labels the template states itself.
     */
    bandLabels?: { skip: (channel: 'x' | 'y') => boolean };
}

/** The marks a template draws, as its static spec states them. */
function templateMarks(template: ChartAnalysis['template']): Set<string> {
    const marks = new Set<string>();
    const visit = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        const mark = typeof node.mark === 'string' ? node.mark : node.mark?.type;
        if (mark) marks.add(mark);
        for (const child of [...(node.layer ?? []), node.spec].filter(Boolean)) visit(child);
    };
    visit(template.template);
    return marks;
}

export function planLayout(
    analysis: Pick<ChartAnalysis, 'channelSemantics' | 'data' | 'convertedData' | 'encodings' | 'template' | 'templateMarkType'>,
    context: PlanContext,
): LayoutPlan {
    const { channelSemantics, data, convertedData, encodings, template, templateMarkType } = analysis;
    const { chartProperties, authoredProperties, options, size, titled, theme, profile } = context;
    const report: ThemeReport[] = [];
    const rowsInView = context.rows ?? convertedData;

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 0a: declareLayoutMode (VL-free template hook)
    // ═══════════════════════════════════════════════════════════════════════

    const declaration: LayoutDeclaration = template.declareLayoutMode
        ? template.declareLayoutMode(channelSemantics, data, chartProperties)
        : {};

    // Auto-detect binnedAxes from template encoding if not declared
    if (!declaration.binnedAxes) {
        const templateEnc = template.template?.encoding;
        if (templateEnc) {
            const binnedAxes: Record<string, boolean | { maxbins?: number }> = {};
            for (const axis of ['x', 'y']) {
                if (templateEnc[axis]?.bin) {
                    // Use chartProperties.binCount (the maxbins cap) when the user
                    // has set one so layout sizing matches the rendered bins; a
                    // value of 0/undefined means "auto" (Vega's default ~10 cap).
                    const propBins = chartProperties?.binCount;
                    if (propBins) {
                        binnedAxes[axis] = { maxbins: propBins };
                    } else if (typeof templateEnc[axis].bin === 'object' && templateEnc[axis].bin.maxbins) {
                        binnedAxes[axis] = templateEnc[axis].bin;
                    } else {
                        binnedAxes[axis] = { maxbins: 10 };
                    }
                }
            }
            if (Object.keys(binnedAxes).length > 0) {
                declaration.binnedAxes = binnedAxes;
            }
        }
    }

    // Merge paramOverrides into effective options
    const effectiveOptions: AssembleOptions = {
        ...profile.defaults,
        ...options,
        ...(declaration.paramOverrides || {}),
    };

    // How much room one category gets is a house decision — a journal that
    // prints three wide boxes and a dashboard that prints thirty thin bars are
    // both right about their own page. A template's band size is a guess made
    // without knowing the house, so the house's number replaces it; a caller
    // who states one outranks both.
    //
    // But a band step is a statement about bar thickness, and where *both* axes
    // are banded there are no bars: the marks are cells, and a cell's size is
    // fixed by the two counts and the room they share. A house that asks for
    // A bar-sized category step would print a grid of stripes. That one the
    // layout keeps.
    const houseBandStep = theme?.layout?.bandStep;
    const houseBandStepFit = theme?.layout?.bandStepFit;
    const cellGrid = declaration.axisFlags?.x?.banded === true
        && declaration.axisFlags?.y?.banded === true;
    // A template may state a floor its read cannot go below (a slopegraph needs
    // its two columns spread wide however compact the house). The house sets
    // the band step, but not below that floor.
    const minBandStep = (declaration.paramOverrides as AssembleOptions | undefined)?.minBandStep;
    if (houseBandStepFit != null && options.bandStepFit == null && !cellGrid) {
        effectiveOptions.bandStepFit = Math.max(0, Math.min(1, houseBandStepFit));
        report.push({
            stage: 'ground',
            path: 'layout.bandStepFit',
            message: `the house blends ${Math.round(effectiveOptions.bandStepFit * 100)}% toward the available span per category`,
        });
    }
    const fitsToRoom = (effectiveOptions.bandStepFit ?? 0) > 0;
    if (houseBandStep && options.defaultBandSize == null && !cellGrid) {
        const step = minBandStep ? Math.max(houseBandStep, minBandStep) : houseBandStep;
        effectiveOptions.defaultBandSize = step;
        // A house that also fits its sparse bands to the room has to be able to
        // pass its own base pitch; the layout's sparse ceiling holds it in.
        if (!fitsToRoom) {
            effectiveOptions.maxBandSize = Math.max(step, effectiveOptions.maxBandSize ?? 0);
        }
        report.push({
            stage: 'ground',
            path: 'layout.bandStep',
            message: minBandStep && step > houseBandStep
                ? `the house gives each category ${houseBandStep}px, but this chart reads only above ${minBandStep}px — held to ${step}px`
                : `the house gives each category ${houseBandStep}px`,
        });
    } else if (houseBandStep && cellGrid) {
        report.push({
            stage: 'ground',
            path: 'layout.bandStep',
            message: `the house asks for ${houseBandStep}px categories, but both axes are banded — the marks are cells, whose size the grid settles, not the house`,
        });
    }

    for (const [key, value] of Object.entries(profile.fallbacks)) {
        const options = effectiveOptions as Record<string, unknown>;
        if (options[key] == null) options[key] = structuredClone(value);
    }

    // Resolve the optional canvasSize ceiling into per-dimension stretch caps
    // (βx, βy) so single plots AND facet grids honor the same budget. Falls
    // back to maxStretch when no ceiling is set.
    const caps = deriveStretchCaps(size.baseSize, size.canvasSize, effectiveOptions);
    effectiveOptions.maxStretchX = caps.maxStretchX;
    effectiveOptions.maxStretchY = caps.maxStretchY;
    // The fit aims at the room the *plot* gets, not the whole box: a chart that
    // spends its margins on a value gutter and a key has that much less to hand
    // its bands. The reserve is a soft margin, not a guarantee.
    const keyPlacement: string[] = theme?.legend?.placement ?? [];
    // A key is reserved on the house's placement alone. Whether one appears is
    // a fact about the compiled spec, and templates that build their own from a
    // working column (a waterfall's step types) never show a bound channel here.
    const keyed = Boolean(channelSemantics.color?.field || channelSemantics.group?.field)
        || template.channels?.includes('color') === true;
    const reserveW = (channelSemantics.y?.field ? FURNITURE.valueGutter : 0)
        + (keyed && keyPlacement.some((p) => SIDE_KEY.has(p)) ? FURNITURE.sideKey : 0);
    const reserveH = (channelSemantics.x?.field ? FURNITURE.tickGutter : 0)
        + (titled ? FURNITURE.titleBlock : 0)
        + (keyed && keyPlacement.some((p) => STACKED_KEY.has(p)) ? FURNITURE.stackedKey : 0);
    const ceilingW = size.canvasSize?.width ?? size.baseSize.width;
    const ceilingH = size.canvasSize?.height ?? size.baseSize.height;
    // Furniture may take a chart's margins, never most of its plot.
    effectiveOptions.bandStepFitCapacityX = Math.max(ceilingW * 0.6, ceilingW - reserveW);
    effectiveOptions.bandStepFitCapacityY = Math.max(ceilingH * 0.6, ceilingH - reserveH);
    effectiveOptions.facetColumns = resolveFacetColumnsOption(authoredProperties);

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 0b: filterOverflow (VL-free)
    // ═══════════════════════════════════════════════════════════════════════

    // Collect mark types for sort strategy
    const allMarkTypes = new Set<string>();
    if (templateMarkType) allMarkTypes.add(templateMarkType);
    if (Array.isArray(template.template?.layer)) {
        for (const layer of template.template.layer) {
            const lm = typeof layer.mark === 'string' ? layer.mark : layer.mark?.type;
            if (lm) allMarkTypes.add(lm);
        }
    }

    // ── Channel budgets (shared, in layout module) ─────────────────────
    // Computes per-channel max-to-keep using the most conservative
    // assumptions (minStep, maxStretch).  Also decides facet grid.
    const budgets = computeChannelBudgets(
        channelSemantics, declaration, rowsInView, size.baseSize, effectiveOptions,
    );
    const facetGridResult = budgets.facetGrid;

    const overflowResult = filterOverflow(
        channelSemantics, declaration, encodings, rowsInView,
        budgets, allMarkTypes,
    );

    const values = overflowResult.filteredData;
    const nominalCounts = overflowResult.nominalCounts;

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 1: Compute Layout (VL-free)
    // ═══════════════════════════════════════════════════════════════════════

    const layoutResult = computeLayout(
        channelSemantics,
        declaration,
        values,  // post-overflow filtered data
        size.baseSize,
        effectiveOptions,
        facetGridResult,
        context.pins?.plot,
    );

    // Attach overflow truncations from filterOverflow
    layoutResult.truncations = overflowResult.truncations;

    // A banded axis spans its step times its bands. A truncated axis draws one more band, for the
    // placeholder that names what was omitted; a group-unit step spans one category. A plain band
    // spans exactly its bands; a point scale and a nested band add their padding at the ends.
    const themeFillsBars = !!theme && [...templateMarks(template)].some((mark) => mark === 'bar' || mark === 'rect' || mark === 'boxplot');
    const bandSpan = (channel: 'x' | 'y'): number => {
        const step = channel === 'x' ? layoutResult.xStep : layoutResult.yStep;
        const grouped = (channel === 'x' ? layoutResult.xStepUnit : layoutResult.yStepUnit) === 'group';
        const placeholder = layoutResult.truncations.some((truncation) => truncation.channel === channel) ? 1 : 0;
        const bands = (grouped ? nominalCounts[channel] : (channel === 'x' ? layoutResult.xNominalCount : layoutResult.yNominalCount)) + placeholder;
        const shape = declaration.bandAxes?.[channel] ?? { scale: 'band', nested: grouped };
        if (shape.scale === 'point') return step * (bands - 1 + 2 * shape.padding);
        if (!shape.nested) return step * bands;
        const inner = themeFillsBars
            ? Math.max(0, Math.min(0.9, 1 - resolveBandFraction(theme as ThemeSpec, context.chartType, template.geometryKinds, layoutResult.stepPadding)))
            : profile.nestedBandPadding.inner;
        return step * (bands - inner + 2 * profile.nestedBandPadding.outer);
    };
    const axisLabelFontSize = theme
        ? resolveThemeFontSize(theme as ThemeSpec, theme.type?.axisLabel?.size, 10, layoutResult.subplotWidth || size.baseSize.width)
        : undefined;
    if (context.bandLabels) {
        planBandLabels(
            { layout: layoutResult, canvasSize: size.baseSize, channelSemantics, assembleOptions: effectiveOptions, table: values },
            { fontSize: axisLabelFontSize, skip: context.bandLabels.skip },
        );
    }

    return {
        plot: template.planPlot?.({
            layout: layoutResult,
            canvasSize: size.baseSize,
            assembleOptions: effectiveOptions,
            channelSemantics,
            table: values,
            fullTable: convertedData,
            semanticTypes: context.semanticTypes,
            chartProperties,
        }) ?? {
            width: layoutResult.xNominalCount > 0 ? bandSpan('x') : layoutResult.subplotWidth,
            height: layoutResult.yNominalCount > 0 ? bandSpan('y') : layoutResult.subplotHeight,
        },
        composite: Boolean(template.composite || layoutResult.facet),
        layout: layoutResult,
        axisLabelFontSize,
        declaration,
        options: effectiveOptions,
        facetGrid: facetGridResult,
        rows: values,
        nominalCounts,
        viewports: overflowResult.viewports,
        warnings: overflowResult.warnings,
        report,
    };
}
