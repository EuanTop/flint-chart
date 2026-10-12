import type { ChartAnalysis } from './analyze';
import type { AssembleOptions, ChannelSemantics, ChartEncoding, ChartWarning, LayoutDeclaration, LayoutResult, OverflowResult, PlotPlanContext } from './types';
import type { DesignDecisions, ThemeReport, ThemeSpec } from './theme/types';
import { computeChannelBudgets, computeLayout, deriveStretchCaps, planBandLabels, resolveFacetColumnsOption } from './compute-layout';
import { groundTheme, headlineText, resolveBandFraction, resolveThemeFontSize, resolveValueLabelChoice, themeBodyFamily } from './theme/ground';
import { filterOverflow } from './filter-overflow';
import { axisRoles, type AxisFieldFacts } from './axis-roles';
import { axisTitles, chartDisplayNames, chartStructure, segmentedBands, stackedAxis, type ChartStructure } from './structure';
import { continuousBandSpan, freeHeadroom, measureDomain, measureExtent, type MeasureDomain } from './measure-domain';
import { planValueLabels, type ValueLabelPlan } from './value-label-plan';
import { niceDomain, spacingRuler, type AxisRuler } from './ruler';
import { planFurniture, type FurniturePlan } from './furniture-plan';
import { categoryOrder, encodedType, sizeRange, type CategoryOrder } from './channel-decisions';
import { planLegendPlacement, type RunValueScale } from './series-end';
import { keysToLayout, planLegend, type LegendPlan } from './legend-plan';
import { tableTextMeasurer } from './text-width';
import { planKeyLayout, type TextMeasurer } from './legend-layout';
import { encodingTitle } from './structure';
import { format as formatNumber } from 'd3-format';
import { heightAfterTitle, planTitle, type TitlePlan } from './title-plan';
import { planAxisLabels, type AxisLabelFacts, type AxisLabelPlan } from './axis-labels';
import { measureReserve, NO_RESERVE, type FurnitureReserve, type FurnitureSpacing } from './furniture-reserve';

