// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ChartTemplateDef, ChartPropertyDef, ViewPlanContext, PlotPlanContext, InstantiateContext, ChannelSemantics } from '../../core/types';
import type { ViewNode } from '../../core/views';
import { skeletonStructure, type ChartStructure, type StructureContext } from '../../core/structure';
import {
    fieldsFromEncodingChannels,
    firstDiscreteEncodingField,
    targetFromHits,
} from '../../core/interaction-semantics';
import { annotationCandidates, presentAnnotationUpdate } from '../../interactive/presentation/annotation';
import { scatterPlotDef, boxplotDef } from './scatter';
import { stripPlotDef } from './jitter';
import { densityPlotDef } from './density';
import { histogramDef, barChartDef, heatmapDef } from './bar';
import { setMarkProp } from './utils';

/**
 * Marginal Plot — a plot of `x` against `y` with the distribution of each axis
 * drawn along it: `x`'s above the plot, `y`'s to its right, split by `color`
 * where one is bound. The plot and the margins follow from the axis types:
 *
 *   measure × measure    — a Scatter Plot; each margin a density, histogram or boxplot
 *   category × measure   — a Strip Plot; the category's margin a bar of counts
 *   category × category  — a Heatmap of counts; both margins bars of counts
 *
 * Every unit is built by its own template (the Scatter Plot's, Strip Plot's,
 * Heatmap's, Density Plot's, Histogram's, Boxplot's or Bar Chart's code), then
 * stripped of its axes and turned along its axis.
 *
 * Composition: a column of [ top margin, row of [ plot, right margin ] ].
 * The margins carry no axes and take the plot's domains so they line up.
 */

const GAP = 6;
const MARGIN_SHARE = 0.24;
const MARGIN_MIN = 36;
const MARGIN_MAX = 96;
const MIN_PLOT = 80;
/** The Density Plot's own layered opacity, applied to layered margins. */
const MARGIN_OPACITY = 0.7;

type MarginKind = 'density' | 'histogram' | 'boxplot' | 'bar';
type MainKind = 'scatter' | 'strip' | 'heatmap';

function discrete(semantics: { type?: string } | undefined): boolean {
    return semantics?.type === 'nominal' || semantics?.type === 'ordinal';
}

/** What the plot in the middle is, from the axis types. */
function mainKind(channels: Record<string, { type?: string } | undefined>): MainKind {
    const x = discrete(channels.x);
    const y = discrete(channels.y);
    return x && y ? 'heatmap' : x || y ? 'strip' : 'scatter';
}

const MAIN_TEMPLATE: Record<MainKind, ChartTemplateDef> = { scatter: scatterPlotDef, strip: stripPlotDef, heatmap: heatmapDef };

/** What a margin draws: counts per category along a discrete axis, else the chosen distribution. */
function marginKind(properties: Record<string, any> | undefined, semantics: { type?: string } | undefined): MarginKind {
    if (discrete(semantics)) return 'bar';
    const kind = properties?.marginal;
    return kind === 'histogram' || kind === 'boxplot' ? kind : 'density';
}

function marginOf(width: number, height: number): number {
    return Math.max(MARGIN_MIN, Math.min(MARGIN_MAX, Math.round(MARGIN_SHARE * Math.min(width, height))));
}

/**
 * The plot's size: a banded axis keeps the layout's bands; a continuous axis gives up the margin
 * and its gap.
 */
function marginalPlot(ctx: PlotPlanContext): { width: number; height: number; margin: number } {
    const layout = ctx.layout;
    const margin = marginOf(layout.subplotWidth, layout.subplotHeight);
    const xBands = layout.xNominalCount || layout.xContinuousAsDiscrete;
    const yBands = layout.yNominalCount || layout.yContinuousAsDiscrete;
    return {
        width: xBands > 0 ? layout.xStep * xBands : Math.max(MIN_PLOT, layout.subplotWidth - margin - GAP),
        height: yBands > 0 ? layout.yStep * yBands : Math.max(MIN_PLOT, layout.subplotHeight - margin - GAP),
        margin,
    };
}

