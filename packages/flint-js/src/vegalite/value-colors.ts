/**
 * Colours a chart binds to values (the field annotation `colors`), written into a Vega-Lite scale. A
 * themed chart gets them through the theme's series inks; a chart without a theme gets them here,
 * with the values left unbound taking the chart's scheme in order, minus the bound colours.
 */
import type { ChannelSemantics } from '../core/types';
import { CATEGORICAL_SCHEMES, chartValueColors, valueKey } from '../core/value-colors';

/**
 * The values of a discrete colour field in the order Vega-Lite gives its scale: a stated domain, else
 * the encoding's sort over the rows the view reads. Unset when another channel sets the order.
 */
export function discreteDomain(enc: any, table: any[]): unknown[] | undefined {
    if (Array.isArray(enc.scale?.domain)) return enc.scale.domain;
    const field = enc.field;
    if (typeof field !== 'string') return undefined;
    const values: unknown[] = [];
    const seen = new Set<unknown>();
    for (const row of table ?? []) {
        const v = row?.[field];
        if (v == null || seen.has(v)) continue;
        seen.add(v);
        values.push(v);
    }
    if (!values.length) return undefined;
    const ascending = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);
    const sort = enc.sort;
    if (sort === null) return values;
    if (sort === undefined || sort === 'ascending') return values.sort(ascending);
    if (sort === 'descending') return values.sort(ascending).reverse();
    if (Array.isArray(sort)) return [...sort.filter((v) => seen.has(v)), ...values.filter((v) => !sort.includes(v))];
    return undefined;
}

const COLOUR_CHANNELS = ['color', 'fill', 'stroke'] as const;

function eachNode(node: any, visit: (node: any) => void): void {
    if (!node || typeof node !== 'object') return;
    visit(node);
    for (const key of ['layer', 'concat', 'hconcat', 'vconcat'] as const) for (const child of node[key] ?? []) eachNode(child, visit);
    if (node.spec) eachNode(node.spec, visit);
}

/** Bind the chart's value colours on every discrete colour scale over an annotated field (no theme). */
export function applyChartValueColors(spec: any, channelSemantics: Record<string, ChannelSemantics>, table: any[]): void {
    const byField = new Map<string, Record<string, string>>();
    for (const cs of Object.values(channelSemantics ?? {})) {
        const colors = chartValueColors(cs);
        if (colors && cs.field) byField.set(cs.field, colors);
    }
    if (!byField.size) return;
    eachNode(spec, (node) => {
        for (const channel of COLOUR_CHANNELS) {
            const enc = node.encoding?.[channel];
            const colors = enc?.field ? byField.get(enc.field) : undefined;
            if (!colors || enc.type === 'quantitative' || enc.type === 'temporal') continue;
            const rows = Array.isArray(node.data?.values) ? node.data.values : Array.isArray(spec.data?.values) ? spec.data.values : table;
            const domain = discreteDomain(enc, rows);
            if (!domain?.some((v) => colors[valueKey(v)])) continue;
            const reserved = new Set(Object.values(colors).map((c) => c.toLowerCase()));
            const stated = Array.isArray(enc.scale?.range) ? enc.scale.range : CATEGORICAL_SCHEMES[enc.scale?.scheme ?? 'tableau10'] ?? CATEGORICAL_SCHEMES.tableau10;
            const free = stated.filter((c: string) => !reserved.has(String(c).toLowerCase()));
            let next = 0;
            const range = domain.map((v) => colors[valueKey(v)] ?? free[next++ % Math.max(1, free.length)] ?? stated[0]);
            const { scheme: _scheme, ...scale } = enc.scale ?? {};
            void _scheme;
            enc.scale = { ...scale, domain, range };
        }
    });
}
