// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Core chart assembly logic — Two-Stage Pipeline Coordinator.
 *
 * Given data, encoding definitions, and semantic types,
 * produces a complete Vega-Lite specification in two stages:
 *
 * ── ANALYSIS (VL-free) ──────────────────────────────────────
 *   Phase 0:  resolveChannelSemantics  → ChannelSemantics
 *   Step 0a:  declareLayoutMode    → LayoutDeclaration
 *   Step 0b:  convertTemporalData  → converted data
 *   Step 0c:  filterOverflow       → filtered data, nominalCounts
 *   Phase 1:  computeLayout        → LayoutResult
 *
 * ── INSTANTIATE (VL-specific) ───────────────────────────────
 *   buildVLEncodings    → resolvedEncodings
 *   template.instantiate
 *   restructureFacets
 *   vlApplyLayoutToSpec
 *   post-layout adjustments (facet binning, independent scales, tooltips)
 *
 * ── Backend Translation Responsibilities ────────────────────
 * The LayoutResult from Phase 1 is target-agnostic.  This assembler
 * translates it into Vega-Lite-specific structures:
 *
 *   subplotWidth / subplotHeight
 *     → VL `width` / `height` on the spec (or `width: {step: N}` for
 *       banded discrete axes).
 *
 *   xStep / yStep / stepPadding
 *     → VL `width: {step: N}`, `encoding.x.scale.paddingInner`, etc.
 *       VL handles bar sizing natively from the step declaration.
 *
 *   Facet wrapping
 *     → `restructureFacets()` converts column-only to `facet` +
 *       `columns: N`.  The wrapping decision uses the same parameters
 *       (maxStretch, minStep, minSubplotSize) as ECharts.
 *
 *   Axis titles, labels, legends
 *     → VL handles these declaratively via encoding / config.
 *
 * This module has NO React, Redux, or UI framework dependencies.
 */

import {
    ChartEncoding,
    ChartTemplateDef,
    ChartAssemblyInput,
    LayoutDeclaration,
    InstantiateContext,
} from '../core/types';
import type { AssembleOptions, ChartWarning, ChartOption, OptionEvalContext } from '../core/types';
import type { ThemeReport } from '../core/theme/types';
import { declaredInteractionCapabilities, type InteractionCapability } from '../core/interaction-spec';
import { analysisReadsProperty, analyzeChart, type ChartAnalysis } from '../core/analyze';
import { planLayout, type BackendLayoutProfile, type LayoutPlan, type PlanContext } from '../core/plan';
import { planBandDodge, resolveDodge } from '../core/band-dodge';
import { applyPivot, type PivotSurface, type TransformSurface } from '../core/pivot';
import { vlGetTemplateDef } from './templates';
import { inferVisCategory } from '../core/semantic-types';
import { getRegistryEntry } from '../core/type-registry';
import { inspectEncodingSort } from '../core/resolve-semantics';
import { resolveDisplayUnit, titleWithDisplayUnit, toTypeString, type SemanticAnnotation } from '../core/field-semantics';
import { computeMinSubplotDimensions, resolveBaseSize } from '../core/compute-layout';
import { templateStatesAxisLabels, vlApplyLayoutToSpec, vlApplyTooltips, vlWrapLegendText, vlFinalizeTemporalAxes } from './instantiate-spec';
import { normalizeChartProperties } from '../core/normalize-properties';
import { groundTheme, resolveChartDefaults, resolveCompileDefaults, resolveGeometry } from '../core/theme/ground';
import { resolveThemeSpec } from '../core/theme/presets';
import { realizeThemeVegaLite, realizeValueLabelsVegaLite, collectMarkTypes, collectPositional } from './theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape characters that Vega-Lite interprets as field-access path syntax.
 *
 * In Vega-Lite a `field` string like `"a.b"` is parsed as a nested accessor
 * (`datum.a.b`), and `"a[0]"` as array indexing. Column names that literally
 * contain `.`, `[`, or `]` (e.g. `"Oranges, Navel, per lb."`) must therefore be
 * escaped with a backslash so the renderer resolves the flat key instead of an
 * undefined nested path (which silently produces empty marks).
 *
 * Only the `field` accessor string needs escaping — direct JS data access via
 * `row[fieldName]` continues to use the raw, unescaped name.
 */
const escapeVlFieldName = (name: string): string =>
    name.replace(/[.[\]]/g, (ch) => `\\${ch}`);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assemble a Vega-Lite specification.
 *
 * ```ts
 * const spec = assembleVegaLite({
 *   data: { values: myRows },
 *   semantic_types: { weight: 'Quantity', mpg: 'Quantity' },
 *   chart_spec: {
 *     chartType: 'Scatter Plot',
 *     encodings: { x: { field: 'weight' }, y: { field: 'mpg' } },
 *     canvasSize: { width: 400, height: 300 },
 *   },
 *   options: { addTooltips: true },
 * });
 * ```
 */
/** How Vega-Lite lays a chart out where nothing else says. */
const VEGA_LITE_LAYOUT: BackendLayoutProfile = {
    defaults: {
        // Vega-Lite's native width:{step} preserves the authored category pitch.
        bandStepFit: 0,
        // Vega-Lite native font defaults (labels 10, titles 11).
        baseLabelFontSize: 10,
        baseTitleFontSize: 11,
    },
    fallbacks: {
        // VL facet overhead:
        //   Fixed: y-axis labels (~35px width) + x-axis labels (~22px height)
        //          + titles/legend margin.
        //   Gap:   config.facet.spacing between panels; shrunk post-layout for
        //          small subplots (see facetGapVal below).
        facetFixedPadding: { width: 50, height: 40 },
        facetGap: 10,
        targetBandAR: 10,
    },
    // Vega-Lite's band padding where an offset channel nests marks inside each band.
    nestedBandPadding: { inner: 0.2, outer: 0.2 },
};

/** The headline and deck as one string, whichever shape the title took. */
function headlineText(title: any): string | undefined {
    if (!title) return undefined;
    const parts: string[] = [];
    const push = (v: any) => {
        if (typeof v === 'string') parts.push(v);
        else if (Array.isArray(v)) v.forEach(push);
    };
    if (typeof title === 'string') push(title);
    else { push(title.text); push(title.subtitle); }
    return parts.length ? parts.join(' ') : undefined;
}

/**
 * The axis the series run along, which an index reading moves over: the temporal axis, else
 * the discrete one beside a measure, else x.
 */
export function indexAxisOf(
    encodings: Partial<Record<'x' | 'y', { field?: string; type?: string } | undefined>>,
): 'x' | 'y' {
    const typeOf = (axis: 'x' | 'y') => (encodings[axis]?.field ? encodings[axis]?.type : undefined);
    const x = typeOf('x');
    const y = typeOf('y');
    if ((x === 'temporal') !== (y === 'temporal')) return y === 'temporal' ? 'y' : 'x';
    const discrete = (type: string | undefined) => type === 'nominal' || type === 'ordinal';
    if (discrete(y) && x !== undefined && !discrete(x)) return 'y';
    return 'x';
}

/** The plot's stated size — the view's continuous size, and the plot view's width and height — as one string. */
function plotSizeFields(spec: any): string {
    // A theme may wrap the plot in a concatenation with its furniture; the plot is the first view.
    let plot = spec;
    while (plot && !plot.mark && !plot.layer && !plot.facet && !plot.spec && (plot.vconcat ?? plot.hconcat ?? plot.concat)) {
        plot = (plot.vconcat ?? plot.hconcat ?? plot.concat)[0];
    }
    return JSON.stringify([
        spec.config?.view?.continuousWidth, spec.config?.view?.continuousHeight,
        plot?.width, plot?.height, plot?.spec?.width, plot?.spec?.height,
    ]);
}

