import { groupDodge } from './band-dodge';
import { resolveDisplayUnit, titleWithDisplayUnit } from './field-semantics';
import type { ChannelSemantics, ChartEncoding } from './types';
import type { CategoryOrder } from './channel-decisions';

/** Values an axis computes from its fields rather than reads from them: a measure, or the weeks and weekdays of a date. */
export type DerivedMeasure = 'count' | 'density' | 'cumulative-share' | 'running-total' | 'fit' | 'week' | 'weekday' | 'ridge' | 'skewed';

/** What one positional axis shows. */
export interface AxisDescription {
    /** How the axis reads its values: quantitative, temporal, ordinal or nominal. */
    type?: string;
    /** The data fields the axis reads, the main one first. */
    fields: string[];
    /** The fields are the two ends of one span per mark, as a range from low to high. */
    range?: boolean;
    /** A measure computed from the fields. */
    derived?: DerivedMeasure;
    /** The names a band computed from the fields shows, in order, where the template sets them. */
    categories?: string[];
    /** Whether a measure is read from zero, or fitted to the data; unset leaves Flint's zero decision. */
    baseline?: 'zero' | 'data';
    /** The values a measure the template computes spans, where the template can say. */
    extent?: [number, number];
    /** The template sets the axis's domain or tick values itself. */
    ownScale?: boolean;
    /** The axis also carries a curve the backend fits, which may run past the data. */
    fitted?: boolean;
    /** Whether the scale rounds its ends outward; false keeps the data's span. Unset leaves it to Flint's rules. */
    rounded?: boolean;
    /** The template runs the axis backwards, as a rank runs from first place down. */
    reversed?: boolean;
    /**
     * The order the template stands the axis's categories in: always where `fixed`, else unless the
     * author or the field's semantics give one.
     */
    order?: { order: CategoryOrder; fixed: boolean };
}

/** Templates whose quantitative x keeps the data's span: a run or a cloud reads along x, and rounding adds empty run. */
export const TIGHT_X_MARKS = new Set(['line', 'area', 'trail', 'point']);

/** How a chart's marks stack along its measure, as the template intends. */
export type Stacking = 'none' | 'stacked' | 'normalized' | 'centered';

/**
 * What a chart draws, described by meaning: its kinds of mark, what each positional axis shows,
 * the series colour tells apart, and how marks stack. Backend-neutral: no internal columns, layers
 * or encodings.
 */
/** The channels a key can explain. */
export const KEY_CHANNELS = ['color', 'fill', 'stroke', 'shape', 'size', 'opacity', 'strokeDash', 'strokeWidth'] as const;
export type KeyChannel = typeof KEY_CHANNELS[number];

/** A key the chart draws to explain a channel. */
export interface KeyDescription {
    channel: KeyChannel;
    /** The data field the key names; absent where the chart derives what it names. */
    field?: string;
    /** What a derived key names, by name. */
    derived?: string;
    type?: string;
    /** The entries a derived key lists, in order. */
    entries?: string[];
    /** The working column the template draws the key through, where it does. */
    via?: string;
    /** The key's title as the template sets it; null leaves it untitled. */
    title?: string | null;
}

export interface ChartStructure {
    /** The kinds of mark drawn. */
    marks: string[];
    /** The keys the chart draws; unset derives one per explained channel bound to a field. */
    keys?: KeyDescription[];
    x?: AxisDescription;
    y?: AxisDescription;
    /** What a slice's angle measures, on a radial chart. */
    angle?: AxisDescription;
    /** What a slice's distance from the centre measures, on a radial chart. */
    radius?: AxisDescription;
    /**
     * The series colour tells apart: a data field, or a series the chart derives itself, by name.
     * `oneInk`: the chart names each series where it is drawn (a ridge's label beside it), so
     * colour has nothing left to tell apart and every series takes the house's single ink.
     */
    series?: { field?: string; derived?: string; type?: string; oneInk?: boolean };
    stacking: Stacking;
    /** A title the chart writes for itself when the author gives none. */
    title?: string;
    /** Axis titles the template sets itself; null leaves the axis untitled. */
    axisTitles?: Partial<Record<'x' | 'y', string | null>>;
}

