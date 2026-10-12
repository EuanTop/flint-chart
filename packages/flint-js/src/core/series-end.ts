import type { CategoryOrder } from './channel-decisions';
import type { ChartStructure } from './structure';
import type { DesignDecisions, LegendPlacement } from './theme/types';
import type { ChannelSemantics } from './types';

/** Where each series-end name stands once neighbours are dodged apart. */
export interface SeriesEndLayout {
    adjustedValues: Map<unknown, number>;
    maxDisplacement: number;
}

/** Where the chart names its series: the theme's placement, or the next it ranked where that cannot stand. */
export interface LegendPlacementPlan {
    placement: LegendPlacement;
    orient: DesignDecisions['legend']['orient'];
    direction: DesignDecisions['legend']['direction'];
    /** Why the theme's series-end naming gave way, where it did. */
    demoted?: string;
    /** The dodged positions of series-end names, where they needed dodging. */
    seriesEnd?: SeriesEndLayout;
    /** The chart prints a name at the end of each run itself, so none is drawn for it. */
    ownNames?: boolean;
}

/** The value scale the runs are read against, as the plan draws it. */
export interface RunValueScale {
    min?: number;
    max?: number;
    zero: boolean;
    reverse: boolean;
    linear: boolean;
}

export interface SeriesEndInputs {
    design: DesignDecisions;
    structure: ChartStructure;
    channelSemantics: Record<string, ChannelSemantics>;
    orders: Partial<Record<string, CategoryOrder>>;
    value: RunValueScale;
    rows: any[];
}

const ENDABLE_MARKS = new Set(['line', 'trail', 'area']);

/** The channel a series runs along: across a measure on y, up a measure on x, else across. */
function runChannel(d: DesignDecisions): 'x' | 'y' {
    if (d.bound.measureChannels.includes('y')) return 'x';
    if (d.bound.measureChannels.includes('x')) return 'y';
    return 'x';
}

/**
 * Whether names at the series' ends can stand apart and how far each moves (categories stand in
 * the order the plan gives them, encounter order included): only on horizontal
 * runs of up to eight series, unfaceted, on a linear value scale. Names that collide are packed a
 * line apart from their endpoints; they give way where their endpoints spread wider than a quarter
 * of the median step (at least 8 px), where they do not fit the plot's height, or where one moves
 * more than a line.
 */
function seriesEndLayout(inputs: SeriesEndInputs, seriesField: string): { layout?: SeriesEndLayout; reason?: string } {
    const { design: d, structure, orders, value, rows } = inputs;
    if (runChannel(d) !== 'x') return {};
    if (d.bound.isFaceted) return { reason: '`seriesEnd` collision checks do not guess across facet scales' };
    if (d.bound.seriesCount > 8) return { reason: '`seriesEnd` is limited to eight series so the margin stays readable' };

    const domainField = structure.x?.derived ? undefined : structure.x?.fields[0];
    const valueField = structure.y?.derived ? undefined : structure.y?.fields[0];
    if (!domainField || !valueField || structure.y?.type !== 'quantitative') return {};
    if (!value.linear) return { reason: '`seriesEnd` collision checks need a linear value scale' };

    const domainType = structure.x?.type;
    const order = orders.x;
    const orderedDomain = domainType === 'quantitative' || domainType === 'temporal' || domainType === 'ordinal';
    const listed = order?.by === 'values' ? order.values
        : order?.by === 'data' ? [...new Set(rows.map((row) => row?.[domainField]))] : undefined;
    const explicitOrder = listed ? new Map(listed.map((entry, index): [unknown, number] => [entry, index])) : undefined;
    const descending = order?.by === 'value' && order.descending;
    const comparable = (raw: unknown): number | undefined => {
        if (explicitOrder) return explicitOrder.get(raw);
        if (domainType === 'temporal') {
            const time = raw instanceof Date ? raw.getTime() : Date.parse(String(raw));
            return Number.isFinite(time) ? time : undefined;
        }
        const number = Number(raw);
        return Number.isFinite(number) ? number : undefined;
    };

    const endpoints = new Map<unknown, { domain: number; value: number; order: number }>();
    const allDomain: number[] = [];
    const allValues: number[] = [];
    rows.forEach((row, index) => {
        const series = row?.[seriesField];
        const domainValue = comparable(row?.[domainField]);
        const valueNumber = Number(row?.[valueField]);
        if (series == null || domainValue == null || !Number.isFinite(valueNumber)) return;
        allDomain.push(domainValue);
        allValues.push(valueNumber);
        const previous = endpoints.get(series);
        const takesEnd = !previous || (orderedDomain
            ? (descending ? domainValue < previous.domain : domainValue > previous.domain)
            : index > previous.order);
        if (takesEnd) endpoints.set(series, { domain: domainValue, value: valueNumber, order: index });
    });
    if (endpoints.size < 2 || allDomain.length < 2 || allValues.length < 2) return {};

    const plotWidth = Number(d.layout.plotWidth);
    const plotHeight = Number(d.layout.plotHeight);
    if (!(plotWidth > 0) || !(plotHeight > 0)) return { reason: '`seriesEnd` could not measure the plot for collision checks' };

    const domainMin = Math.min(...allDomain);
    const domainSpan = Math.max(...allDomain) - domainMin;
    if (!(domainSpan > 0)) return {};
    const endDomain = Array.from(endpoints.values(), (endpoint) => endpoint.domain);
    const endSpreadPx = (Math.max(...endDomain) - Math.min(...endDomain)) / domainSpan * plotWidth;
    const uniqueDomain = [...new Set(allDomain)].sort((a, b) => a - b);
    const steps = uniqueDomain.slice(1).map((entry, index) => entry - uniqueDomain[index]).filter((step) => step > 0);
    const medianStep = steps.length ? steps.sort((a, b) => a - b)[Math.floor(steps.length / 2)] / domainSpan * plotWidth : 0;
    const alignmentTolerance = Math.max(8, medianStep * 0.25);

    let valueMin = value.min ?? Math.min(...allValues);
    let valueMax = value.max ?? Math.max(...allValues);
    if (value.zero) {
        valueMin = Math.min(0, valueMin);
        valueMax = Math.max(0, valueMax);
    }
    const valueSpan = valueMax - valueMin;
    if (!(valueSpan > 0)) return {};

    const toPixel = (number: number) => value.reverse
        ? (number - valueMin) / valueSpan * plotHeight
        : (valueMax - number) / valueSpan * plotHeight;
    const fromPixel = (pixel: number) => value.reverse
        ? valueMin + pixel / plotHeight * valueSpan
        : valueMax - pixel / plotHeight * valueSpan;
    const fontSize = Math.max(9, (d.legend.label.fontSize ?? 11) - 1);
    const separation = fontSize + 2;
    const naturalRows = Array.from(endpoints.values(), (endpoint) => toPixel(endpoint.value)).sort((a, b) => a - b);
    const naturallyCollides = naturalRows.some((pixel, index) => index > 0 && pixel - naturalRows[index - 1] < separation);
    if (!naturallyCollides) return {};
    if (endSpreadPx > alignmentTolerance) {
        return { reason: `series-end labels overlap and their endpoints span ${Math.round(endSpreadPx)}px horizontally, so they cannot be dodged as one column` };
    }
    if (endpoints.size * separation > plotHeight) return { reason: '`seriesEnd` labels cannot fit vertically without overlap' };

    const packed = Array.from(endpoints, ([series, endpoint]) => ({
        series, desired: toPixel(endpoint.value), placed: toPixel(endpoint.value),
    })).sort((a, b) => a.desired - b.desired);
    // A boundary label may straddle the plot edge; it stays pinned and only its neighbours pack.
    packed[0].placed = Math.max(0, packed[0].desired);
    for (let index = 1; index < packed.length; index += 1) {
        packed[index].placed = Math.max(packed[index].desired, packed[index - 1].placed + separation);
    }
    const overflow = packed[packed.length - 1].placed - plotHeight;
    if (overflow > 0) packed.forEach((entry) => { entry.placed -= overflow; });
    for (let index = packed.length - 2; index >= 0; index -= 1) {
        packed[index].placed = Math.min(packed[index].placed, packed[index + 1].placed - separation);
    }
    if (packed[0].placed < 0) {
        const shift = -packed[0].placed;
        packed.forEach((entry) => { entry.placed += shift; });
    }
    const maxDisplacement = Math.max(...packed.map((entry) => Math.abs(entry.placed - entry.desired)));
    if (maxDisplacement > fontSize) {
        return { reason: `series-end labels need ${Math.round(maxDisplacement)}px of dodge, more than one line of text` };
    }
    return { layout: { adjustedValues: new Map(packed.map((entry) => [entry.series, fromPixel(entry.placed)])), maxDisplacement } };
}