/** What a Vega-Lite compile settles from the spec and the theme before it reads the data. */
interface VegaLitePreparation {
    chartType: string;
    semanticTypes: Record<string, string | SemanticAnnotation>;
    themeSpec: ReturnType<typeof resolveThemeSpec>;
    themePresets: ReturnType<typeof resolveCompileDefaults>;
    baseSize: { width: number; height: number };
    sizeCeiling: { width: number; height: number } | undefined;
    options: AssembleOptions;
    template: ChartTemplateDef;
    chartProperties: Record<string, any> | undefined;
    chartDefaultsReport: ThemeReport[];
    chartGeometry: ReturnType<typeof resolveGeometry>['geometry'];
    geometryReport: ThemeReport[];
    warnings: ChartWarning[];
}

function prepareVegaLite(input: ChartAssemblyInput): VegaLitePreparation {
    const chartType = input.chart_spec.chartType;
    const semanticTypes = input.semantic_types ?? {};
    // `theme_spec` may name a house Flint ships rather than spell one out.
    const themeSpec = resolveThemeSpec(input.theme_spec);
    // A house may prefer a size, a stretch budget, a facet gap. Those settle
    // before anything is measured, and in a fixed order: the chart spec first,
    // the theme's presets under it, flint's own defaults under that.
    const themePresets = resolveCompileDefaults(themeSpec, input.options);
    // Internal layout targets the base (target) size; the optional canvasSize
    // ceiling is applied as per-dimension stretch caps once options resolve.
    // The base is clamped to the ceiling so a smaller canvasSize shrinks the
    // chart to fit rather than overflowing it.
    const housePresets = themeSpec?.compileDefaults;
    const sizeCeiling = input.chart_spec.canvasSize ?? housePresets?.canvasSize;
    const baseSize = resolveBaseSize(input.chart_spec.baseSize ?? housePresets?.baseSize, sizeCeiling);
    const canvasSize = baseSize;
    const options = themePresets.options ?? {};
    const chartTemplate = vlGetTemplateDef(chartType) as ChartTemplateDef;
    if (!chartTemplate) {
        throw new Error(`Unknown chart type: ${chartType}`);
    }

    const warnings: ChartWarning[] = [];

    // Validate discrete property *values* against the template's declared
    // options before they reach `instantiate`. This maps a known display label
    // to its accepted value and drops unrecognized values, so a bad input never
    // produces an invalid backend spec (which would render blank).
    const normalizedProps = normalizeChartProperties(
        chartTemplate.properties, input.chart_spec.chartProperties,
    );
    let chartProperties = normalizedProps.chartProperties;
    warnings.push(...normalizedProps.warnings);

    // A house's rules about the chart itself — points on a line, a bump chart
    // left unsmoothed — change what is drawn, not how it is dressed, so they
    // are folded in here, before the pipeline reads the properties. Anything
    // the caller stated already is left alone.
    if (themeSpec && !chartProperties) chartProperties = {};
    const chartDefaultsReport = chartProperties
        ? resolveChartDefaults(
            themeSpec, chartType, chartTemplate.properties,
            input.chart_spec.chartProperties, chartProperties,
            (key) => analysisReadsProperty(chartTemplate, key),
        )
        : [];

    // One toggle, whichever way the template draws the numbers. A few charts
    // print their own value labels instead of going through the theme's
    // data-label layer. They expose the same `showValueLabels` control as every
    // other chart; translating it to the older internal `showTextLabels`
    // boolean keeps saved inputs compatible without publishing two controls.
    // Silence stays silent: with no answer the template keeps its own default.
    if (chartProperties && templateOwnsValueLabels(chartTemplate)) {
        const choice = resolveValueLabelChoice(chartProperties);
        if (choice) chartProperties.showTextLabels = choice === 'on';
    }

    // Geometry settles before anything is measured: whether a line carries dots
    // and how much of its step a bar fills change what the layout has to fit,
    // not just how the result is painted.
    const { geometry: chartGeometry, report: geometryReport } = resolveGeometry(
        themeSpec, chartType, chartTemplate.geometryKinds,
    );

    return {
        chartType, semanticTypes, themeSpec, themePresets, baseSize, sizeCeiling, options,
        template: chartTemplate, chartProperties, chartDefaultsReport, chartGeometry, geometryReport, warnings,
    };
}

/** The plan inputs a Vega-Lite compile gives the planner. */
function vegaLitePlanContext(input: ChartAssemblyInput, prepared: VegaLitePreparation, analysis: ChartAnalysis): PlanContext {
    const { chartType, semanticTypes, themeSpec, baseSize, sizeCeiling, options, chartProperties } = prepared;
    return {
        chartProperties,
        authoredProperties: input.chart_spec.chartProperties,
        semanticTypes,
        options,
        chartType,
        size: { baseSize, canvasSize: sizeCeiling },
        titled: Boolean(input.chart_spec.title?.trim() || input.chart_spec.subtitle?.trim()),
        theme: themeSpec,
        profile: VEGA_LITE_LAYOUT,
        bandLabels: chartType === 'Bar Table' ? undefined : { skip: (channel) => templateStatesAxisLabels(analysis.template.template, channel) },
    };
}

/**
 * Writes the Vega-Lite spec for a planned chart. Reads the analysis and the plan; changes neither.
 * `plotAsPlanned` is false when a stage after the plan (the theme fitting a long title) changed the plot size.
 */
