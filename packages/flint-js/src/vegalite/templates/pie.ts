// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { ChartTemplateDef, ChartPropertyDef, PlotPlanContext } from '../../core/types';
import { computeCircumferencePressure, computeEffectiveBarCount } from '../../core/decisions';
import {
    fieldsFromEncodingChannels,
    firstDiscreteEncodingField,
    legendMatchedHits,
    targetFromHits,
} from '../../core/interaction-semantics';
import {
    annotationCandidates,
    categoryValueAnnotationText,
    presentAnnotationUpdate,
} from '../../interactive/presentation/annotation';
import { setMarkProp } from './utils';
import type { ChartStructure } from '../../core/structure';

/** A pie's outer radius and the square it is drawn in, from how many slices it has to hold. */
/** The room left round a pie for its slice outlines, in px. */
const PIE_MARGIN = 4;

function pieLayout(
    ctx: PlotPlanContext,
    thetaField: string | undefined,
    colorField: string | undefined,
): { radius: number; size: number } {
    let effectiveCount: number;

    if (thetaField && colorField) {
        // Aggregate values per color category
        const agg = new Map<string, number>();
        for (const row of ctx.table) {
            const cat = String(row[colorField] ?? '');
            const val = Number(row[thetaField]) || 0;
            agg.set(cat, (agg.get(cat) ?? 0) + val);
        }
        effectiveCount = computeEffectiveBarCount([...agg.values()]);
    } else if (colorField) {
        // Count-based: each category gets equal slice
        const cats = new Set(ctx.table.map((r: any) => String(r[colorField] ?? '')));
        effectiveCount = cats.size;
    } else {
        effectiveCount = ctx.table.length;
    }

    const { radius, canvasW, canvasH } = computeCircumferencePressure(
        effectiveCount, ctx.canvasSize, {
            minArcPx: 45,
            minRadius: 60,
            maxStretch: ctx.assembleOptions?.maxStretch,
            maxStretchX: ctx.assembleOptions?.maxStretchX,
            maxStretchY: ctx.assembleOptions?.maxStretchY,
            // A hairline of room for the slice outlines: nothing is set around the pie, so the pie
            // fills its square and the title sits on it rather than a margin above it.
            margin: PIE_MARGIN,
        });
    return { radius, size: Math.min(canvasW, canvasH) };
}