/** What a template reads to describe its structure: the data and the channel semantics, and the steps only where a mark depends on them. */
export interface StructureContext {
    channelSemantics: Record<string, ChannelSemantics>;
    /** Channel types the template's layout declaration resolved, where they differ from the semantics. */
    resolvedTypes?: Record<string, string>;
    /** The rows the chart draws. */
    table: any[];
    /** The rows as the author gave them, before any shaping. */
    data: any[];
    /** The rows before overflow truncation dropped any. */
    fullTable: any[];
    /** The encodings the chart was given, after the analysis shaped them. */
    encodings: Record<string, ChartEncoding>;
    /** The names the chart prints for fields. */
    displayNames?: Record<string, string>;
    /** How the backend spells a data field in its spec. */
    spellField: (name: string) => string;
    chartProperties?: Record<string, any>;
    /** The mark the template draws as its main one. */
    templateMarkType?: string;
    /** The channels the template draws. */
    channels?: string[];
    /**
     * The band steps the plan settled. Only for a template that draws a mark when its text fits the
     * band, a size dependence the plan should own as a label decision.
     */
    steps: { x: number; y: number };
}

const STACKING_MARKS = new Set(['bar', 'area']);

function markTypeOf(mark: unknown): string | undefined {
    if (typeof mark === 'string') return mark;
    if (mark && typeof mark === 'object') return (mark as { type?: string }).type;
    return undefined;
}

function walk(node: any, visit: (node: any) => void): void {
    if (!node || typeof node !== 'object') return;
    visit(node);
    for (const key of ['layer', 'vconcat', 'hconcat', 'concat']) {
        if (Array.isArray(node[key])) node[key].forEach((child: any) => walk(child, visit));
    }
    if (node.spec) walk(node.spec, visit);
}

/** The stacking a stated `stack` asks for; undefined when none is stated. */
export function statedStacking(stack: unknown): Stacking | undefined {
    if (stack === undefined) return undefined;
    if (stack === null || stack === false) return 'none';
    if (stack === 'normalize') return 'normalized';
    if (stack === 'center') return 'centered';
    return 'stacked';
}

/**
 * What a template's skeleton draws once the channel semantics fill it in: the skeleton's marks;
 * each positional axis's semantic field (and its range end) and resolved type, or a count where
 * the skeleton counts rows; the colour series (a group is one too); and bars or areas stacked
 * along their measure, as marks sharing a band stack, unless they are dodged, drawn as ranges, or
 * the skeleton turns stacking off.
 */
/** The structure with one axis read from zero or fitted to the data. */
export function withBaseline(structure: ChartStructure, channel: 'x' | 'y', baseline: 'zero' | 'data'): ChartStructure {
    const axis = structure[channel];
    return axis ? { ...structure, [channel]: { ...axis, baseline } } : structure;
}

export function skeletonStructure(skeleton: any, context: StructureContext): ChartStructure {
    const { channelSemantics, resolvedTypes } = context;
    const marks = new Set<string>();
    walk(skeleton, (node) => {
        const mark = markTypeOf(node.mark);
        if (mark) marks.add(mark);
    });
    const axes: Partial<Record<'x' | 'y', AxisDescription>> = {};
    for (const channel of ['x', 'y'] as const) {
        const semantics = channelSemantics[channel];
        const stated = skeleton?.encoding?.[channel];
        if (semantics?.field) {
            const type = resolvedTypes?.[channel] ?? semantics.type;
            const end = channelSemantics[`${channel}2`]?.field;
            axes[channel] = { ...(type ? { type } : {}), fields: end ? [semantics.field, end] : [semantics.field], ...(end ? { range: true } : {}) };
        } else if (stated?.aggregate === 'count') {
            axes[channel] = { type: 'quantitative', fields: [], derived: 'count' };
        }
    }
    const series = channelSemantics.color?.field ? channelSemantics.color : channelSemantics.group;
    const top = skeleton?.encoding ?? {};
    const stated = statedStacking(top.y?.stack ?? top.x?.stack);
    const group = channelSemantics.group?.field;
    const dodged = Boolean(top.xOffset || top.yOffset) || (group !== undefined && groupDodge(
        { x: axes.x?.type, y: axes.y?.type },
        { x: channelSemantics.x?.field, y: channelSemantics.y?.field },
        group, context.data, context.chartProperties?.dodge,
    ).dodges);
    const measure = axes.y?.type === 'quantitative' ? 'y' : 'x';
    const ranged = axes[measure]?.range === true;
    const stacks = [...marks].some((mark) => STACKING_MARKS.has(mark)) && axes[measure]?.type === 'quantitative' && !dodged && !ranged;
    return {
        marks: [...marks],
        ...(axes.x ? { x: axes.x } : {}),
        ...(axes.y ? { y: axes.y } : {}),
        ...(series?.field ? { series: { field: series.field, type: series.type } } : {}),
        stacking: stated ?? (stacks ? 'stacked' : 'none'),
    };
}