/** The layout options a backend lays out with when neither the caller, the theme, nor the template sets them. */
export interface BackendLayoutProfile {
    /** Under the caller's options and the template's overrides. */
    defaults: AssembleOptions;
    /** Filled in after the theme's band step is settled, wherever the option is still unset. */
    fallbacks: AssembleOptions;
    /** Padding, in steps, of a band axis whose offset channel nests marks within each band. */
    nestedBandPadding: { inner: number; outer: number };
    /** How the backend spells a data field in its spec. */
    spellField: (name: string) => string;
    /** How the backend measures text it sets; unset reads the width table. */
    measureText?: TextMeasurer;
    /** The room the backend sets around text where the theme states none. */
    spacing: FurnitureSpacing;
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
    /** The tick labels each axis draws. */
    axisLabels: Record<'x' | 'y', AxisLabelPlan>;
    /** What the chart draws. */
    structure: ChartStructure;
    /** The theme's decisions for this chart. */
    design: DesignDecisions;
    /** The title each axis prints; null leaves it untitled, undefined leaves it to the backend. */
    axisTitles: Record<'x' | 'y', string | null | undefined>;
    /** The extent Flint gives each quantitative axis that shows a field. */
    domains: Partial<Record<'x' | 'y', MeasureDomain>>;
    /** What the chart draws around its plot, as far as it takes room. */
    furniture: FurniturePlan;
    /** The room kept for the furniture where a banded axis fits its steps to the room; undefined where none does. */
    reserve?: FurnitureReserve;
    /** The order each channel's categories stand in, where Flint sets one. */
    orders: Partial<Record<string, CategoryOrder>>;
    /** The areas a size channel spans, in px², and whether it reads a quantity. */
    sizes?: { range: [number, number]; quantitative: boolean };
    /** Where the chart names its series and the keys it draws. */
    legend: LegendPlan;
    /** The area the theme's dots are drawn at, in px²: its size, less where dots would ink more than 12% of a panel. */
    pointSize?: number;
    /** The px each dot scale opens past its ends so the outermost dot shows whole: the dot's radius, on the axes of dots nothing anchors. */
    points?: { radius: number; channels: Array<'x' | 'y'> };
    /** The span each banded continuous axis draws, half a band past its data at each end; dates in epoch ms. */
    bandSpans: Partial<Record<'x' | 'y', { span: [number, number]; temporal: boolean }>>;
    /** The ruler each themed measure axis draws, where Flint owns it. */
    rulers: Partial<Record<'x' | 'y', AxisRuler>>;
    /** The value labels the chart prints, or why it prints none; undefined when none are asked for. */
    valueLabels?: ValueLabelPlan | { refused: string };
    /** How a single-view chart's title is fitted; the plot gives up the height its extra lines take. */
    title?: TitlePlan;
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

const LENGTH_MARKS = new Set(['bar', 'area', 'rect']);

/**
 * The extent of each quantitative axis that shows a field, from the field's semantics and how the
 * chart stacks; an axis whose template states its baseline reads zero from it.
 */
function measureDomains(
    structure: ChartStructure, segmented: boolean, channelSemantics: Record<string, ChannelSemantics>, rows: any[],
): Partial<Record<'x' | 'y', MeasureDomain>> {
    const lengthMark = structure.marks.some((mark) => LENGTH_MARKS.has(mark));
    const summed = segmented && structure.stacking !== 'normalized' ? stackedAxis(structure) : undefined;
    const out: Partial<Record<'x' | 'y', MeasureDomain>> = {};
    for (const channel of ['x', 'y'] as const) {
        const axis = structure[channel];
        if (!axis || axis.type !== 'quantitative') continue;
        const field = channelSemantics[channel]?.field;
        const governed = Boolean(field && !axis.derived && !axis.extent && axis.fields.includes(field));
        const measured: MeasureDomain = governed
            ? measureDomain({ channel, field: field!, summed: summed === channel, lengthMark, channelSemantics, rows })
            : { dropZero: false };
        const domain: MeasureDomain = axis.baseline ? { ...measured, zero: axis.baseline === 'zero' } : measured;
        const stacks = stackedAxis(structure) === channel;
        const extent = measureExtent({
            axis,
            other: structure[channel === 'x' ? 'y' : 'x'],
            stack: stacks && structure.stacking === 'normalized' ? 'normalized'
                : stacks && structure.stacking === 'centered' ? 'centered'
                : summed === channel ? 'summed' : 'none',
            facets: [channelSemantics.column?.field, channelSemantics.row?.field].filter((f): f is string => Boolean(f)),
            lengthMark: lengthMark && stacks,
            domain,
            rows,
        });
        if (governed || extent) out[channel] = extent ? { ...domain, extent } : domain;
    }
    return out;
}

/** The drawn length of each axis: the plot, less the lines a fitted title takes and the room value labels keep past bar ends. */
function drawnLengths(
    plot: { width: number; height: number }, title: TitlePlan | undefined, valueLabels: ValueLabelPlan | { refused: string } | undefined,
): Record<'x' | 'y', number> {
    const inset = valueLabels && !('refused' in valueLabels) ? valueLabels.inset ?? 0 : 0;
    const insets = inset && valueLabels && !('refused' in valueLabels) && valueLabels.negative ? 2 : 1;
    return { x: plot.width - inset * insets, y: heightAfterTitle(plot.height, title) };
}

const ANCHORED_MARKS = new Set(['bar', 'area', 'rect', 'rule', 'arc']);
const DOT_MARKS = new Set(['point', 'circle', 'square']);

/** The smallest step a d3 format can tell apart from its neighbour: what its precision prints. */
function formatResolution(pattern: string | undefined): number {
    const match = pattern?.match(/\.(\d+)([f%])/);
    if (!match) return 0;
    return 10 ** -(Number(match[1]) + (match[2] === '%' ? 2 : 0));
}

/**
 * Whether the chart draws dots nothing anchors: no bar, area, rule or arc, and no zero rule the
 * theme draws where the data crosses zero. Realization pads such dots off the plot's edge.
 */
function unanchoredDots(structure: ChartStructure, design: DesignDecisions, rows: any[]): boolean {
    const crossesZero = (field: string | undefined) => Boolean(field)
        && rows.some((row) => Number(row?.[field!]) < 0) && rows.some((row) => Number(row?.[field!]) > 0);
    const zeroRuled = (['x', 'y'] as const).some((channel) => design.axes[channel]?.zeroRule?.show
        && !structure[channel]?.derived && crossesZero(structure[channel]?.fields[0]));
    return structure.marks.some((mark) => DOT_MARKS.has(mark)) && !structure.marks.some((mark) => ANCHORED_MARKS.has(mark)) && !zeroRuled;
}

/** The area below which a dot stops reading as a dot, about 5 px across, in px². */
const MIN_DENSE_POINT_SIZE = 20;
/** The share of a panel a chart's dots may ink between them. */
const DOT_INK_SHARE = 0.12;

/**
 * The area a theme's dots are drawn at: its size, shrunk where the chart's dots would ink more than
 * 12% of the panel they are drawn in between them, to no less than 20 px². Facets share the rows
 * among their panels.
 */
function planPointSize(
    design: DesignDecisions, structure: ChartStructure, rows: any[], plot: { width: number; height: number },
    channelSemantics: Record<string, ChannelSemantics>, report: ThemeReport[],
): number | undefined {
    const house = design.marks.point?.size;
    if (house == null) return undefined;
    let panels = 1;
    for (const field of [channelSemantics.column?.field, channelSemantics.row?.field]) {
        if (field) panels *= Math.max(1, new Set(rows.map((row) => row?.[field]).filter((value) => value != null)).size);
    }
    const perPanel = rows.length / panels;
    const cloud = rows.length > 0 && structure.marks.some((mark) => DOT_MARKS.has(mark));
    const size = cloud
        ? Math.min(house, Math.max(MIN_DENSE_POINT_SIZE, Math.floor((plot.width * plot.height * DOT_INK_SHARE) / perPanel)))
        : house;
    if (size !== house) {
        report.push({
            stage: 'ground',
            path: 'marks.point.size',
            code: 'dots-shrunk',
            message: `${Math.round(perPanel)} points would cover too much of the ${Math.round(plot.width)}×${Math.round(plot.height)}px plot at ${house}px² each, so the dots shrink to ${size}px²`,
        });
    }
    return size;
}

/** The outline a theme's dots are drawn with: thinner on small dots, so the ring does not fill them. */
export function pointOutlineWidth(design: DesignDecisions, size: number | undefined): number | undefined {
    const outline = design.marks.outline;
    return outline && size != null ? Math.min(outline.width, Math.max(1.2, Math.sqrt(size) * 0.22)) : outline?.width;
}

/**
 * Where a theme's dots open their scales: by the drawn dot's outer radius, on each continuous axis
 * of dots nothing anchors, unless the axis holds zero or a domain set at both ends.
 */
function pointPadding(
    structure: ChartStructure, design: DesignDecisions, rows: any[], size: number | undefined,
    domains: Partial<Record<'x' | 'y', MeasureDomain>>, bandSpans: LayoutPlan['bandSpans'],
    typeOf: (channel: 'x' | 'y') => string | undefined, channelSemantics: Record<string, ChannelSemantics>,
): LayoutPlan['points'] {
    if (!unanchoredDots(structure, design, rows)) return undefined;
    const radius = Math.ceil(Math.sqrt((size ?? 30) / Math.PI) + (pointOutlineWidth(design, size) ?? 0) / 2);
    const channels = (['x', 'y'] as const).filter((channel) => {
        const type = typeOf(channel);
        const bounds = domains[channel]?.bounds;
        return Boolean(channelSemantics[channel]?.field) && (type === 'quantitative' || type === 'temporal')
            && domains[channel]?.zero !== true && !bandSpans[channel] && !(bounds?.min !== undefined && bounds.max !== undefined);
    });
    return radius > 0 && channels.length ? { radius, channels } : undefined;
}

interface RulerContext {
    structure: ChartStructure;
    design: DesignDecisions;
    domains: Partial<Record<'x' | 'y', MeasureDomain>>;
    channelSemantics: Record<string, ChannelSemantics>;
    encodings: Record<string, any>;
    axisLabels: Record<'x' | 'y', AxisLabelPlan>;
    valueLabels: ValueLabelPlan | { refused: string } | undefined;
    /** The axes' drawn lengths, in px. */
    length: Record<'x' | 'y', number>;
    /** How the backend measures text it sets. */
    measure: TextMeasurer;
    points?: LayoutPlan['points'];
}

/**
 * The ruler of each themed measure axis Flint can draw: one with a planned extent, read on a
 * linear scale from rows as they are, not aggregated, binned, held to set ticks, ticked at
 * observed values, or ruled by the template itself. A gridded axis rounds its free ends to the
 * step. An ungridded one rounds as the backend's default does, except at an end value labels
 * extend (unless a single semantic bound asks for rounding) and on dots that nothing anchors (no
 * bar, area, rule or zero rule), which the realization pads instead. An axis the structure keeps
 * unrounded keeps the data's span, as does a field whose semantics turn rounding off; dots tick
 * into the padding that opens round the outermost dot. Labels stand no closer than the widest one
 * plus its separation along x (measured as the backend measures text, the end labels counting whole, as the
 * backend flushes them inside the plot), or a line of text plus that separation along y (a line
 * and a half where the theme flushes the end labels too), and the step is never finer than the
 * axis can name.
 */
function measureRulers(context: RulerContext): Partial<Record<'x' | 'y', AxisRuler>> {
    const { structure, design, domains, channelSemantics, encodings, axisLabels, valueLabels, length, measure, points } = context;
    const out: Partial<Record<'x' | 'y', AxisRuler>> = {};
    for (const channel of ['x', 'y'] as const) {
        const axis = structure[channel];
        const decided = design.axes[channel];
        const domain = domains[channel];
        const cs = channelSemantics[channel];
        if (!axis || axis.type !== 'quantitative' || axis.ownScale || !domain?.extent) continue;
        if (decided?.role !== 'measure' || decided.tickSpacing == null) continue;
        if (decided.indexing && decided.tickLabels && decided.tickLabels !== 'all') continue;
        if (encodings[channel]?.aggregate || encodings[channel]?.bin || cs?.tickConstraint?.exactTicks) continue;
        if (cs?.scaleType && cs.scaleType !== 'linear') continue;
        const grid = decided.grid.show;
        const headroom = valueLabels && !('refused' in valueLabels) && valueLabels.channel === channel ? valueLabels.headroom : undefined;
        const padded = points?.channels.includes(channel) === true;
        const tight = axis.rounded === false || (axis.rounded === undefined && cs?.nice === false) || (padded && !grid);
        const roundsThrough = grid || (domain.bounds !== undefined && (domain.bounds.min === undefined) !== (domain.bounds.max === undefined));
        const fixed = {
            min: tight || domain.bounds?.min !== undefined || (!roundsThrough && headroom?.min !== undefined),
            max: tight || domain.bounds?.max !== undefined || domain.stackTop !== undefined || (!roundsThrough && headroom?.max !== undefined),
        };
        const labels = axisLabels[channel];
        const pattern = cs?.format?.pattern;
        const print = formatNumber(pattern ?? ',.12~g');
        const separation = labels.separation ?? Math.round(labels.fontSize * 0.6);
        const text = (value: number) => `${cs?.format?.prefix ?? ''}${print(value)}${cs?.format?.suffix ?? ''}`;
        const minSpacing = channel === 'x'
            ? (values: number[]) => {
                const widths = values.map((value) => measure(labels.fontSize, labels.font ?? 'sans-serif', 'normal', 'normal')(text(value)));
                let need = 0;
                for (let index = 0; index + 1 < widths.length; index += 1) {
                    const first = index === 0;
                    const last = index + 2 === widths.length;
                    const span = (first ? widths[index] : widths[index] / 2) + (last ? widths[index + 1] : widths[index + 1] / 2);
                    need = Math.max(need, span + separation);
                }
                return need;
            }
            : () => Math.ceil(labels.fontSize * 1.2) * (decided.label.flush ? 1.5 : 1) + separation;
        const minStep = Math.max(cs?.tickConstraint?.integersOnly ? cs.tickConstraint.minStep ?? 1 : 0, formatResolution(pattern));
        const [lo, hi] = domain.extent;
        const radius = points?.radius ?? 0;
        const overhang = padded && (fixed.min || fixed.max) && length[channel] > 2 * radius
            ? (radius * (hi - lo)) / (length[channel] - 2 * radius) : 0;
        const ruler = spacingRuler({
            extent: domain.extent, fixed, toStep: grid, length: length[channel], spacing: decided.tickSpacing, minSpacing, minStep, overhang,
        });
        if (ruler) out[channel] = ruler;
    }
    return out;
}

/**
 * The value scale runs are read against, as the plan draws it: the ruler's domain, else the
 * semantic bounds and the stack's clean top, including zero unless the axis or Flint fits it to
 * the data; a template that rules its own axis reads its extent, and themed dots on a gridded axis
 * the plan leaves to the backend read their data rounded to the theme's tick count.
 */
function runValueScale(
    structure: ChartStructure,
    domains: Partial<Record<'x' | 'y', MeasureDomain>>,
    rulers: Partial<Record<'x' | 'y', AxisRuler>>,
    cs: ChannelSemantics | undefined,
    design: DesignDecisions,
    rows: any[],
    themed: boolean,
): RunValueScale {
    const axis = structure.y;
    const domain = domains.y;
    const reverse = axis?.reversed === true || (cs?.reversed === true && axis?.type === 'quantitative');
    const linear = !cs?.scaleType || cs.scaleType === 'linear';
    const ruler = rulers.y;
    const bounds = domain?.bounds;
    const fixed = bounds?.min !== undefined && bounds?.max !== undefined;
    const zero = axis?.baseline === 'zero' ? true : axis?.baseline === 'data' ? false
        : fixed && domain?.dropZero ? true : domain?.zero ?? true;
    if (ruler) return { min: ruler.domain[0], max: ruler.domain[1], zero, reverse, linear };
    if (axis?.ownScale && domain?.extent) return { min: domain.extent[0], max: domain.extent[1], zero, reverse, linear };
    const decided = design.axes.y;
    const field = axis && !axis.derived ? axis.fields[0] : undefined;
    if (themed && field && !bounds && domain?.zero !== true && decided?.grid.show && decided.tickCount != null
        && unanchoredDots(structure, design, rows)) {
        const values = rows.map((row) => row?.[field]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
        const lo = Math.min(...values);
        const hi = Math.max(...values);
        if (values.length && hi > lo) {
            const [min, max] = niceDomain(lo, hi, decided.tickCount);
            return { min, max, zero, reverse, linear };
        }
    }
    return { min: bounds?.min, max: bounds?.max ?? domain?.stackTop, zero, reverse, linear };
}

/** The order of each channel's categories the template draws, faceting included. */
function categoryOrders(
    template: { channels?: string[] },
    structure: ChartStructure,
    encodings: Record<string, ChartEncoding>,
    channelSemantics: Record<string, ChannelSemantics>,
    data: any[],
    semanticTypes: PlanContext['semanticTypes'],
): Partial<Record<string, CategoryOrder>> {
    const drawn = new Set([...(template.channels ?? []), 'column', 'row']);
    const out: Partial<Record<string, CategoryOrder>> = {};
    for (const [channel, encoding] of Object.entries(encodings)) {
        if (!drawn.has(channel)) continue;
        const own = categoryOrder({ channel, encoding, encodings, cs: channelSemantics[channel], data, semanticTypes: semanticTypes ?? {} });
        const stated = channel === 'x' || channel === 'y' ? structure[channel]?.order : undefined;
        const order = stated && (stated.fixed || !own || own.by === 'data') ? stated.order : own;
        if (order) out[channel] = order;
    }
    return out;
}

/** The positional channels a template's skeleton draws whatever the data names, such as a histogram's count. */
function skeletonChannels(skeleton: any): Set<string> {
    const channels = new Set<string>();
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        for (const channel of ['x', 'y']) if (node.encoding?.[channel]) channels.add(channel);
        for (const child of [...(node.layer ?? []), ...(node.vconcat ?? []), ...(node.hconcat ?? []), ...(node.concat ?? [])]) walk(child);
        if (node.spec) walk(node.spec);
    };
    walk(skeleton);
    return channels;
}

/**
 * Whether value labels may print. A template that presents values in a column of its own takes
 * them off. The label layer prints one value per mark, read from the data, so a measure axis must
 * read a single field (or count rows); a range, or a measure the chart computes, prints only where
 * the template prints its own values and the author asked.
 */
function valueLabelChoice(
    template: { suppressValueLabels?: boolean; ownsValueLabels?: boolean },
    structure: ChartStructure,
    asked: 'on' | 'off' | undefined,
): 'on' | 'off' | undefined {
    if (template.suppressValueLabels) return 'off';
    const printable = (axis: ChartStructure['x']) => !axis || axis.type !== 'quantitative'
        || (axis.derived === undefined && !axis.range && axis.fields.length > 0) || axis.derived === 'count';
    if (printable(structure.x) && printable(structure.y)) return asked;
    return template.ownsValueLabels && asked === 'on' ? 'on' : 'off';
}

/**
 * An axis's tick labels with pinned values in place of the planned ones. A pinned angle brings
 * its own anchoring; the plan's crowding and refusal notes no longer apply to what was pinned.
 */
function pinAxisLabels(planned: AxisLabelPlan, pin: { fontSize?: number; angle?: number }): AxisLabelPlan {
    const { crowdedFrom, straightRefused, ...rest } = planned;
    const next: AxisLabelPlan = { ...rest };
    if (pin.fontSize !== undefined) next.fontSize = pin.fontSize;
    else if (crowdedFrom !== undefined) next.crowdedFrom = crowdedFrom;
    if (pin.angle !== undefined) {
        next.angle = pin.angle;
        next.align = pin.angle === 0 ? 'center' : 'right';
        next.baseline = Math.abs(pin.angle) >= 90 ? 'middle' : 'top';
    } else if (straightRefused) {
        next.straightRefused = straightRefused;
    }
    return next;
}

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
    /** The headline and deck the author wrote, as a title. */
    title?: { text: string; subtitle?: string[] };
    /** The names the author gave fields. */
    fieldDisplayNames?: Record<string, string>;
    /** The chart type the spec names. */
    chartType: string;
    /** The rows in view when a window or a filter narrows them: a subset of the analysis rows. */
    rows?: any[];
    /** Decisions held at the values given. */
    pins?: {
        plot?: { width: number; height: number };
        title?: TitlePlan;
        /** Tick label decisions held at the values given, however crowded the axis. */
        axisLabels?: Partial<Record<'x' | 'y', { fontSize?: number; angle?: number }>>;
        /** The room kept for the furniture, so the rows in view do not move the fitted steps through it. */
        reserve?: FurnitureReserve;
    };
    /** The theme the chart is drawn in. */
    theme: ThemeSpec | undefined;
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

type PlanAnalysis = Pick<ChartAnalysis, 'channelSemantics' | 'data' | 'convertedData' | 'encodings' | 'template' | 'templateMarkType' | 'staticSeries'>;

/** The headline and deck the chart prints: the author's, else the one its structure states. */
function printedTitle(context: PlanContext, structure: ChartStructure): { text: string; subtitle?: string[] } | undefined {
    return context.title ?? (structure.title !== undefined ? { text: structure.title } : undefined);
}

/**
 * The layout plan. Where a banded axis fits its steps to the room the canvas leaves, the room is
 * the canvas less what the chart draws around its plot: the plan is laid out with none kept, the
 * furniture it decides is measured, and the plot is laid out again with that room kept. One pass
 * of it: steps the kept room narrows may turn their labels, and the turn is not measured again.
 */
export function planLayout(analysis: PlanAnalysis, context: PlanContext): LayoutPlan {
    const { channelSemantics, data, convertedData, encodings, template, templateMarkType } = analysis;
    const { chartProperties, authoredProperties, options, size, theme, profile } = context;
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
        if (minBandStep && step > houseBandStep) {
            report.push({
                stage: 'ground',
                path: 'layout.bandStep',
                code: 'band-step-raised',
                message: `the house gives each category ${houseBandStep}px, but this chart reads only above ${minBandStep}px — held to ${step}px`,
            });
        }
    } else if (houseBandStep && cellGrid) {
        report.push({
            stage: 'ground',
            path: 'layout.bandStep',
            code: 'band-step-not-applied',
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

    const overflowResult = filterOverflow(
        channelSemantics, declaration, encodings, rowsInView,
        budgets, allMarkTypes,
    );

    const prepared: PreparedPlan = { analysis, context, declaration, options: effectiveOptions, facetGrid: budgets.facetGrid, overflow: overflowResult, report };
    const pinned = context.pins?.reserve;
    const first = planAroundPlot(prepared, pinned ?? NO_RESERVE);
    if (pinned) return { ...first, reserve: pinned };
    const along = { width: first.layout.xStepFitted === true, height: first.layout.yStepFitted === true };
    if (!along.width && !along.height) return first;
    const reserve = measureReserve({
        along,
        structure: first.structure,
        design: first.design,
        themed: Boolean(theme),
        layout: first.layout,
        channelSemantics,
        axisLabels: first.axisLabels,
        axisTitles: first.axisTitles,
        domains: first.domains,
        rulers: first.rulers,
        furniture: first.furniture,
        legend: first.legend,
        title: printedTitle(context, first.structure),
        titlePlan: first.title,
        rows: first.rows,
        spacing: profile.spacing,
        measure: profile.measureText ?? tableTextMeasurer,
    });
    return { ...planAroundPlot(prepared, reserve), reserve };
}

/** What a plan settles before it lays out the plot: its options, the facet grid and the rows that fit. */
interface PreparedPlan {
    analysis: PlanAnalysis;
    context: PlanContext;
    declaration: LayoutDeclaration;
    options: AssembleOptions;
    facetGrid: ReturnType<typeof computeChannelBudgets>['facetGrid'];
    overflow: ReturnType<typeof filterOverflow>;
    report: ThemeReport[];
}

/**
 * The plan from the plot outward, the banded axes fitting their steps to the canvas less the room
 * kept for the furniture. Furniture may take a chart's margins, never most of its plot.
 */
function planAroundPlot(prepared: PreparedPlan, reserve: FurnitureReserve): LayoutPlan {
    const { analysis, context, declaration, overflow: overflowResult, facetGrid: facetGridResult } = prepared;
    const report = [...prepared.report];
    const { channelSemantics, data, convertedData, encodings, template, templateMarkType } = analysis;
    const { chartProperties, options, size, theme, profile } = context;
    const measureText = profile.measureText ?? tableTextMeasurer;
    const ceiling = size.canvasSize ?? size.baseSize;
    const effectiveOptions: AssembleOptions = {
        ...prepared.options,
        bandStepFitCapacityX: Math.max(ceiling.width * 0.6, ceiling.width - reserve.width),
        bandStepFitCapacityY: Math.max(ceiling.height * 0.6, ceiling.height - reserve.height),
    };
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
            { fontSize: axisLabelFontSize, skip: (channel) => context.bandLabels!.skip(channel) || declaration.axisLabels?.[channel] !== undefined },
        );
    }

    const plot = template.planPlot?.({
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
    };

    const composite = Boolean(template.composite || layoutResult.facet);

    const typeOf = (channel: 'x' | 'y') => declaration.resolvedTypes?.[channel] ?? channelSemantics[channel]?.type;
    const drawn = skeletonChannels(template.template);
    const present = { x: Boolean(channelSemantics.x) || drawn.has('x'), y: Boolean(channelSemantics.y) || drawn.has('y') };
    const fieldFacts = (channel: 'x' | 'y'): AxisFieldFacts => ({
        present: present[channel],
        type: typeOf(channel),
        banded: declaration.axisFlags?.[channel]?.banded === true,
    });
    const categoryChannel = axisRoles({ x: fieldFacts('x'), y: fieldFacts('y') }).categoricalChannel;
    const xNamed = typeOf('x') === 'nominal' || typeOf('x') === 'ordinal';
    const xField = channelSemantics.x?.field;
    let xCategories: AxisLabelFacts['xCategories'];
    if (present.x && xField && (categoryChannel === 'x' || xNamed)) {
        const names = new Set<string>();
        for (const row of values) names.add(String(row?.[xField] ?? ''));
        const widthOf = measureText(axisLabelFontSize ?? layoutResult.xLabel.fontSize, theme ? themeBodyFamily(theme) ?? 'sans-serif' : 'sans-serif', 'normal', 'normal');
        names.delete('');
        xCategories = {
            named: xNamed,
            distinct: names.size,
            widest: Math.max(0, ...[...names].map(widthOf)),
            band: composite || layoutResult.xNominalCount > 0 || !names.size ? layoutResult.xStep : plot.width / names.size,
        };
    }

    const structure = chartStructure(template, {
        channelSemantics,
        resolvedTypes: declaration.resolvedTypes as Record<string, string> | undefined,
        table: values,
        data,
        fullTable: convertedData,
        chartProperties,
        templateMarkType,
        channels: template.channels,
        steps: { x: layoutResult.xStep, y: layoutResult.yStep },
        encodings,
        displayNames: chartDisplayNames(context.fieldDisplayNames, analysis.staticSeries ?? undefined),
        spellField: profile.spellField,
    });

    const segmented = segmentedBands(structure, values, [channelSemantics.column?.field, channelSemantics.row?.field]);
    const title = printedTitle(context, structure);
    // Grounding runs whether or not a theme was named, with the neutral one when it was not: some
    // design questions are Flint's own, such as whether this chart can carry its values at this density.
    const design = groundTheme(theme ?? {}, {
        chartType: context.chartType,
        measureText,
        markChannel: template.markCognitiveChannel,
        markTypes: structure.marks,
        namesOnMarks: chartProperties?.showSeriesInLabel === true,
        channelSemantics,
        resolvedTypes: declaration.resolvedTypes as Record<string, string> | undefined,
        axisFlags: declaration.axisFlags,
        positional: {
            ...(structure.x ? { x: { type: structure.x.type, field: structure.x.derived ? undefined : structure.x.fields[0] } } : {}),
            ...(structure.y ? { y: { type: structure.y.type, field: structure.y.derived ? undefined : structure.y.fields[0] } } : {}),
            ...(structure.series?.field ? { color: { field: structure.series.field, type: structure.series.type } }
                : structure.series?.derived ? { color: { field: structure.series.derived, type: structure.series.type, derived: true } } : {}),
            ...(segmented ? { stacked: true } : {}),
        },
        layout: layoutResult,
        table: values,
        canvasSize: size.baseSize,
        stacked: structure.stacking === 'normalized' ? 'normalize' : segmented,
        partToWhole: structure.marks.includes('arc'),
        titled: Boolean(title),
        headline: headlineText(title),
        hostSurface: (options as Record<string, any>).background,
        valueLabels: valueLabelChoice(template, structure, resolveValueLabelChoice(chartProperties)),
        geometryKinds: template.geometryKinds,
        liveLayoutSignal: options.liveLayoutSignal,
    });

    const axisLabels = planAxisLabels(layoutResult, declaration, axisLabelFontSize === undefined ? undefined : {
        fontSize: axisLabelFontSize,
        noLimit: theme?.labels?.truncation === 'never',
        angle: theme?.labels?.angle,
        font: theme ? themeBodyFamily(theme) : undefined,
    }, { present, xCategories });
    for (const channel of ['x', 'y'] as const) {
        const pin = { ...declaration.axisLabels?.[channel], ...context.pins?.axisLabels?.[channel] };
        if (Object.keys(pin).length) axisLabels[channel] = pinAxisLabels(axisLabels[channel], pin);
    }
    const titles = axisTitles(structure, {
        encodings, channelSemantics, displayNames: chartDisplayNames(context.fieldDisplayNames, analysis.staticSeries ?? undefined), spellField: profile.spellField,
    });
    const titlePlan = composite ? undefined : context.pins?.title ?? planTitle({
        structure, design, layout: layoutResult, axisLabels, axisTitles: titles, plot, rows: values,
        title: context.title, rowFacet: channelSemantics.row?.field, themed: Boolean(theme),
    });

    let valueLabels = planValueLabels({ design, structure, segmented, channelSemantics, rows: values });
    const domains = measureDomains(structure, segmented, channelSemantics, values);
    if (valueLabels && !('refused' in valueLabels) && valueLabels.headroom && valueLabels.channel === 'y') {
        const { headroom: asked, ...rest } = valueLabels;
        const headroom = domains.y ? freeHeadroom(domains.y, asked) : asked;
        valueLabels = headroom ? { ...rest, headroom } : rest;
        const extent = domains.y?.extent;
        if (extent && headroom) domains.y = { ...domains.y!, extent: [headroom.min ?? extent[0], headroom.max ?? extent[1]] };
    }
    const bandSpans: LayoutPlan['bandSpans'] = {};
    for (const channel of ['x', 'y'] as const) {
        const bands = channel === 'x' ? layoutResult.xContinuousAsDiscrete : layoutResult.yContinuousAsDiscrete;
        const type = typeOf(channel);
        const field = channelSemantics[channel]?.field;
        if (bands <= 1 || !field || (type !== 'quantitative' && type !== 'temporal')) continue;
        if (declaration.binnedAxes?.[channel]) continue;
        const bounds = domains[channel]?.bounds;
        if (bounds?.min !== undefined && bounds.max !== undefined) continue;
        const span = continuousBandSpan(values, field, type === 'temporal', bands);
        if (!span) continue;
        bandSpans[channel] = { span, temporal: type === 'temporal' };
        if (type === 'quantitative') domains[channel] = { ...(domains[channel] ?? { dropZero: false }), zero: false, extent: span };
    }

    const orders = categoryOrders(template, structure, encodings, channelSemantics, data, context.semanticTypes);
    const sizeType = encodings.size && template.channels?.includes('size') ? encodedType('size', encodings.size, channelSemantics.size) : undefined;
    const sizes = encodings.size && template.channels?.includes('size')
        ? {
            range: sizeRange(sizeType === 'quantitative' || sizeType === 'temporal', size.baseSize, data.length, theme && sizeType === 'quantitative' ? design.marks : undefined),
            quantitative: sizeType === 'quantitative' || sizeType === 'temporal',
        }
        : undefined;
    const pointSize = theme ? planPointSize(design, structure, values, plot, channelSemantics, report) : undefined;
    const points = theme ? pointPadding(structure, design, values, pointSize, domains, bandSpans, typeOf, channelSemantics) : undefined;
    const rulers = theme && !composite && !options.liveLayoutSignal ? measureRulers({
        structure, design, domains, channelSemantics, encodings, axisLabels, valueLabels,
        length: drawnLengths(plot, titlePlan, valueLabels), measure: measureText, points,
    }) : {};
    const furniture = planFurniture({
        structure, design: theme ? design : undefined, channelSemantics, declaration, layout: layoutResult,
        options: effectiveOptions, rows: values, data, canvas: size.baseSize, chartProperties,
    });
    const legend = planLegend({
        placement: planLegendPlacement({
            design, structure, channelSemantics, orders, rows: values,
            value: runValueScale(structure, domains, rulers, channelSemantics.y, design, values, Boolean(theme)),
        }),
        structure, design: theme ? design : undefined, channelSemantics, orders, rows: values,
        layout: layoutResult, plot, composite, flatYTitle: (furniture.yTitle?.top ?? 0) > 0,
    });
    const displayNames = chartDisplayNames(context.fieldDisplayNames, analysis.staticSeries ?? undefined);
    const keyTitles: Partial<Record<string, string>> = {};
    for (const key of legend.keys) {
        const encoding = encodings[key.channel];
        if (!encoding) continue;
        const { title, field } = encodingTitle(key.channel, encoding, channelSemantics[key.channel], displayNames, profile.spellField);
        const name = title ?? (encoding.aggregate ? undefined : field);
        if (name !== undefined) keyTitles[key.channel] = name;
    }
    const columns = layoutResult.facet?.columns ?? 1;
    const facetRows = layoutResult.facet?.rows ?? 1;
    const gap = layoutResult.effectiveFacetGap ?? 10;
    const authored: Partial<Record<string, { orient?: string; titleOrient?: string }>> = {};
    for (const key of legend.keys) {
        const pinned = (encodings[key.channel] as { legend?: { orient?: string; titleOrient?: string } } | undefined)?.legend;
        if (pinned) authored[key.channel] = { ...(pinned.orient ? { orient: pinned.orient } : {}), ...(pinned.titleOrient ? { titleOrient: pinned.titleOrient } : {}) };
    }
    legend.keyInputs = keysToLayout(legend, { rows: values, authored, design: theme ? design : undefined, structure, layout: layoutResult, titles: keyTitles, sizes, themed: Boolean(theme), placements: theme?.legend?.placement });
    if (theme) {
        const { arrangement, titlePosition, align } = design.legend;
        legend.preferences = { ...(arrangement ? { arrangement } : {}), ...(titlePosition ? { titlePosition } : {}), ...(align ? { align } : {}) };
    }
    if (!template.composite) {
        legend.layout = planKeyLayout(
            legend.keyInputs,
            { width: plot.width * columns + Math.max(0, columns - 1) * gap, height: plot.height * facetRows + Math.max(0, facetRows - 1) * gap },
            measureText,
            legend.preferences,
        );
        for (const note of legend.layout.notes) report.push({ stage: 'ground', ...note });
    }

    return {
        plot,
        composite,
        structure,
        design,
        axisTitles: titles,
        domains,
        bandSpans,
        ...(pointSize !== undefined ? { pointSize } : {}),
        ...(points ? { points } : {}),
        orders,
        ...(sizes ? { sizes } : {}),
        furniture,
        rulers,
        legend,
        valueLabels,
        ...(titlePlan ? { title: titlePlan } : {}),
        layout: layoutResult,
        axisLabelFontSize,
        axisLabels,
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