export const pieChartDef: ChartTemplateDef = {
    chart: "Pie Chart",
    template: { mark: "arc", encoding: {} },
    channels: ["size", "color", "column", "row"],
    interactionSupport: {
        elements: true,
        region: ['cartesian', 'angular'],
        legend: true,
    },
    markCognitiveChannel: 'area',
    semanticInteractions: ({ resolvedEncodings }) => {
        const seriesField = firstDiscreteEncodingField(resolvedEncodings, ['color']);
        const valueField = resolvedEncodings.size?.field;
        const colorField = resolvedEncodings.color?.field;
        return {
            fields: fieldsFromEncodingChannels(resolvedEncodings, ['color']),
            seriesField,
            legendFields: colorField ? { color: colorField } : undefined,
            selectableMarks: ['arc'],
            annotationMarkType: 'arc',
            renderHoverStyles: { arc: { opacity: 'contrast' } },
            resolve: (event, context) => {
                const legendField = event.legend?.field ?? seriesField;
                const hits = event.role === 'legend-item' && legendField
                    ? legendMatchedHits(event, context, legendField)
                    : event.hits;
                return targetFromHits(hits, context.keyField, { kind: 'mark', role: 'slice' });
            },
            presentUpdate: presentAnnotationUpdate(
                () => annotationCandidates('radial-midpoint', 'outer-radial'),
                categoryValueAnnotationText(seriesField, valueField),
            ),
        };
    },
    geometryKinds: ['arc'],
    structure: (ctx): ChartStructure => {
        // Each slice's angle is its value's share of the whole, or its row count where no value is bound.
        const { size, color } = ctx.channelSemantics;
        return {
            marks: ['arc'],
            angle: size?.field ? { type: size.type, fields: [size.field] } : { type: 'quantitative', fields: [], derived: 'count' },
            ...(color?.field ? { series: { field: color.field, type: color.type } } : {}),
            keys: color?.field ? [{ channel: 'color', field: color.field, ...(color.type ? { type: color.type } : {}) }] : [],
            stacking: 'none',
        };
    },
    instantiate: (spec, ctx) => {
        // Remap abstract channels to VL channels:
        //   "size" → VL "theta" (angular extent of each slice)
        if (!spec.encoding) spec.encoding = {};
        for (const [ch, enc] of Object.entries(ctx.resolvedEncodings)) {
            if (ch === 'size') {
                // Strip the sqrt/range scale that the assembler adds for generic
                // "size" channels — theta handles its own proportional scaling.
                const { scale: _scale, ...thetaEnc } = enc;
                spec.encoding.theta = thetaEnc;
            } else {
                spec.encoding[ch] = enc;
            }
        }

        // Fallback: when the user only maps color (no size/theta), use count
        // so every colour group gets a proportional slice.
        if (!spec.encoding.theta) {
            spec.encoding.theta = { aggregate: 'count', type: 'quantitative' };
        }

        const config = ctx.chartProperties;
        if (config && config.innerRadius > 0) {
            spec.mark = setMarkProp(spec.mark, 'innerRadius', config.innerRadius);
        }

        // ── Circumference-pressure sizing (spring model) ──────────────
        // Compute effective bar count from slice values to determine
        // whether the pie needs to grow beyond the base canvas.
        const thetaField = spec.encoding.theta?.field;
        const colorField = spec.encoding.color?.field;

        // Slice ordering (design choice): default keeps the data/category order;
        // sorting by value leads with the largest or smallest slice. Arc slice
        // order follows the `order` channel; `color.sort` keeps the legend in
        // step with the wedges.
        const sortSlices = config?.sortSlices;
        if ((sortSlices === undefined || sortSlices === 'none') && colorField) {
            // Data order (M3): the colour scale and the key already follow the data (`sort: null`);
            // without an order Vega-Lite stacks the wedges alphabetically, so the first wedge from
            // 12 o'clock is not the first row and the wedges disagree with their key.
            const names = [...new Set((ctx.fullTable ?? ctx.table).map((row: any) => String(row?.[colorField])))];
            spec.transform = [...(spec.transform ?? []), {
                calculate: `indexof(${JSON.stringify(names)}, toString(datum[${JSON.stringify(colorField)}]))`, as: '__flintArcOrder',
            }];
            spec.encoding.order = { field: '__flintArcOrder', type: 'quantitative', sort: 'ascending' };
        } else if ((sortSlices === undefined || sortSlices === 'none') && thetaField) {
            // No colour names the slices: they run in row order, stated so, since anything printed
            // on them (a text channel is a stack key) would otherwise stack by its own text and
            // land on another slice.
            spec.transform = [...(spec.transform ?? []), { window: [{ op: 'row_number', as: '__flintArcOrder' }] }];
            spec.encoding.order = { field: '__flintArcOrder', type: 'quantitative', sort: 'ascending' };
        } else if (sortSlices === 'descending' || sortSlices === 'ascending') {
            spec.encoding.order = thetaField
                ? { field: thetaField, type: 'quantitative', sort: sortSlices }
                : { aggregate: 'count', type: 'quantitative', sort: sortSlices };
            if (spec.encoding.color) {
                spec.encoding.color = {
                    ...spec.encoding.color,
                    sort: thetaField
                        ? { field: thetaField, op: 'sum', order: sortSlices }
                        : { op: 'count', order: sortSlices },
                };
            }
        }

        const { radius: sized, size } = pieLayout(ctx, thetaField, colorField);
        // The plot it is drawn in may come out smaller than the canvas it was sized for — a header
        // takes its height out of the plot — and the pie stays inside it.
        const radius = ctx.plot ? Math.max(1, Math.min(sized, Math.floor(Math.min(ctx.plot.width, ctx.plot.height) / 2) - PIE_MARGIN)) : sized;
        spec.mark = setMarkProp(spec.mark, 'outerRadius', radius);
        // Set explicit width/height — overrides config.view defaults
        spec.width = ctx.plot?.width ?? size;
        spec.height = ctx.plot?.height ?? size;
    },
    planPlot: (ctx) => {
        const { size } = pieLayout(ctx, ctx.channelSemantics.size?.field, ctx.channelSemantics.color?.field);
        return { width: size, height: size };
    },
    properties: [
        { key: "innerRadius", label: "Donut", type: "continuous", min: 0, max: 100, step: 5, defaultValue: 0 },
        {
            key: 'sortSlices', label: 'Sort slices', type: 'discrete',
            options: [
                { value: 'none', label: 'Data order' },
                { value: 'descending', label: 'Largest first' },
                { value: 'ascending', label: 'Smallest first' },
            ],
            defaultValue: 'none',
        },
    ] as ChartPropertyDef[],
};

/** The hole a Donut Chart gets when the caller sets no `innerRadius`. */
const DONUT_DEFAULT_INNER_RADIUS = 50;

export const donutChartDef: ChartTemplateDef = {
    ...pieChartDef,
    chart: "Donut Chart",
    // A donut is a pie with a hole. Property defaults are not merged into
    // `chartProperties` at assemble time (only discrete options are coerced),
    // so a Donut Chart authored without an explicit `innerRadius` would inherit
    // the pie's hole-less 0 and render as a full pie. Carry a non-zero default
    // and apply it here before delegating to the pie's instantiate.
    properties: (pieChartDef.properties ?? []).map((p) =>
        p.key === 'innerRadius' ? { ...p, defaultValue: DONUT_DEFAULT_INNER_RADIUS } : p,
    ) as ChartPropertyDef[],
    instantiate: (spec, ctx) => {
        const innerRadius = ctx.chartProperties?.innerRadius;
        const withHole =
            innerRadius == null
                ? { ...ctx, chartProperties: { ...(ctx.chartProperties ?? {}), innerRadius: DONUT_DEFAULT_INNER_RADIUS } }
                : ctx;
        pieChartDef.instantiate(spec, withHole);
    },
};