function marginalViews(ctx: ViewPlanContext): ViewNode {
    const { margin } = marginalPlot(ctx);
    const { width, height } = ctx.plot;
    const view = (w: number, h: number): ViewNode => ({ kind: 'view', role: 'plot', width: w, height: h });
    return {
        kind: 'concat', direction: 'column', gap: GAP,
        children: [
            view(width, margin),
            { kind: 'concat', direction: 'row', gap: GAP, children: [view(width, height), view(margin, height)] },
        ],
    };
}

interface MarginalSizes { width: number; height: number; margin: number; gap: number }

/** The sizes the planned views state, when they are the ones this template plans. */
function plannedSizes(views: ViewNode | undefined): MarginalSizes | undefined {
    if (views?.kind !== 'concat' || views.children.length !== 2) return undefined;
    const [top, row] = views.children;
    if (top.kind !== 'view' || row.kind !== 'concat' || row.children.length !== 2) return undefined;
    const [plot, right] = row.children;
    if (plot.kind !== 'view' || right.kind !== 'view') return undefined;
    return { width: plot.width, height: plot.height, margin: top.height, gap: views.gap };
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** A property of a sibling template, offered only for the margin kind that reads it. */
function siblingProperty(template: ChartTemplateDef, key: string, kind: MarginKind): ChartPropertyDef {
    const property = template.properties?.find((entry) => entry.key === key);
    if (!property) throw new Error(`${template.chart} has no property ${key}`);
    return {
        ...property,
        check: (ctx) => ({
            applicable: ['x', 'y'].some((channel) => marginKind(ctx.chartProperties, ctx.channelSemantics?.[channel]) === kind),
        }),
    };
}

/** The encodings of a unit turned so its measure runs along y instead of x. */
function turn(encoding: Record<string, any>): Record<string, any> {
    const { x, x2, y, y2, ...rest } = encoding;
    return { ...rest, ...(y ? { x: y } : {}), ...(y2 ? { x2: y2 } : {}), ...(x ? { y: x } : {}), ...(x2 ? { y2: x2 } : {}) };
}

/** The encodings the plot in the middle is built from. */
function mainEncodings(ctx: InstantiateContext, kind: MainKind): Record<string, any> {
    const { x, y, color, size, shape, opacity } = ctx.resolvedEncodings;
    if (kind === 'heatmap') return { x, y, color: { aggregate: 'count', type: 'quantitative' } };
    return { x, y, ...(color ? { color } : {}), ...(size ? { size } : {}), ...(shape ? { shape } : {}), ...(opacity ? { opacity } : {}) };
}

/** A margin: the sibling template's own unit for the field, without axes, turned along `along`. */
function marginUnit(ctx: InstantiateContext, along: 'x' | 'y', kind: MarginKind, size: { width: number; height: number }): any {
    const source = ctx.resolvedEncodings[along];
    const field: string = source.field;
    const color = mainKind(ctx.channelSemantics) === 'heatmap' ? undefined : ctx.resolvedEncodings.color;
    const colorEncoding = color?.field ? { color: { field: color.field, type: color.type ?? 'nominal' } } : {};
    const sibling = (template: ChartTemplateDef, resolvedEncodings: Record<string, any>, chartProperties?: Record<string, any>) => {
        const unit = clone(template.template);
        template.instantiate(unit, { ...ctx, resolvedEncodings, encodings: resolvedEncodings, ...(chartProperties ? { chartProperties } : {}) });
        return unit;
    };
    // Vega-Lite merges the two margins' transforms where they write the same working columns, so
    // each margin's columns carry its axis in their names.
    const rename = (unit: any, names: Record<string, string>) => {
        for (const step of unit.transform ?? []) {
            if (Array.isArray(step.as)) step.as = step.as.map((name: string) => names[name] ?? name);
        }
        for (const encoding of Object.values<any>(unit.encoding)) {
            if (encoding?.field && names[encoding.field]) encoding.field = names[encoding.field];
        }
    };

    let unit: any;
    if (kind === 'bar') {
        // Counts per category, on the plot's own bands.
        const category = { field, type: source.type ?? 'nominal', ...(source.sort !== undefined ? { sort: source.sort } : {}) };
        unit = sibling(barChartDef, { x: category, y: { aggregate: 'count', type: 'quantitative' }, ...colorEncoding }, {});
        // Beside a plot whose bands carry an offset (a strip's jitter), Vega-Lite gives a bar a
        // fixed width at the band's start; a bar spanning its band from edge to edge sits where
        // the plot's band does whatever the sizing rule.
        unit.encoding.x = { ...unit.encoding.x, bandPosition: 0 };
        unit.encoding.x2 = { field, bandPosition: 1 };
    } else if (kind === 'density') {
        // Margins layer their series by default, each distribution showing through the others.
        const props = ctx.chartProperties;
        unit = sibling(densityPlotDef, { x: { field, type: 'quantitative' }, ...colorEncoding }, {
            bandwidth: props?.bandwidth,
            ...(props?.stackMode === 'stacked' ? {} : { stackMode: 'layered', opacity: MARGIN_OPACITY }),
        });
        unit.transform[0].as = ['value', 'density'];
        rename(unit, { value: `__value_${along}`, density: `__density_${along}` });
        // The density rises from zero whatever the plot's measure does.
        unit.encoding.y.scale = { ...(unit.encoding.y.scale ?? {}), nice: false, zero: false, domainMin: 0 };
    } else if (kind === 'histogram') {
        unit = sibling(histogramDef, { x: { field, type: 'quantitative' }, ...colorEncoding });
        rename(unit, { __bin_start: `__bin_start_${along}`, __bin_end: `__bin_end_${along}` });
    } else {
        unit = { mark: clone(boxplotDef.template.mark), encoding: { x: { field, type: 'quantitative' }, ...colorEncoding } };
        if (color?.field) unit.encoding.y = { field: color.field, type: 'nominal' };
        const props = ctx.chartProperties;
        if (props?.whiskerMethod === 'minmax') unit.mark = setMarkProp(unit.mark, 'extent', 'min-max');
        if (props?.whiskerMethod === 'minmax' || props?.showOutliers === false) unit.mark = setMarkProp(unit.mark, 'outliers', false);
    }

    for (const channel of ['x', 'y']) {
        if (unit.encoding[channel]) unit.encoding[channel] = { ...unit.encoding[channel], axis: null, title: null };
    }
    if (along === 'y') {
        unit.encoding = turn(unit.encoding);
        const type = typeof unit.mark === 'string' ? unit.mark : unit.mark?.type;
        if (type === 'area') {
            // Vega-Lite walks an area along x; one turned along y keeps the density's own order.
            unit.mark = setMarkProp(setMarkProp(unit.mark, 'orient', 'horizontal'), 'order', false);
        }
    }
    return { ...unit, ...size };
}

/** The three units of the figure, where the spec is the one this template built. */
function units(spec: any): { top: any; plot: any; right: any } | undefined {
    const top = spec?.vconcat?.[0];
    const row = spec?.vconcat?.[1];
    const plot = row?.hconcat?.[0];
    const right = row?.hconcat?.[1];
    return top && plot && right ? { top, plot, right } : undefined;
}

/** The extent of the values rounded out to tick values, as a linear scale with `nice` draws it. */
function niceDomain(values: number[], zero: boolean): [number, number] {
    if (!values.length) return [0, 1];
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (zero) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
    if (lo === hi) return [lo - 1, hi + 1];
    const increment = (start: number, stop: number, count: number): number => {
        const step = (stop - start) / count;
        const power = Math.floor(Math.log10(step));
        const error = step / Math.pow(10, power);
        const factor = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;
        return power >= 0 ? factor * Math.pow(10, power) : -Math.pow(10, -power) / factor;
    };
    for (let pass = 0; pass < 2; pass++) {
        const step = increment(lo, hi, 10);
        if (step > 0) { lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step; }
        else if (step < 0) { lo = Math.ceil(lo * step) / step; hi = Math.floor(hi * step) / step; }
    }
    return [Number(lo.toFixed(10)), Number(hi.toFixed(10))];
}

const MARGIN_MARK: Record<MarginKind, string> = { density: 'area', histogram: 'bar', boxplot: 'boxplot', bar: 'bar' };

/** The structure of the plot in the middle, as its own template describes it. */
function mainStructure(ctx: StructureContext, kind: MainKind): ChartStructure {
    const template = MAIN_TEMPLATE[kind];
    const context: StructureContext = kind === 'heatmap'
        ? { ...ctx, channelSemantics: { ...ctx.channelSemantics, color: { aggregate: 'count', type: 'quantitative' } as unknown as ChannelSemantics } }
        : ctx;
    return template.structure?.(context) ?? skeletonStructure(template.template, context);
}

export const marginalPlotDef: ChartTemplateDef = {
    chart: 'Marginal Plot',
    composite: true,
    planPlot: (ctx) => {
        const { width, height } = marginalPlot(ctx);
        return { width, height };
    },
    planViews: marginalViews,
    template: {
        spacing: GAP,
        bounds: 'flush',
        vconcat: [],
        config: { view: { stroke: null } },
    },
    channels: ['x', 'y', 'color', 'size', 'shape', 'opacity'],
    structure: (ctx) => {
        const main = mainKind(ctx.channelSemantics);
        const base = mainStructure(ctx, main);
        const kinds = { x: marginKind(ctx.chartProperties, ctx.channelSemantics.x), y: marginKind(ctx.chartProperties, ctx.channelSemantics.y) };
        const layered = (kind: MarginKind) => kind === 'density' && ctx.chartProperties?.stackMode !== 'stacked';

        // The build is read as the template leaves it, before the plot's own scales are settled:
        // the plot's encodings say nothing of rounding or zero, so each axis's facts come from
        // the margins, read top margin then right margin with the last word winning. A density
        // margin fits its measure to the data (its template's `zero: false`) and draws its own
        // axis unrounded from zero; a histogram, a bar of counts or a boxplot states neither.
        type AxisFacts = { nice?: boolean; zero?: boolean };
        const along = (kind: MarginKind): AxisFacts => (kind === 'density' ? { zero: false } : {});
        const across = (kind: MarginKind): AxisFacts => (kind === 'density' ? { nice: false, zero: false } : {});
        const units: Array<Record<'x' | 'y', AxisFacts>> = [
            { x: along(kinds.x), y: across(kinds.x) },
            { x: across(kinds.y), y: along(kinds.y) },
        ];
        const rounded: Partial<Record<'x' | 'y', boolean>> = {};
        const baseline: Partial<Record<'x' | 'y', 'zero' | 'data'>> = {};
        for (const unit of units) {
            for (const channel of ['x', 'y'] as const) {
                const facts = unit[channel];
                if (typeof facts.nice === 'boolean') rounded[channel] = facts.nice;
                if (typeof facts.zero === 'boolean') baseline[channel] = facts.zero ? 'zero' : 'data';
            }
        }
        const axis = (channel: 'x' | 'y') => {
            const described = base[channel];
            if (!described) return {};
            return { [channel]: {
                ...described,
                // A template that states no rounding leaves the backend's own.
                rounded: rounded[channel] ?? true,
                ...(baseline[channel] ? { baseline: baseline[channel] } : {}),
            } };
        };
        // The build takes the first margin that states its stacking (a layered density states
        // none); failing that, bars of counts, histograms and stacked densities stack.
        const stated = [kinds.x, kinds.y].find((kind) => layered(kind));
        const implicit = [kinds.x, kinds.y].some((kind) => kind === 'bar' || kind === 'histogram' || (kind === 'density' && !layered(kind)));
        const structure: ChartStructure = {
            ...base,
            ...axis('x'),
            ...axis('y'),
            marks: [...new Set([...base.marks, MARGIN_MARK[kinds.x], MARGIN_MARK[kinds.y]])],
            stacking: stated ? 'none' : implicit ? 'stacked' : 'none',
            // A heatmap's count has no field, so the build draws no key for it.
            ...(main === 'heatmap' ? { keys: [] } : {}),
        };
        return structure;
    },
    declareLayoutMode: (channelSemantics, table, chartProperties) =>
        MAIN_TEMPLATE[mainKind(channelSemantics)].declareLayoutMode?.(channelSemantics, table, chartProperties) ?? {},
    interactionSupport: {
        elements: true,
        legend: true,
    },
    markCognitiveChannel: 'position',
    geometryKinds: ['point', 'area', 'band', 'cell'],
    semanticInteractions: ({ resolvedEncodings }) => {
        const seriesField = firstDiscreteEncodingField(resolvedEncodings, ['color']);
        const colorField = resolvedEncodings.color?.field;
        return {
            fields: fieldsFromEncodingChannels(resolvedEncodings, ['x', 'y', 'color', 'size', 'shape']),
            seriesField,
            legendFields: colorField ? { color: colorField } : undefined,
            selectableMarks: ['circle', 'point', 'rect'],
            resolve: (event, context) => targetFromHits(event.hits, context.keyField, { kind: 'mark', role: 'point' }),
            presentUpdate: presentAnnotationUpdate(() => annotationCandidates('center', 'top', 'right', 'bottom', 'left')),
        };
    },
    instantiate: (spec, ctx) => {
        const { x, y } = ctx.resolvedEncodings;
        if (!x?.field || !y?.field) return;
        const sizes = plannedSizes(ctx.views) ?? { ...marginalPlot(ctx), gap: GAP };
        const main = mainKind(ctx.channelSemantics);
        const template = MAIN_TEMPLATE[main];

        const plot: any = clone(template.template);
        const encodings = mainEncodings(ctx, main);
        template.instantiate(plot, { ...ctx, resolvedEncodings: encodings, encodings });
        // The plot draws at the planned size whatever step its template asked for; its bands fit.
        plot.width = sizes.width;
        plot.height = sizes.height;

        const top = marginUnit(ctx, 'x', marginKind(ctx.chartProperties, ctx.channelSemantics.x), { width: sizes.width, height: sizes.margin });
        const right = marginUnit(ctx, 'y', marginKind(ctx.chartProperties, ctx.channelSemantics.y), { width: sizes.margin, height: sizes.height });

        spec.spacing = sizes.gap;
        spec.vconcat = [top, { spacing: sizes.gap, bounds: 'flush', hconcat: [plot, right] }];
        // The assembler and theme write their axis, scale and key decisions onto the root
        // encodings; the plot's stand there until postProcess moves them into its unit.
        spec.encoding = plot.encoding;
        plot.encoding = {};
    },
    postProcess: (spec, ctx) => {
        const parts = units(spec);
        if (!parts) return;
        const { top, plot, right } = parts;
        if (spec.encoding) {
            plot.encoding = { ...spec.encoding, ...plot.encoding };
            delete spec.encoding;
        }
        // A banded axis had the assembler size the root by its step; the units carry their sizes.
        for (const key of ['width', 'height']) {
            if (spec[key] && typeof spec[key] === 'object') delete spec[key];
        }
        // Each margin takes the plot's settled domain along its axis: a continuous axis's rounded
        // extent, written on both so a margin's own extent cannot differ; a banded axis's category
        // order.
        const share = (channel: 'x' | 'y', margin: any) => {
            const from = plot.encoding?.[channel];
            const to = margin.encoding?.[channel];
            if (!from?.field || !to) return;
            if (discrete(ctx.channelSemantics[channel])) {
                // Bands line up only when both scales pad alike; Vega-Lite pads a band with an
                // offset (a strip's jitter) or a rect (a heatmap's cells) differently from a bar's,
                // so the plot's padding is written on both.
                const offset = plot.encoding?.[`${channel}Offset`];
                const mark = typeof plot.mark === 'string' ? plot.mark : plot.mark?.type;
                const padding = offset ? { paddingInner: 0.2, paddingOuter: 0.2 }
                    : mark === 'rect' ? { paddingInner: 0, paddingOuter: 0 }
                    : { paddingInner: 0.1, paddingOuter: 0.05 };
                from.scale = { ...(from.scale ?? {}), ...padding };
                to.scale = { ...(to.scale ?? {}), ...padding };
                if (from.sort !== undefined) to.sort = from.sort;
                if (Array.isArray(from.scale?.domain)) to.scale.domain = from.scale.domain;
                return;
            }
            const scale = from.scale ?? {};
            const domain = Array.isArray(scale.domain) && scale.domain.length === 2
                ? scale.domain
                : niceDomain(ctx.table.map((row) => Number(row[from.field])).filter(Number.isFinite), scale.zero !== false);
            from.scale = { ...scale, domain };
            to.scale = { ...(to.scale ?? {}), domain, zero: scale.zero ?? true };
            // A density or a binning runs the whole axis, not just the data's reach.
            for (const step of margin.transform ?? []) {
                if (step.density) step.extent = domain;
                if (step.bin) step.bin = { ...(step.bin === true ? {} : step.bin), extent: domain };
            }
        };
        share('x', top);
        share('y', right);
        // The margins' colours stand in the plot's order, and a house decorates the plot's
        // marks, not the margins'.
        const colorSort = plot.encoding?.color?.sort ?? null;
        for (const margin of [top, right]) {
            if (margin.encoding?.color?.field) margin.encoding.color.sort = colorSort;
            if (Array.isArray(margin.layer)) margin.layer = margin.layer.filter((layer: any) => !layer.__themeSynthetic);
        }
        // The right margin owns the right side, so a house that seats its y ruler there keeps it on the left.
        const yAxis = plot.encoding?.y?.axis;
        if (yAxis && typeof yAxis === 'object' && yAxis.orient === 'right') {
            yAxis.orient = 'left';
            if (yAxis.titleOrient === 'right') yAxis.titleOrient = 'left';
        }
    },
    properties: [
        { key: 'marginal', label: 'Margins', type: 'discrete',
          check: (ctx) => ({ applicable: !discrete(ctx.channelSemantics?.x) || !discrete(ctx.channelSemantics?.y) }),
          options: [
            { value: undefined, label: 'Density' },
            { value: 'histogram', label: 'Histogram' },
            { value: 'boxplot', label: 'Boxplot' },
        ] },
        ...(scatterPlotDef.properties ?? []),
        { key: 'stackMode', label: 'Stack', type: 'discrete',
          check: (ctx) => ({
              applicable: !!ctx.encodings.color?.field
                  && ['x', 'y'].some((channel) => marginKind(ctx.chartProperties, ctx.channelSemantics?.[channel]) === 'density'),
          }),
          options: [
            { value: undefined, label: 'Layered (default)' },
            { value: 'stacked', label: 'Stacked' },
        ] },
        siblingProperty(densityPlotDef, 'bandwidth', 'density'),
        siblingProperty(histogramDef, 'binCount', 'histogram'),
        siblingProperty(boxplotDef, 'whiskerMethod', 'boxplot'),
        siblingProperty(boxplotDef, 'showOutliers', 'boxplot'),
    ] as ChartPropertyDef[],
};