function emitVegaLite(input: ChartAssemblyInput, prepared: VegaLitePreparation, analysis: ChartAnalysis, plan: LayoutPlan): { spec: any; plotAsPlanned: boolean } {
    const { chartType, semanticTypes, themeSpec, themePresets, baseSize: canvasSize, chartProperties, chartGeometry, geometryReport } = prepared;
    const warnings: ChartWarning[] = [...prepared.warnings, ...analysis.warnings, ...plan.warnings];
    const chartDefaultsReport: ThemeReport[] = [...prepared.chartDefaultsReport, ...plan.report];
    const { data, convertedData, encodings, channelSemantics, authoredTemplate, transformed, staticSeries, templateMarkType } = analysis;
    const chartTemplate = analysis.template;
    const typedRawEncodings = analysis.typedEncodings;
    const { declaration, facetGrid: facetGridResult, rows: values, layout: layoutResult } = plan;
    const nominalCounts = { ...plan.nominalCounts };
    const effectiveOptions = plan.options;
    const addTooltipsOpt = effectiveOptions.addTooltips ?? false;
    const facetFixW = effectiveOptions.facetFixedPadding!.width;
    const facetFixH = effectiveOptions.facetFixedPadding!.height;

    // ═══════════════════════════════════════════════════════════════════════
    // PHASE 2: Instantiate VL Spec
    // ═══════════════════════════════════════════════════════════════════════

    // --- Build VL encodings (abstract semantics → VL encoding objects) ---

    // For static series, suppress the synthetic key/value column axis titles
    // (show "Series"/"Value" instead of "__flint_series_key"/"__flint_series_value")
    // and map field names to display names
    let fieldDisplayNames = input.field_display_names;
    if (staticSeries) {
        fieldDisplayNames = { ...fieldDisplayNames };
        // Hide the synthetic key column name from the legend title
        if (!fieldDisplayNames[staticSeries.keyColumn]) {
            fieldDisplayNames[staticSeries.keyColumn] = 'Series';
        }
        // Hide the synthetic value column name from the measure axis title.
        // The folded fields have no single intrinsic name, so default to "Value"
        // (the host can override via field_display_names).
        if (!fieldDisplayNames[staticSeries.valueColumn]) {
            fieldDisplayNames[staticSeries.valueColumn] = 'Value';
        }
        // Map each series field name to its display name (if available) for legend labels
        // This uses VL's labelExpr or scale domain in the encoding
    }

    const resolvedEncodings = buildVLEncodings(
        encodings, channelSemantics, declaration, data,
        canvasSize, semanticTypes, templateMarkType, chartTemplate,
        fieldDisplayNames, chartProperties,
    );

    // --- Align sort/domain arrays to converted data types ---
    // buildVLEncodings uses the original data, but the VL spec embeds
    // post-conversion data (e.g. Year 1980 → "1980").  Re-map sort and
    // scale.domain entries so VL can match them against data.values.
    for (const enc of Object.values(resolvedEncodings)) {
        const field = enc?.field;
        if (!field) continue;
        // Build a lookup from the converted (spec-embedded) data
        const valMap = new Map<string, any>();
        for (const r of values) {
            const v = r[field];
            if (v != null && !valMap.has(String(v))) valMap.set(String(v), v);
        }
        if (valMap.size === 0) continue;
        const remap = (arr: any[]) => arr.map(v => {
            const key = String(v);
            return valMap.has(key) ? valMap.get(key) : v;
        });
        if (Array.isArray(enc.sort)) enc.sort = remap(enc.sort);
        if (Array.isArray(enc.scale?.domain)) enc.scale.domain = remap(enc.scale.domain);
    }

    // Detect x/y discrete counts inside template layers for layered specs
    const isDiscreteType = (t: string | undefined) => t === 'nominal' || t === 'ordinal';
    if (Array.isArray(chartTemplate.template?.layer)) {
        for (const axis of ['x', 'y'] as const) {
            if (nominalCounts[axis] === 0) {
                for (const layer of chartTemplate.template.layer) {
                    const layerEnc = layer.encoding?.[axis];
                    if (layerEnc?.field && isDiscreteType(layerEnc.type)) {
                        nominalCounts[axis] = new Set(values.map((r: any) => r[layerEnc.field])).size;
                        break;
                    }
                }
                if (nominalCounts[axis] === 0 && resolvedEncodings[axis]?.field) {
                    const enc = resolvedEncodings[axis];
                    if (isDiscreteType(enc.type)) {
                        nominalCounts[axis] = new Set(values.map((r: any) => r[enc.field])).size;
                    }
                }
            }
        }
    }

    // --- template.instantiate (template-specific VL spec building) ---

    const vgObj = structuredClone(chartTemplate.template);

    const instantiateContext: InstantiateContext = {
        channelSemantics,
        layout: layoutResult,
        plot: plan.plot,
        table: values,
        fullTable: convertedData,
        resolvedEncodings,
        encodings,
        chartProperties,
        staticSeries,
        canvasSize,
        semanticTypes,
        chartType,
        assembleOptions: effectiveOptions,
        geometry: chartGeometry,
    };

    const axisLabelFontSize = plan.axisLabelFontSize;
    chartTemplate.instantiate(vgObj, instantiateContext);

    // Facet-identity augmentation is presentation-only: the structural series
    // has already moved to column/row for semantics, layout, stacking, and
    // dodging. Reapply its learned color now so faceted panels preserve visual
    // identity without making the compiler treat color as another series role.
    if (transformed.augmentation?.kind === 'facet-identity') {
        const facetEncoding = resolvedEncodings[transformed.augmentation.facetChannel];
        if (facetEncoding?.field) {
            const colorEncoding = { ...facetEncoding };
            delete colorEncoding.header;
            delete colorEncoding.axis;
            delete colorEncoding.columns;
            const scheme = transformed.augmentation.colorEncoding.scheme;
            if (scheme) {
                colorEncoding.scale = { ...(colorEncoding.scale ?? {}), scheme };
            }
            vgObj.encoding = vgObj.encoding || {};
            vgObj.encoding.color = colorEncoding;

            // Vega-Lite implicitly stacks bars/areas whenever a discrete color
            // channel is present. This color is redundant identity, not a stack
            // series, so pin the quantitative position channel to unstacked.
            for (const axis of ['x', 'y']) {
                const encoding = vgObj.encoding[axis];
                if (encoding?.type === 'quantitative' && encoding.stack === undefined) {
                    encoding.stack = null;
                }
            }
        }
    }

    // Merge any warnings emitted by instantiate
    if (vgObj._warnings && Array.isArray(vgObj._warnings)) {
        warnings.push(...vgObj._warnings);
        delete vgObj._warnings;
    }

    // --- restructureFacets (VL-specific) ---
    // The facet grid (including wrapping) was already decided by
    // computeChannelBudgets.  restructureFacets only performs the VL structural
    // transform (column encoding → facet + spec for layered specs).

    restructureFacets(vgObj, nominalCounts, facetGridResult);

    // --- vlApplyLayoutToSpec (VL-specific: config, sizing, formatting) ---

    vlApplyLayoutToSpec(vgObj, instantiateContext, warnings, axisLabelFontSize);

    // --- Post-layout adjustments (VL-specific) ---

    const defaultChartWidth = canvasSize.width;
    const defaultChartHeight = canvasSize.height;

    // Compute banded-aware minimum subplot dimensions from core helper.
    const { minSubplotWidth, minSubplotHeight } = computeMinSubplotDimensions(
        channelSemantics, declaration, values, effectiveOptions,
    );

    // Shrink gap for small subplots: scale linearly from the reference
    // (10px gap at 100px subplot), with a floor of 4px.
    const refGap = effectiveOptions.facetGap ?? 0;
    const subplotDim = Math.min(layoutResult.subplotWidth, layoutResult.subplotHeight);
    const REF_SUBPLOT = 100;
    const facetGapVal = Math.max(6, Math.round(refGap * subplotDim / REF_SUBPLOT));

    // Apply the computed gap to the VL spec so Vega-Lite uses it for spacing.
    vgObj.config = vgObj.config || {};
    vgObj.config.facet = { spacing: facetGapVal };

    const maxFacetColumns = Math.max(2, Math.floor((defaultChartWidth * effectiveOptions.maxStretchX! - facetFixW) / (minSubplotWidth + facetGapVal)));
    const maxFacetRows = Math.max(2, Math.floor((defaultChartHeight * effectiveOptions.maxStretchY! - facetFixH) / (minSubplotHeight + facetGapVal)));
    const maxFacetNominalValues = maxFacetColumns * maxFacetRows;

    // Bin quantitative facets
    for (const channel of ['facet', 'column', 'row']) {
        const enc = vgObj.encoding?.[channel];
        if (enc?.type === 'quantitative') {
            const fieldName = enc.field;
            const uniqueValues = [...new Set(values.map((r: any) => r[fieldName]))];
            if (uniqueValues.length > maxFacetNominalValues) {
                enc.bin = true;
            }
        }
    }

    // Independent y-axis scaling for faceted charts.
    // For layered specs (e.g. Regression), y encoding lives inside layer items, not at the top.
    const effectiveEncoding = vgObj.spec?.encoding || vgObj.encoding;
    const layerEncodings = (vgObj.spec?.layer || vgObj.layer || []).map((l: any) => l.encoding).filter(Boolean);
    const yEnc = effectiveEncoding?.y || layerEncodings.find((e: any) => e.y)?.y;
    const effectiveFacet = vgObj.facet || vgObj.encoding?.facet;
    const hasFacetedQuant = effectiveFacet != undefined && yEnc?.type === 'quantitative';
    let computedIndependentYAxis = false;
    if (hasFacetedQuant) {
        const userChoice = chartProperties?.independentYAxis; // true | false | undefined

        if (userChoice === undefined) {
            // Auto-heuristic: independent when value ranges differ by ≥100×
            const yField = yEnc.field;
            const columnField = effectiveFacet.field;

            if (yField && columnField) {
                const columnGroups = new Map<any, number>();
                for (const row of data) {
                    const columnValue = row[columnField];
                    const yValue = row[yField];
                    if (yValue != null && !isNaN(yValue)) {
                        const currentMax = columnGroups.get(columnValue) || 0;
                        columnGroups.set(columnValue, Math.max(currentMax, Math.abs(yValue)));
                    }
                }

                const maxValues = Array.from(columnGroups.values()).filter(v => v > 0);
                if (maxValues.length >= 2) {
                    const maxValue = Math.max(...maxValues);
                    const minValue = Math.min(...maxValues);
                    const ratio = maxValue / minValue;
                    const totalFacets = (layoutResult.facet?.columns ?? 1) * (layoutResult.facet?.rows ?? 1);
                    if (ratio >= 100 && totalFacets < 6) {
                        computedIndependentYAxis = true;
                    }
                }
            }
        } else {
            computedIndependentYAxis = !!userChoice;
        }

        if (computedIndependentYAxis) {
            if (!vgObj.resolve) vgObj.resolve = {};
            if (!vgObj.resolve.scale) vgObj.resolve.scale = {};
            vgObj.resolve.scale.y = "independent";
        }
    }

    if (addTooltipsOpt) {
        vlApplyTooltips(vgObj);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HEADLINE
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Written before theming, because whether the chart has a headline is a
    // fact the theme reasons about: a house that omits axis titles is leaning
    // on this line to name the measure.
    const headline = input.chart_spec.title?.trim();
    const deck = input.chart_spec.subtitle?.trim();
    if (headline || deck) {
        vgObj.title = {
            text: headline ?? '',
            ...(deck ? { subtitle: [deck] } : {}),
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // THEME (level 2 grounding → level 3 realization)
    // ═══════════════════════════════════════════════════════════════════════
    //
    // Runs last, deliberately. `vlApplyLayoutToSpec` builds `config` wholesale
    // from fit decisions; the theme is a style layer over a chart that already
    // fits, so it must see the finished spec.
    //
    // Grounding runs whether or not a house was named — with the neutral house
    // when it was not. Some design questions are Flint's own and want answering
    // either way: whether this chart can carry its values, and at this density
    // whether it should. A house enhances that answer (it may prefer values on,
    // or tolerate a tighter chart); it does not own it. Only *realization* is
    // gated, so an untheme'd chart gets its numbers without also getting a
    // house's ink, type and furniture.
    const plannedPlotSize = plotSizeFields(vgObj);
    const markTypes = collectMarkTypes(vgObj);
    // Some templates write their own text on the marks. Where they do, the
    // label layer stands down (it will not print a second number beside the
    // template's), so the toggle would be a control that changes nothing.
    // Asked before realization, because realization is what adds the label
    // layer — asked after, every labelled chart would look like this.
    const templateDrawsOwnText = markTypes.includes('text');
    const stackedChannel = (vgObj.spec?.encoding ?? vgObj.encoding ?? {});
    const stacked = stackedChannel.y?.stack ?? stackedChannel.x?.stack;
    const design = groundTheme(themeSpec ?? {}, {
        chartType,
        markChannel: chartTemplate.markCognitiveChannel,
        markTypes,
        namesOnMarks: (chartProperties as any)?.showSeriesInLabel === true,
        channelSemantics,
        resolvedTypes: declaration.resolvedTypes as Record<string, string> | undefined,
        axisFlags: declaration.axisFlags,
        positional: collectPositional(vgObj),
        layout: layoutResult,
        table: values,
        canvasSize,
        stacked: stacked === 'normalize' ? 'normalize' : Boolean(stacked),
        partToWhole: markTypes.includes('arc'),
        titled: Boolean(vgObj.title),
        headline: headlineText(vgObj.title),
        hostSurface: (input.options as any)?.background,
        valueLabels: chartTemplate.suppressValueLabels
            ? 'off'
            : resolveValueLabelChoice(chartProperties),
        geometryKinds: chartTemplate.geometryKinds,
        liveLayoutSignal: input.options?.liveLayoutSignal,
    });

    let themeDecisions: any;
    if (themeSpec) {
        const realizeReport = realizeThemeVegaLite(vgObj, design, values);
        themeDecisions = {
            ...design,
            report: [...themePresets.report, ...chartDefaultsReport, ...geometryReport, ...design.report, ...realizeReport],
        };
    } else {
        realizeValueLabelsVegaLite(vgObj, design, values);
    }
    const liveLabels = design.dataLabels.liveSignal;
    if (liveLabels) {
        vgObj.params = [...(vgObj.params ?? []), {
            name: liveLabels,
            value: {
                labels: {
                    show: design.dataLabels.show,
                    minValue: design.dataLabels.segmentMinValue ?? 0,
                    format: design.dataLabels.format ?? '',
                },
            },
        }];
    }

    chartTemplate.postProcess?.(vgObj, instantiateContext);
    vlFinalizeTemporalAxes(vgObj, instantiateContext);
    vlWrapLegendText(vgObj, instantiateContext);
    const plotAsPlanned = plotSizeFields(vgObj) === plannedPlotSize;

    // ═══════════════════════════════════════════════════════════════════════
    // RESULT
    // ═══════════════════════════════════════════════════════════════════════

    const result: any = { ...vgObj, data: vgObj.data ?? { values } };
    // Runtime detail levels and a pre-projected base map travel with the
    // interaction semantics, not the spec.
    delete result._geoLevels;
    delete result._geoPreProjection;
    if (themeDecisions) {
        result._theme = {
            id: themeDecisions.themeId,
            report: themeDecisions.report,
            decisions: themeDecisions,
        };
    }
    if (warnings.length > 0) {
        result._warnings = warnings;
    }
    if (plan.viewports.length > 0) {
        result._viewports = plan.viewports;
    }
    const unfaceted = !resolvedEncodings.column?.field && !resolvedEncodings.row?.field;
    // A projected chart navigates its projection extent, so both axes move
    // together and no continuous x/y encoding is required.
    const support = chartTemplate.interactionSupport;
    const geoNavigation = !!support?.navigation?.geo && unfaceted;
    const navigationAxes: ('x' | 'y')[] = geoNavigation
        ? ['x', 'y']
        : support?.navigation && unfaceted
            ? (support.navigation.axes ?? ['x', 'y']).filter((axis) => {
                const encoding = resolvedEncodings[axis];
                return !!encoding?.field && (encoding.type === 'quantitative' || encoding.type === 'temporal');
            })
            : [];
    const templateSemantics = chartTemplate.semanticInteractions?.({ resolvedEncodings }) ?? {
        fields: [],
        provenanceFields: undefined,
        temporalProvenanceFields: undefined,
        rangeProvenance: undefined,
        selectableMarks: [],
        reorderAxis: undefined,
        reorderAxes: undefined,
    };
    const semanticEncodings = Object.values(resolvedEncodings)
        .filter((encoding: any) => typeof encoding?.field === 'string') as any[];
    const hasAggregate = semanticEncodings.some((encoding) => encoding.aggregate);
    const provenanceFields = [...new Set(semanticEncodings
        .filter((encoding) => !hasAggregate || !encoding.aggregate)
        .map((encoding) => encoding.field as string))];
    const temporalProvenanceFields = [...new Set(semanticEncodings
        .filter((encoding) => encoding.type === 'temporal')
        .map((encoding) => encoding.field as string))];
    const reorderSupport = support?.reorder;
    const allowedReorderAxes: readonly ('x' | 'y')[] = reorderSupport
        ? reorderSupport.axes ?? ['x', 'y']
        : [];
    const defaultReorderAxes = allowedReorderAxes.length > 0
        && !resolvedEncodings.column?.field && !resolvedEncodings.row?.field
        ? (['x', 'y'] as const).flatMap((axis) => {
            const encoding = resolvedEncodings[axis];
            return allowedReorderAxes.includes(axis)
                && encoding?.field && (encoding.type === 'nominal' || encoding.type === 'ordinal')
                ? [{
                    axis,
                    field: encoding.field,
                    ...(reorderSupport?.includeConnectiveMarks ? { includeConnectiveMarks: true } : {}),
                    ...(reorderSupport?.markTypes ? { markTypes: reorderSupport.markTypes } : {}),
                }]
                : [];
        })
        : [];
    const explicitReorderAxes = templateSemantics.reorderAxes
        ?? (templateSemantics.reorderAxis ? [templateSemantics.reorderAxis] : []);
    const legendFields = 'legendFields' in templateSemantics ? templateSemantics.legendFields : undefined;
    const rangeLegendChannels = Object.keys(legendFields ?? {})
        .filter((channel) => {
            const type = resolvedEncodings[channel]?.type;
            return type === 'quantitative' || type === 'temporal';
        });
    const reorderAxes = [...explicitReorderAxes, ...defaultReorderAxes]
        .filter((candidate, index, candidates) =>
            getRegistryEntry(channelSemantics[candidate.axis]?.semanticAnnotation?.semanticType ?? '').t1 !== 'DateGranule'
            && candidates.findIndex(
            (axis) => axis.axis === candidate.axis && axis.field === candidate.field,
        ) === index);
    const discreteLegend = Object.keys(legendFields ?? {})
        .some((channel) => !rangeLegendChannels.includes(channel));
    const discreteAxis = (['x', 'y'] as const).some((axis) => {
        const encoding = resolvedEncodings[axis];
        return !!encoding?.field && (encoding.type === 'nominal' || encoding.type === 'ordinal');
    });
    const indexAxis = indexAxisOf(resolvedEncodings);
    const confirmed: Partial<Record<InteractionCapability, boolean>> = {
        navigation: navigationAxes.length > 0,
        reorder: reorderAxes.length > 0,
        legend: discreteLegend,
        'discrete-axis': discreteAxis,
        index: !!resolvedEncodings[indexAxis]?.field,
    };
    const capabilities = declaredInteractionCapabilities(support)
        .filter((capability) => confirmed[capability] ?? true);
    result._interactionSemantics = {
        ...templateSemantics,
        chartType: chartTemplate.chart,
        capabilities,
        indexAxis,
        axisFields: Object.fromEntries((['x', 'y'] as const).flatMap((axis) => {
            const encoding = resolvedEncodings[axis];
            return encoding?.field
                ? [[axis, { field: encoding.field, type: encoding.type ?? 'nominal' }]]
                : [];
        })),
        sourceRecords: values.map((record) => ({ ...record })),
        provenanceFields: templateSemantics.provenanceFields ?? provenanceFields,
        temporalProvenanceFields: templateSemantics.temporalProvenanceFields ?? temporalProvenanceFields,
        rangeLegendChannels,
        navigationAxes,
        geoNavigation,
        ...(vgObj._geoLevels ? { geoLevels: vgObj._geoLevels } : {}),
        ...(vgObj._geoPreProjection ? { geoPreProjection: vgObj._geoPreProjection } : {}),
        reorderAxis: reorderAxes[0],
        reorderAxes,
        selectionBoundary: design.interaction.selectionBoundary,
        continuousColorFocus: design.interaction.continuousColorFocus,
        neutralizeContinuousColor: chartTemplate.chart === 'Map' || chartTemplate.chart === 'Choropleth',
    };
    result._width = plan.plot.width;
    result._height = plan.plot.height;
    // Annotated option catalog: every configurable property this template
    // exposes, tagged with whether it is *applicable* for this spec + data and
    // the *value* the compiler will use (host choice if set, else the engine's
    // recommended default). This is the single contract a host (DF, an AI agent,
    // another renderer) reads to know which controls to surface and how to seed
    // them — see ChartOption / getChartOptions. Passing a non-applicable
    // property back to the compiler is accepted but silently ignored.
    //
    // Each property decides its own applicability through its pure `check(ctx)`
    // (the single source of truth, co-located with the property). The one piece
    // that can't live there is `independentYAxis`'s *recommended default* —
    // whether to turn it on automatically — which is layout-coupled (it needs the
    // resolved facet grid and the assembled spec's facet/y structure, differing
    // for 1-D vs 2-D facets); that value is computed above and threaded in here.
    const evalCtx: OptionEvalContext = {
        encodings,
        channelSemantics,
        data,
        chartProperties,
    };
    const ownsLabels = templateOwnsValueLabels(chartTemplate);
    const valueLabelChoice = resolveValueLabelChoice(chartProperties);
    const explicitValueLabels = valueLabelChoice == null
        ? undefined
        : valueLabelChoice === 'on';
    const layoutCoupledRecommendation: Record<string, any> = {
        independentYAxis: computedIndependentYAxis,
        // Seed the labels toggle from what the house and the density actually
        // decided, so an untouched control shows the theme's own habit and
        // re-seeds when the reader switches theme. Where the template owns its
        // labels, its own boolean is the honest answer.
        showValueLabels: ownsLabels
            ? explicitValueLabels ?? design?.dataLabels?.show
            : design?.dataLabels?.show,
    };
    // Whether offering a labels control means anything is a question about the
    // resolved layout — is there anything to key a number to, and is there room
    // to print it — so only the grounded design can answer it. A chart too
    // dense to read numbers on cannot be argued into it, and neither can one
    // whose template already writes its own text. Templates that print labels
    // *on request* are the exception: they answer to the toggle themselves.
    const designCoupledApplicability: Record<string, boolean> = {
        showValueLabels: !chartTemplate.suppressValueLabels && (ownsLabels
            || (design?.dataLabels?.possible === true && !templateDrawsOwnText)),
        // The older spelling stays an accepted *input* for compatibility, but a
        // host should be shown one switch, not two that fight.
        showTextLabels: false,
    };

    result._options = (chartTemplate.properties ?? []).map((def): ChartOption => {
        const ev = def.check?.(evalCtx);
        const applicable = def.key in designCoupledApplicability
            ? designCoupledApplicability[def.key]
            : ev ? ev.applicable : true;
        const recommended = layoutCoupledRecommendation[def.key] ?? ev?.recommendedValue;
        const value = chartProperties?.[def.key] ?? recommended ?? def.defaultValue;
        // Strip the `check` rule — a ChartOption is the resolved, serializable
        // answer (`applicable`/`value`), not the predicate that produced it.
        const { check, ...rest } = def;
        return { ...rest, applicable, value };
    });
    // Layout-level facet-wrap control: offered whenever a column facet has
    // enough panels to wrap. It's not a per-template MARK property, so it's
    // injected centrally rather than declared on every faceted template. The
    // value seeds from the raw user override, else the auto-computed grid
    // column count (facetGridResult), else all panels in one row.
    const colFacetField = channelSemantics.column?.field;
    if (colFacetField) {
        const colCount = new Set(data.map((r: any) => r[colFacetField])).size;
        if (colCount > 2) {
            const rawFacetCols = input.chart_spec.chartProperties?.facetColumns;
            result._options.push({
                key: 'facetColumns',
                label: 'Columns',
                type: 'continuous',
                min: 1,
                max: colCount,
                step: 1,
                applicable: true,
                value: rawFacetCols ?? facetGridResult?.columns ?? colCount,
            } as ChartOption);
        }
    }
    // Pivot surface: the resolved set of alternative views (state ids + labels +
    // active index) for the current encodings + data. Hosts read this to render
    // a cyclic prev/next control and write the chosen id back to
    // chartProperties[pivot.key]. Absent when the chart has <= 1 state.
    if (transformed.surface) {
        result._transform = transformed.surface;
    }
    // Legacy single-control surface (composed orbit) for backward-compat
    // consumers (getChartPivot). Enumerated from the AUTHORED template so its
    // ids/labels match the pre-split contract. Rendering above is driven by
    // `transformed` (the two-control model); this is surface-only.
    const legacyPivot = applyPivot(authoredTemplate, typedRawEncodings, data, chartProperties, vlGetTemplateDef);
    if (legacyPivot.surface) {
        result._pivot = legacyPivot.surface;
    }
    return { spec: result, plotAsPlanned };
}

export function assembleVegaLite(input: ChartAssemblyInput): any {
    const prepared = prepareVegaLite(input);
    const analysis = analyzeChart(input, prepared.template, prepared.chartProperties, vlGetTemplateDef);
    const plan = planLayout(analysis, vegaLitePlanContext(input, prepared, analysis));
    return emitVegaLite(input, prepared, analysis, plan).spec;
}

/** The rows a re-plan lays out: a subset of the analysis rows, or rows the host supplies. */
export type ReplanRows =
    | { keep: (row: Record<string, any>) => boolean }
    | { rows: readonly Record<string, unknown>[] };

/** A compiled chart that keeps its analysis, so it can be planned again for the rows it shows. */
export interface VegaLiteSession {
    /** The chart as compiled. */
    readonly spec: any;
    /** The plot the chart draws; undefined when it draws several views. */
    readonly plot: { width: number; height: number } | undefined;
    /**
     * The chart planned for other rows from the same analysis, and the plot it draws (undefined as
     * for `plot`). `pinPlot` holds the plot at its compiled size, as a window into the data does;
     * without it the plot follows the rows.
     */
    replan(change: ReplanRows & { pinPlot?: boolean }): { spec: any; plot: { width: number; height: number } | undefined };
}

export function openVegaLiteSession(input: ChartAssemblyInput): VegaLiteSession {
    const prepared = prepareVegaLite(input);
    const analysis = analyzeChart(input, prepared.template, prepared.chartProperties, vlGetTemplateDef);
    const context = vegaLitePlanContext(input, prepared, analysis);
    const drawnPlot = (planned: LayoutPlan, plotAsPlanned: boolean) =>
        planned.composite || !plotAsPlanned ? undefined : planned.plot;
    const plan = planLayout(analysis, context);
    const emitted = emitVegaLite(input, prepared, analysis, plan);
    return {
        spec: emitted.spec,
        plot: drawnPlot(plan, emitted.plotAsPlanned),
        replan: (change) => {
            const next = planLayout(analysis, {
                ...context,
                rows: 'keep' in change ? analysis.convertedData.filter(change.keep) : analysis.shapeRows(change.rows),
                ...(change.pinPlot ? { pins: { plot: plan.plot } } : {}),
            });
            const replanned = emitVegaLite(input, prepared, analysis, next);
            return { spec: replanned.spec, plot: drawnPlot(next, replanned.plotAsPlanned) };
        },
    };
}

/**
 * What the caller asked for on value labels, in one word.
 *
 * `showValueLabels` is the control; `showTextLabels` is the older boolean some
 * templates and hosts still pass, and it keeps working — `true` means print,
 * `false` means the caller never touched it (it was the key's default), so it
 * reads as `auto` rather than as a demand for silence. Only the tri-state can
 * say "off".
 */
/**
 * Does this template print its own value labels, rather than leaving them to
 * the theme's data-label layer?
 */
function templateOwnsValueLabels(template: ChartTemplateDef): boolean {
    return template.ownsValueLabels === true;
}

function resolveValueLabelChoice(
    chartProperties: Record<string, any> | undefined,
): 'on' | 'off' | undefined {
    const choice = chartProperties?.showValueLabels;
    if (typeof choice === 'boolean') return choice ? 'on' : 'off';
    // `showTextLabels` is the older, template-owned spelling of the same wish.
    // Only `true` is meaningful: it was the opt-in for charts that print their
    // own numbers, so `false` means "never asked", not "asked for silence".
    return chartProperties?.showTextLabels === true ? 'on' : undefined;
}

/**
 * Inspect a chart spec + dataset and report the configurable options Flint
 * exposes for it, each annotated with whether it is *applicable* and the *value*
 * the compiler will use (see ChartOption).
 *
 * This is the "ask Flint what knobs are available" entry point. A host calls it
 * with the same input it would pass to `assembleVegaLite`, renders a control for
 * each applicable option seeded from `value`, and feeds the user's choices back
 * via `chart_spec.chartProperties`. Because applicability is derived from the
 * data (not from the chosen values), the set is stable across that loop.
 *
 * It runs the same analysis pipeline as `assembleVegaLite` (the options are a
 * by-product of assembly), so applicability can never drift from what the
 * compiler actually does — a property reported applicable is exactly one the
 * compiler will honor.
 */
export function getChartOptions(input: ChartAssemblyInput): ChartOption[] {
    const spec = assembleVegaLite(input);
    return spec && Array.isArray(spec._options) ? spec._options : [];
}

/**
 * Inspect a chart spec + dataset and report the pivot surface Flint exposes for
 * it — the ordered alternative views (orientation/role/facet) the host can cycle
 * through, with the active index. Returns `undefined` when the chart has a
 * single view (no control should be shown). Mirrors getChartOptions: it runs the
 * same analysis pipeline so the surface can never drift from what the compiler
 * actually does. The host renders a cyclic control seeded from `index` and
 * writes the chosen `ids[next]` back to `chart_spec.chartProperties[key]`.
 */
export function getChartPivot(input: ChartAssemblyInput): PivotSurface | undefined {
    const spec = assembleVegaLite(input);
    return spec && spec._pivot ? (spec._pivot as PivotSurface) : undefined;
}

/**
 * Inspect a chart spec + dataset and report the two-control transform surface
 * Flint exposes for it — Control B (chart-type transitions, a dropdown) and
 * Control A (local rearrangement group, a stepper). Either sub-surface is
 * absent when that control has a single state. Mirrors getChartPivot but for the
 * factored model (design-docs/chart-transform-two-axes.md). Hosts render a
 * dropdown seeded from `chartType.index` (writing the chosen id to
 * chartProperties.chartType) and a cyclic stepper seeded from `arrange.index`
 * (writing chartProperties.arrange).
 */
export function getChartTransform(input: ChartAssemblyInput): TransformSurface | undefined {
    const spec = assembleVegaLite(input);
    return spec && spec._transform ? (spec._transform as TransformSurface) : undefined;
}

// ===========================================================================
// buildVLEncodings — Translate abstract semantics → VL encoding objects
// ===========================================================================

/**
 * Translate Phase 0 channel semantics + declaration overrides into
 * concrete Vega-Lite encoding objects. This is the only place outside
 * template.instantiate() that constructs VL-specific syntax.
 */
function buildVLEncodings(
    encodings: Record<string, ChartEncoding>,
    channelSemantics: Record<string, import('../core/types').ChannelSemantics>,
    declaration: LayoutDeclaration,
    data: any[],
    canvasSize: { width: number; height: number },
    semanticTypes: Record<string, string | SemanticAnnotation>,
    templateMarkType: string | undefined,
    chartTemplate: ChartTemplateDef,
    fieldDisplayNames?: Record<string, string>,
    chartProperties?: Record<string, any>,
): Record<string, any> {
    const resolvedEncodings: Record<string, any> = {};
    const dataFields = new Set(data.flatMap(row => Object.keys(row)));

    // Only process channels the template declares (plus facets which are always valid)
    const templateChannels = new Set([
        ...(chartTemplate.channels || []),
        'column', 'row',  // faceting is always allowed
    ]);

    for (const [channel, encoding] of Object.entries(encodings)) {
        // Skip channels not supported by this chart type
        if (!templateChannels.has(channel)) continue;

        const encodingObj: any = {};
        const fieldName = encoding.field;
        const cs = channelSemantics[channel];

        if (channel === "radius") {
            encodingObj.scale = { type: "sqrt", zero: true };
        }

        // Handle count aggregate without a field
        if (!fieldName && encoding.aggregate === "count") {
            encodingObj.field = "_count";
            encodingObj.title = "Count";
            encodingObj.type = "quantitative";
        }

        if (fieldName) {
            const escapedFieldName = escapeVlFieldName(fieldName);
            encodingObj.field = escapedFieldName;
            // Preserve a readable axis/legend title when the raw name had to be
            // escaped (VL would otherwise display the backslash-escaped string).
            if (escapedFieldName !== fieldName) {
                encodingObj.title = fieldName;
            }

            // Use Phase 0's resolved type
            encodingObj.type = cs?.type || 'nominal';

            // Explicit type override
            if (encoding.type) {
                encodingObj.type = encoding.type;
            } else if (channel === 'column' || channel === 'row') {
                if (encodingObj.type !== 'nominal' && encodingObj.type !== 'ordinal') {
                    encodingObj.type = 'nominal';
                }
            }

            // Aggregation handling — point the encoding at the derived column.
            // applyAggregation (run before semantics) produces `${field}_${op}`
            // / `_count` when the caller requests it; a pre-aggregated caller
            // supplies that column directly.
            if (encoding.aggregate) {
                if (encoding.aggregate === "count") {
                    encodingObj.field = "_count";
                    encodingObj.title = "Count";
                    encodingObj.type = "quantitative";
                } else {
                    encodingObj.field = escapeVlFieldName(`${fieldName}_${encoding.aggregate}`);
                    encodingObj.type = "quantitative";
                }
            }

            // Scale: quantitative X axes need tight domains for line-like marks
            if (encodingObj.type === "quantitative" && channel === "x") {
                if (templateMarkType === 'line' || templateMarkType === 'area' ||
                    templateMarkType === 'trail' || templateMarkType === 'point') {
                    encodingObj.scale = { nice: false };
                }
            }

        }

        // Size channel: set scale based on resolved encoding type
        if (channel === "size") {
            const vlDefaultMax = 361;
            const plotArea = canvasSize.width * canvasSize.height;
            const n = Math.max(data.length, 1);
            const fairShare = plotArea / n;
            const targetPct = 0.6;
            const absoluteMin = 16;

            const isQuantitative = encodingObj.type === 'quantitative' || encodingObj.type === 'temporal';
            if (isQuantitative) {
                const maxSize = Math.round(Math.max(absoluteMin, Math.min(vlDefaultMax, fairShare * targetPct)));
                const minSize = 9;
                encodingObj.scale = { type: "sqrt", zero: true, range: [minSize, maxSize] };
            } else {
                const maxSize = Math.round(Math.max(absoluteMin, Math.min(vlDefaultMax, fairShare * targetPct)));
                const minSize = Math.round(maxSize / 4);
                encodingObj.scale = { range: [minSize, maxSize] };
            }
        }

        // --- Sorting ---
        // Helper: when the field's actual data values are numeric but the
        // encoding is nominal, domain/sort arrays must keep numeric types
        // so Vega-Lite can match them against the data.
        const fieldIsNumeric = fieldName
            ? data.some(r => typeof r[fieldName] === 'number')
            : false;
        const preserveDomainTypes = (arr: any[]): any[] => {
            if (!fieldIsNumeric) return arr;
            return arr.map(v => {
                if (typeof v === 'string') {
                    const n = Number(v);
                    if (!isNaN(n) && String(n) === v.trim()) return n;
                }
                return v;
            });
        };

        const explicitSort = inspectEncodingSort(encoding, channel, encodings, dataFields).sort;
        if (encoding.sortBy !== undefined || encoding.sortOrder !== undefined) {
            if (encoding.sortBy === undefined) {
                if (encoding.sortOrder) {
                    const canonical = cs?.ordinalSortOrder;
                    encodingObj.sort = canonical?.length
                        ? preserveDomainTypes(encoding.sortOrder === 'descending' ? [...canonical].reverse() : canonical)
                        : encoding.sortOrder;
                }
            } else if (encoding.sortBy === 'x' || encoding.sortBy === 'y') {
                if (encoding.sortBy === channel) {
                    encodingObj.sort = `${encoding.sortOrder === "descending" ? "-" : ""}${encoding.sortBy}`;
                } else {
                    encodingObj.sort = `${encoding.sortOrder === "ascending" ? "" : "-"}${encoding.sortBy}`;
                }
            } else if (encoding.sortBy === 'color') {
                if (encodings.color?.field) {
                    encodingObj.sort = `${encoding.sortOrder === "ascending" ? "" : "-"}${encoding.sortBy}`;
                }
            } else if (explicitSort?.kind === 'field') {
                encodingObj.sort = explicitSort.field === fieldName ? encoding.sortOrder ?? 'ascending'
                    : { field: escapeVlFieldName(explicitSort.field), op: 'min', order: encoding.sortOrder ?? 'ascending' };
            } else if (explicitSort?.kind === 'values') {
                let sortedValues: any[] = explicitSort.values;
                // Temporal fields sort chronologically by default in VL; an explicit
                // value array is redundant, pollutes the spec with potentially hundreds
                // of date strings, and can break continuous temporal scales.
                if (encodingObj.type !== 'temporal' && fieldName) {
                    const fieldSemType = toTypeString(semanticTypes[fieldName]);
                    const fieldVisCat = inferVisCategory(data.map(r => r[fieldName]));
                    if (fieldVisCat === 'temporal' || fieldSemType === "Year" || fieldSemType === "Decade") {
                        sortedValues = sortedValues.map(value => value.toString());
                    }
                    sortedValues = preserveDomainTypes(sortedValues);
                    encodingObj.sort = encoding.sortOrder === 'descending' ? [...sortedValues].reverse() : sortedValues;
                }
            }
        } else {
            // Auto-sort: apply canonical ordinal sort (months, days, quarters, etc.)
            // when available. Otherwise, set `sort: null` so VL preserves the data
            // encounter order rather than its default alphabetical sort.
            // Alphabetical sort breaks labels like "Stage 1", "Stage 10", "Stage 2"
            // which should follow their natural data order.
            const isDiscreteType = encodingObj.type === 'nominal' || encodingObj.type === 'ordinal';
            if (isDiscreteType) {
                if (cs?.ordinalSortOrder && cs.ordinalSortOrder.length > 0) {
                    encodingObj.sort = preserveDomainTypes(cs.ordinalSortOrder);
                } else if (fieldIsNumeric && fieldName) {
                        // Numeric data treated as nominal/ordinal: sort by numeric
                        // value so labels appear as 0,1,2,3… instead of data-encounter
                        // order.  Use "ascending" instead of an explicit value array
                        // to keep the spec compact (avoids enumerating every unique
                        // value, which can be hundreds for fields like Rank).
                        encodingObj.sort = "ascending";
                } else {
                    encodingObj.sort = null;
                }
            }
        }

        // Color scheme from Phase 0 decisions
        if (channel === "color" || channel === "group") {
            if (encoding.scheme && encoding.scheme !== "default") {
                if ('scale' in encodingObj) {
                    encodingObj.scale.scheme = encoding.scheme;
                } else {
                    encodingObj.scale = { scheme: encoding.scheme };
                }
            } else if (fieldName && cs?.colorScheme) {
                if (!('scale' in encodingObj)) {
                    encodingObj.scale = {};
                }
                encodingObj.scale.scheme = cs.colorScheme.scheme;
                if (cs.colorScheme.type === 'diverging' && cs.colorScheme.domainMid !== undefined) {
                    encodingObj.scale.domainMid = cs.colorScheme.domainMid;
                }
            }
        }

        // Apply localized display name as axis/legend title
        if (fieldDisplayNames && fieldName && fieldDisplayNames[fieldName] && !encodingObj.title) {
            encodingObj.title = fieldDisplayNames[fieldName];
        }

        // A lexical unit explicitly declared by the author belongs once with
        // the field name, independent of whether a visual theme is applied.
        const displayUnit = resolveDisplayUnit(cs?.semanticAnnotation);
        if ((channel === 'x' || channel === 'y') && cs?.type === 'quantitative'
            && displayUnit?.placement === 'field' && encodingObj.title !== null) {
            const currentTitle = typeof encodingObj.title === 'string'
                ? encodingObj.title
                : fieldName;
            if (currentTitle) encodingObj.title = titleWithDisplayUnit(currentTitle, displayUnit);
        }

        // --- Collect resolved encoding ---
        if (Object.keys(encodingObj).length !== 0) {
            resolvedEncodings[channel] = encodingObj;
        }
    }

    // --- Apply declaration overrides ---

    // Apply resolved types from declareLayoutMode
    if (declaration.resolvedTypes) {
        for (const [ch, type] of Object.entries(declaration.resolvedTypes)) {
            if (resolvedEncodings[ch]) {
                resolvedEncodings[ch].type = type;
            }
        }
    }

    // Translate group channel → VL color + xOffset/yOffset encodings
    const groupCS = channelSemantics.group;
    if (groupCS?.field && resolvedEncodings.group) {
        // Determine which axis the group subdivides (the discrete one)
        const xType = resolvedEncodings.x?.type;
        const yType = resolvedEncodings.y?.type;
        const isDiscreteT = (t: string | undefined) => t === 'nominal' || t === 'ordinal';
        const groupAxis = isDiscreteT(xType) ? 'x' : isDiscreteT(yType) ? 'y' : 'x';
        const offsetChannel = groupAxis === 'x' ? 'xOffset' : 'yOffset';

        // Map group → color encoding
        if (!resolvedEncodings.color) {
            resolvedEncodings.color = { ...resolvedEncodings.group };
        }
        delete resolvedEncodings.group;

        // Suppress the dodge offset when the group is redundant/nested with the
        // axis (group == x, or a 1:1 pair), OR when the user forces `dodge: none`.
        // Otherwise VL subdivides each band by the global group domain. `local`
        // and `global` both keep the (global) offset for now — the compact
        // `local` renderer is a follow-up; the layout budget stays consistent.
        const groupAxisField = channelSemantics[groupAxis]?.field;
        const groupPlan = groupAxisField
            ? planBandDodge(data, groupAxisField, groupCS.field)
            : undefined;
        const groupMode = groupPlan ? resolveDodge(groupPlan, chartProperties?.dodge).mode : 'global';
        const groupIsNested = !!groupAxisField
            && (groupAxisField === groupCS.field || groupMode === 'none');

        // Create offset encoding for position subdivision.
        // Coordinate sort with color so bar order matches legend order.
        if (!groupIsNested && !resolvedEncodings[offsetChannel]) {
            const offsetEnc: any = { field: groupCS.field, type: 'nominal' };
            if (resolvedEncodings.color?.sort !== undefined) {
                offsetEnc.sort = resolvedEncodings.color.sort;
            }
            resolvedEncodings[offsetChannel] = offsetEnc;
        }
    }

    // Merge template encoding defaults (bin, aggregate, etc.)
    const templateEncoding = chartTemplate.template?.encoding;
    if (templateEncoding) {
        for (const [ch, enc] of Object.entries(templateEncoding)) {
            if (enc && typeof enc === 'object' && Object.keys(enc as any).length > 0) {
                if (resolvedEncodings[ch]) {
                    resolvedEncodings[ch] = { ...(enc as any), ...resolvedEncodings[ch] };
                }
            }
        }
    }

    return resolvedEncodings;
}

// ===========================================================================
// restructureFacets — VL-specific spec transforms for faceted charts
// ===========================================================================

/**
 * Purely structural VL transform for faceted charts.
 *
 * This function does NOT decide wrapping or column counts — that is done
 * earlier by computeFacetGrid, which returns a `FacetGridResult`.  This function
 * only:
 *   1. Moves `encoding.column` → `encoding.facet` (with `columns: N`).
 *   2. For layered specs, hoists to top-level `facet` + `spec`.
 */
function restructureFacets(
    vgObj: any,
    nominalCounts: Record<string, number>,
    facetGrid?: { columns: number; rows: number },
): void {

    const isConcatSpec = () => Array.isArray(vgObj.hconcat) || Array.isArray(vgObj.vconcat) || Array.isArray(vgObj.concat);

    const hoistConcatIntoFacet = (facetDef: any, wrapColumns?: number) => {
        const childSpec: any = {};
        for (const key of ['hconcat', 'vconcat', 'concat', 'resolve', 'spacing', 'align', 'bounds', 'center'] as const) {
            if (vgObj[key] !== undefined) {
                childSpec[key] = vgObj[key];
                delete vgObj[key];
            }
        }
        if (vgObj.encoding && Object.keys(vgObj.encoding).length > 0) {
            childSpec.encoding = vgObj.encoding;
            delete vgObj.encoding;
        }

        vgObj.facet = facetDef;
        if (wrapColumns != null) {
            vgObj.columns = wrapColumns;
        }
        vgObj.spec = childSpec;
        vgObj.resolve = {
            ...(vgObj.resolve || {}),
            scale: { ...(vgObj.resolve?.scale || {}), y: 'independent' },
        };
    };

    if (vgObj.encoding?.column != undefined && vgObj.encoding?.row == undefined) {
        vgObj.encoding.facet = vgObj.encoding.column;

        // Use the grid decided by computeFacetGrid.
        const numCols = facetGrid?.columns ?? (nominalCounts.column || 1);
        const numRows = facetGrid?.rows ?? 1;

        vgObj.encoding.facet.columns = numCols;

        // Axis title suppression for faceted charts is handled by
        // vlApplyLayoutToSpec, which uses actual subplot dimensions
        // to decide whether titles should be hidden (size-based threshold).

        delete vgObj.encoding.column;

        // Faceting a concat spec must use top-level `facet` + child
        // `spec`. Inline `encoding.facet` is ignored/invalid for
        // hconcat/vconcat, which is the structure used by Bar Table.
        if (isConcatSpec()) {
            const facetDef = { ...vgObj.encoding.facet };
            delete facetDef.columns;
            delete vgObj.encoding.facet;
            if (Object.keys(vgObj.encoding).length === 0) {
                delete vgObj.encoding;
            }
            hoistConcatIntoFacet(facetDef, numCols);
            return;
        }

        // For layered specs, VL doesn't support encoding.facet inline —
        // restructure to top-level facet + spec.
        // IMPORTANT: In top-level facet mode, `columns` must be a sibling
        // of `facet`, not nested inside it. (VL ignores columns inside
        // the facet object when it's a top-level property.)
        if (vgObj.layer && Array.isArray(vgObj.layer)) {
            const facetDef = { ...vgObj.encoding.facet };
            const wrapColumns = facetDef.columns;
            delete facetDef.columns; // remove from facet object
            delete vgObj.encoding.facet;

            vgObj.facet = facetDef;
            if (wrapColumns != null) {
                vgObj.columns = wrapColumns; // top-level sibling
            }
            vgObj.spec = {
                layer: vgObj.layer,
                encoding: vgObj.encoding,
            };
            delete vgObj.layer;
            delete vgObj.encoding;
        }

        return;
    }

    // For concat specs with row-only or column+row facets
    if (isConcatSpec() && (vgObj.encoding?.column || vgObj.encoding?.row)) {
        const facetDef: any = {};
        if (vgObj.encoding.column) {
            facetDef.column = vgObj.encoding.column;
            delete vgObj.encoding.column;
        }
        if (vgObj.encoding.row) {
            facetDef.row = vgObj.encoding.row;
            delete vgObj.encoding.row;
        }
        if (Object.keys(vgObj.encoding).length === 0) {
            delete vgObj.encoding;
        }
        hoistConcatIntoFacet(facetDef);
        return;
    }

    // For layered specs with row-only or column+row facets
    if (vgObj.layer && Array.isArray(vgObj.layer) &&
        (vgObj.encoding?.column || vgObj.encoding?.row)) {
        const facetDef: any = {};
        if (vgObj.encoding.column) {
            facetDef.column = vgObj.encoding.column;
            delete vgObj.encoding.column;
        }
        if (vgObj.encoding.row) {
            facetDef.row = vgObj.encoding.row;
            delete vgObj.encoding.row;
        }
        vgObj.facet = facetDef;
        vgObj.spec = {
            layer: vgObj.layer,
            encoding: vgObj.encoding,
        };
        delete vgObj.layer;
        delete vgObj.encoding;
    }
}