/** The structure a template draws: its own description where it builds something its skeleton does not show. */
/**
 * The keys a chart draws by default: one for what colour tells apart, where colour is drawn, and one
 * for each other explained channel the template draws that a field is bound to.
 */
function defaultKeys(structure: ChartStructure, context: StructureContext): KeyDescription[] {
    const drawn = new Set(context.channels ?? []);
    const out: KeyDescription[] = [];
    const series = structure.series;
    if (series && (drawn.has('color') || drawn.has('group'))) {
        out.push({ channel: 'color', ...(series.field ? { field: series.field } : { derived: series.derived }), ...(series.type ? { type: series.type } : {}) });
    }
    for (const channel of KEY_CHANNELS) {
        const cs = context.channelSemantics[channel];
        if (channel === 'color' || !drawn.has(channel) || !cs?.field) continue;
        out.push({ channel, field: cs.field, ...(cs.type ? { type: cs.type } : {}) });
    }
    return out;
}

export function chartStructure(
    template: { template: any; structure?: (context: StructureContext) => ChartStructure },
    context: StructureContext,
): ChartStructure {
    const stated = template.structure?.(context) ?? skeletonStructure(template.template, context);
    const structure = stated.keys ? stated : { ...stated, keys: defaultKeys(stated, context) };
    const x = structure.x;
    if (x?.type === 'quantitative' && x.rounded === undefined && TIGHT_X_MARKS.has(context.templateMarkType ?? '')) {
        return { ...structure, x: { ...x, rounded: false } };
    }
    return structure;
}

/**
 * Where a chart's description disagrees with what its template built, one line per fact; empty when
 * they agree. The build is read for meaning: its kinds of mark, the data fields each axis encodes
 * or a transform reads, and whether segments really stack.
 */
export function structureDifferences(described: ChartStructure, built: BuiltFacts): string[] {
    const encoded = (channel: 'x' | 'y' | 'angle' | 'radius', field: string) => built.fields[channel].has(field) || built.transformed.has(field);
    const out: string[] = [];
    const marks = (list: string[]) => [...new Set(list)].sort().join(',');
    if (marks(described.marks) !== marks(built.marks)) out.push(`marks: ${marks(described.marks)} ≠ ${marks(built.marks)}`);
    // One key per field, as the backend merges keys over one field; a working column stands for a derived key.
    const keyName = (field: string | undefined) => (!field || field.startsWith('__') ? '(derived)' : field);
    const describedKeys = [...new Set((described.keys ?? []).map((key) => keyName(key.via ?? key.field)))].sort().join(',');
    const builtKeys = [...new Set(built.keys.map((key) => keyName(key.field)))].sort().join(',');
    if (describedKeys !== builtKeys) out.push(`keys: ${describedKeys} ≠ ${builtKeys}`);
    for (const channel of ['angle', 'radius'] as const) {
        if (built.fields[channel].size && !described[channel]) out.push(`${channel}: undescribed (${[...built.fields[channel]].join(', ')})`);
    }
    for (const channel of ['x', 'y', 'angle', 'radius'] as const) {
        const axis = described[channel];
        if (!axis || axis.derived) continue;
        const missing = axis.fields.filter((field) => !encoded(channel, field));
        if (missing.length) out.push(`${channel} fields: ${missing.join(', ')} not encoded (${[...built.fields[channel]].join(', ')})`);
    }
    // A backend may stack marks no two of which share a band; drawn, that is no stacking at all.
    const unseen = described.stacking === 'none' && !built.segmented;
    if (described.stacking !== built.stacking && !unseen) out.push(`stacking: ${described.stacking} ≠ ${built.stacking}`);
    for (const channel of ['x', 'y'] as const) {
        // A template that states no rounding leaves the backend's own, which rounds.
        const statedRounding = described[channel]?.rounded;
        const builtRounding = built.rounded[channel];
        if (described[channel] && statedRounding !== builtRounding && !(statedRounding === true && builtRounding === undefined)) {
            out.push(`${channel} rounded: ${described[channel]!.rounded ?? 'unset'} ≠ ${built.rounded[channel] ?? 'unset'}`);
        }
        const backwards = Boolean(described[channel]?.reversed);
        if (described[channel] && backwards !== built.reversed.has(channel)) out.push(`${channel} reversed: ${backwards} ≠ ${built.reversed.has(channel)}`);
        const fits = Boolean(described[channel]?.fitted);
        if (described[channel] && fits !== built.fitted.has(channel)) out.push(`${channel} fitted: ${fits} ≠ ${built.fitted.has(channel)}`);
        const owns = Boolean(described[channel]?.ownScale);
        if (described[channel] && owns !== built.ownScales.has(channel)) out.push(`${channel} own scale: ${owns} ≠ ${built.ownScales.has(channel)}`);
        const said = described[channel]?.baseline;
        if (said !== built.baselines[channel]) out.push(`${channel} baseline: ${said ?? 'unset'} ≠ ${built.baselines[channel] ?? 'unset'}`);
    }
    return out;
}

