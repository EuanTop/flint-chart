/**
 * Colours bound to category values. The chart says which value takes which colour (the field
 * annotation `colors`, beside `sortOrder`): a fact about the data its author knows. The theme says
 * only how a house paints *roles* (a remainder such as “Other”, a total, missing data), matched on
 * the value. A value takes the chart's colour, else its role's ink, else the palette in order — and no
 * other value in the chart wears a bound colour.
 */
import type { ChannelSemantics } from './types.js';

/** The roles a theme can colour, and the values that name them (trimmed, case-insensitive). */
export const VALUE_ROLES = {
    other: ['other', 'others', 'all other', 'all others', 'rest of world', 'rest of the world', 'remainder'],
    total: ['total', 'grand total'],
    missing: ['missing', 'unknown', 'no data', 'n/a', 'not available', 'not classified', 'unclassified'],
} as const;
export type ValueRole = keyof typeof VALUE_ROLES;

/** How values are compared: trimmed and lower-cased. */
export const valueKey = (value: unknown): string => String(value).trim().toLowerCase();

export function roleOf(value: unknown): ValueRole | undefined {
    const key = valueKey(value);
    for (const role of Object.keys(VALUE_ROLES) as ValueRole[]) {
        if ((VALUE_ROLES[role] as readonly string[]).includes(key)) return role;
    }
    return undefined;
}

/** The colours a chart binds to the values of a field, keyed by {@link valueKey}. */
export function chartValueColors(cs: Pick<ChannelSemantics, 'semanticAnnotation'> | undefined): Record<string, string> | undefined {
    const colors = (cs?.semanticAnnotation as { colors?: Record<string, string> } | undefined)?.colors;
    if (!colors || typeof colors !== 'object') return undefined;
    const entries = Object.entries(colors).filter(([, ink]) => typeof ink === 'string' && ink);
    return entries.length ? Object.fromEntries(entries.map(([value, ink]) => [valueKey(value), ink])) : undefined;
}

/**
 * The bound colour of every value of `field` present in `rows`: the chart's own, else its role's ink.
 * Unset when no value present is bound.
 */
export function boundValueInks(
    rows: readonly any[] | undefined,
    field: string | undefined,
    chart: Record<string, string> | undefined,
    roles: Partial<Record<ValueRole, string>> | undefined,
): Record<string, string> | undefined {
    if (!field || (!chart && !roles)) return undefined;
    const out: Record<string, string> = {};
    for (const row of rows ?? []) {
        const value = row?.[field];
        if (value == null) continue;
        const key = valueKey(value);
        if (key in out) continue;
        const role = roleOf(value);
        const ink = chart?.[key] ?? (role ? roles?.[role] : undefined);
        if (ink) out[key] = ink;
    }
    return Object.keys(out).length ? out : undefined;
}

/** Vega's categorical schemes, for charts without a theme that bind some values and leave the rest to the scheme. */
export const CATEGORICAL_SCHEMES: Record<string, string[]> = {
    category10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
    category20: ['#1f77b4', '#aec7e8', '#ff7f0e', '#ffbb78', '#2ca02c', '#98df8a', '#d62728', '#ff9896', '#9467bd', '#c5b0d5', '#8c564b', '#c49c94', '#e377c2', '#f7b6d2', '#7f7f7f', '#c7c7c7', '#bcbd22', '#dbdb8d', '#17becf', '#9edae5'],
    tableau10: ['#4c78a8', '#f58518', '#e45756', '#72b7b2', '#54a24b', '#eeca3b', '#b279a2', '#ff9da6', '#9d755d', '#bab0ac'],
    tableau20: ['#4c78a8', '#9ecae9', '#f58518', '#ffbf79', '#54a24b', '#88d27a', '#b79a20', '#f2cf5b', '#439894', '#83bcb6', '#e45756', '#ff9d98', '#79706e', '#bab0ac', '#d67195', '#fcbfd2', '#b279a2', '#d6a5c9', '#9e765f', '#d8b5a5'],
    set1: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'],
    set2: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
    set3: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'],
    pastel1: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec', '#f2f2f2'],
    pastel2: ['#b3e2cd', '#fdcdac', '#cbd5e8', '#f4cae4', '#e6f5c9', '#fff2ae', '#f1e2cc', '#cccccc'],
    accent: ['#7fc97f', '#beaed4', '#fdc086', '#ffff99', '#386cb0', '#f0027f', '#bf5b17', '#666666'],
    paired: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a', '#ffff99', '#b15928'],
    dark2: ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'],
    observable10: ['#4269d0', '#efb118', '#ff725c', '#6cc5b0', '#3ca951', '#ff8ab7', '#a463f2', '#97bbf5', '#9c6b4e', '#9498a0'],
};