/**
 * Where the chart names its series. Series-end naming needs a run with an end (a line or a band),
 * a series that is not the category axis, an open run, and, for bands, a margin the value axis
 * leaves free. A chart that prints its own names as text keeps them; otherwise names that would
 * collide follow the dodge rules above. Where it cannot stand, the key takes the next placement
 * the theme ranked, else the right.
 */
export function planLegendPlacement(inputs: SeriesEndInputs): LegendPlacementPlan {
    const { design: d, structure, channelSemantics } = inputs;
    const own: LegendPlacementPlan = { placement: d.legend.placement, orient: d.legend.orient, direction: d.legend.direction };
    if (d.legend.placement !== 'seriesEnd' && d.legend.placement !== 'inline') return own;
    if (!d.legend.show) return own;
    const runs = structure.marks.filter((mark) => ENDABLE_MARKS.has(mark));
    const field = structure.series?.field ?? d.bound.seriesField ?? channelSemantics.detail?.field;
    const bands = runs.includes('area');
    const runsAlongX = runChannel(d) === 'x';
    const marginTaken = bands && (runsAlongX ? d.axes.y?.orient === 'right' : d.axes.x?.orient === 'top');
    const closedRun = runs.length > 0 && !structure.x && !structure.y;
    const reason = runs.length === 0
        ? '`seriesEnd` needs a line mark'
        : !field ? '`seriesEnd` needs a series field to name'
            : field === d.bound.categoryField ? '`seriesEnd` would restate the categorical axis'
                : closedRun ? '`seriesEnd` needs an open run — a closed polygon has no last point'
                    : marginTaken
                        ? `the ${runsAlongX ? 'right' : 'top'} margin holds the value axis, so a name too big for its band has nowhere to stand`
                        : undefined;
    if (!reason && structure.marks.includes('text')) return { ...own, ownNames: true };
    const collision = !reason && !bands ? seriesEndLayout(inputs, field!) : undefined;
    const demoted = reason ?? collision?.reason;
    if (!demoted) return { ...own, ...(collision?.layout ? { seriesEnd: collision.layout } : {}) };
    const next = d.legend.fallbacks?.find((p) => p !== 'seriesEnd' && p !== 'inline') ?? 'right';
    return {
        placement: next,
        orient: (next === 'inside' ? 'top-right' : next) as LegendPlacementPlan['orient'],
        direction: next === 'top' || next === 'bottom' ? 'horizontal' : 'vertical',
        demoted: `${demoted} — the key is drawn \`${next}\` instead`,
    };
}