/**
 * Whether some band holds more than one row, so marks that stack there show as segments. A band is
 * one value of the band field within one facet panel.
 */
export function bandsHoldSeveral(rows: readonly any[], bandFields: Array<string | undefined>): boolean {
    const fields = bandFields.filter((field): field is string => Boolean(field));
    const seen = new Set<string>();
    for (const row of rows) {
        const key = JSON.stringify(fields.map((field) => row?.[field]));
        if (seen.has(key)) return true;
        seen.add(key);
    }
    return false;
}

/** What a built chart draws, read for meaning by the backend. */
export interface BuiltFacts {
    marks: string[];
    /** The data fields each positional axis, angle and radius encodes, across its views and range ends. */
    fields: Record<'x' | 'y' | 'angle' | 'radius', Set<string>>;
    /** The data fields its transforms read, for axes that show what a transform computes. */
    transformed: Set<string>;
    stacking: Stacking;
    /** Whether some band holds more than one stacked segment in these rows. */
    segmented: boolean;
    /** Whether the template reads each measure axis from zero or fits it to the data, where it says. */
    baselines: Partial<Record<'x' | 'y', 'zero' | 'data'>>;
    /** The axes whose domain or tick values the template writes. */
    ownScales: Set<'x' | 'y'>;
    /** The axes carrying a curve the backend fits. */
    fitted: Set<'x' | 'y'>;
    /** The keys the template stage draws, by channel. */
    keys: Array<{ channel: string; field: string; title?: string | null }>;
    /** Whether the template stage rounds each axis's ends, where it says. */
    rounded: Partial<Record<'x' | 'y', boolean>>;
    /** The axes the template stage runs backwards. */
    reversed: Set<'x' | 'y'>;
}

/** Whether a positional channel is drawn as discrete bands of names. */
export function discreteChannel(context: StructureContext, channel: 'x' | 'y'): boolean {
    const type = context.resolvedTypes?.[channel] ?? context.channelSemantics[channel]?.type;
    return type === 'nominal' || type === 'ordinal';
}

/** The names the chart prints for fields: the author's, plus Series and Value for the columns a static-series fold creates. */
export function chartDisplayNames(
    authored: Record<string, string> | undefined,
    staticSeries: { keyColumn: string; valueColumn: string } | undefined,
): Record<string, string> | undefined {
    if (!staticSeries) return authored;
    return {
        ...authored,
        [staticSeries.keyColumn]: authored?.[staticSeries.keyColumn] || 'Series',
        [staticSeries.valueColumn]: authored?.[staticSeries.valueColumn] || 'Value',
    };
}

/**
 * The title an encoding carries and the field it draws: a count is titled Count; a field the
 * backend has to spell differently keeps its own name as the title; else the display name; and a
 * positional measure whose unit belongs with its name gets the unit once.
 */
/** How an aggregated channel's title names its operation: "Sum of revenue". */
const AGGREGATE_LABEL: Record<string, string> = {
    sum: 'Sum', average: 'Average', mean: 'Mean', median: 'Median', min: 'Min', max: 'Max',
};

export function encodingTitle(
    channel: string,
    encoding: Pick<ChartEncoding, 'field' | 'aggregate' | 'title'>,
    semantics: ChannelSemantics | undefined,
    displayNames: Record<string, string> | undefined,
    spellField: (name: string) => string,
): { title?: string | null; field?: string } {
    const name = encoding.field;
    let title: string | undefined;
    let field: string | undefined;
    if (!name && encoding.aggregate === 'count') {
        field = '_count';
        title = 'Count';
    }
    if (name) {
        field = spellField(name);
        if (field !== name) title = name;
        if (encoding.aggregate === 'count') {
            field = '_count';
            title = 'Count';
        } else if (encoding.aggregate) {
            field = spellField(`${name}_${encoding.aggregate}`);
            title = `${AGGREGATE_LABEL[encoding.aggregate] ?? encoding.aggregate} of ${displayNames?.[name] ?? name}`;
        }
    }
    if (name && displayNames?.[name] && !title) title = displayNames[name];
    // The author's own name for the channel, or none, stands as written.
    if (encoding.title !== undefined) return { title: encoding.title, ...(field !== undefined ? { field } : {}) };
    const unit = resolveDisplayUnit(semantics?.semanticAnnotation);
    if ((channel === 'x' || channel === 'y') && semantics?.type === 'quantitative' && unit?.placement === 'field') {
        const current = title ?? name;
        if (current) title = titleWithDisplayUnit(current, unit);
    }
    return { ...(title !== undefined ? { title } : {}), ...(field !== undefined ? { field } : {}) };
}

/** The text an axis prints as its title: the encoding's title (none where it is `null`), else its field unless the field is internal. */
export function titleText(title: string | null | undefined, field: string | undefined): string | null | undefined {
    if (title !== undefined) return title;
    return field && !field.startsWith('__') ? field : undefined;
}

/** A channel's encoding title and field as the encoding builder writes them; empty when the chart has no such encoding. */
export function channelEncoding(context: StructureContext, channel: string): { title?: string | null; field?: string } {
    const given = context.encodings[channel];
    if (!given || Array.isArray(given)) return {};
    return encodingTitle(channel, given, context.channelSemantics[channel], context.displayNames, context.spellField);
}

/**
 * The title each axis prints: the template's own where it sets one, else the title its encoding
 * carries (Count, a display name, a unit) or its field.
 */
export function axisTitles(structure: ChartStructure, context: Pick<StructureContext, 'encodings' | 'channelSemantics' | 'displayNames' | 'spellField'>): Record<'x' | 'y', string | null | undefined> {
    const out: Record<'x' | 'y', string | null | undefined> = { x: undefined, y: undefined };
    for (const channel of ['x', 'y'] as const) {
        const stated = structure.axisTitles?.[channel];
        if (stated !== undefined) {
            out[channel] = stated;
            continue;
        }
        const given = context.encodings[channel];
        if (!given || Array.isArray(given)) continue;
        if (!given.field || !structure[channel]?.fields.includes(given.field)) continue;
        const { title, field } = encodingTitle(channel, given, context.channelSemantics[channel], context.displayNames, context.spellField);
        out[channel] = titleText(title, field);
    }
    return out;
}

/** The axis a chart stacks along: y when it is quantitative, else x. */
export function stackedAxis(structure: ChartStructure): 'x' | 'y' {
    return structure.y?.type === 'quantitative' ? 'y' : 'x';
}

/**
 * Whether some band of a stacked chart holds several segments in these rows: more than one row in
 * a category within one facet panel. A band the chart computes is taken to.
 */
export function segmentedBands(structure: ChartStructure, rows: readonly any[], facets: Array<string | undefined>): boolean {
    if (structure.stacking === 'none') return false;
    const band = structure[stackedAxis(structure) === 'y' ? 'x' : 'y'];
    if (band?.derived) return true;
    return bandsHoldSeveral(rows, [band?.fields[0], ...facets]);
}
