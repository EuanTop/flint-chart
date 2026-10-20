import { inspectEncodingSort } from './resolve-semantics';
import { inferVisCategory } from './semantic-types';
import { toTypeString, type SemanticAnnotation } from './field-semantics';
import type { ChannelSemantics, ChartEncoding } from './types';

/** The order a channel's categories stand in. Backend-neutral. */
export type CategoryOrder =
    /** These values, in this order. */
    | { by: 'values'; values: unknown[] }
    /** The order the rows first meet them. */
    | { by: 'data' }
    /** Their own values, ascending or descending. */
    | { by: 'value'; descending: boolean }
    /** Another channel's value at each category. */
    | { by: 'channel'; channel: string; descending: boolean }
    /** Another field's smallest value at each category. */
    | { by: 'field'; field: string; descending: boolean };

/**
 * The type a channel draws its field as: the semantics', unless stated; facets are discrete; an
 * aggregate is a quantity. Undefined where the channel has no field to draw.
 */
export function encodedType(channel: string, encoding: ChartEncoding, cs: ChannelSemantics | undefined): string | undefined {
    if (!encoding.field) return encoding.aggregate === 'count' ? 'quantitative' : undefined;
    if (encoding.aggregate) return 'quantitative';
    if (encoding.type) return encoding.type;
    const type = cs?.type || 'nominal';
    if ((channel === 'column' || channel === 'row') && type !== 'nominal' && type !== 'ordinal') return 'nominal';
    return type;
}

/**
 * The areas a size channel spans, in px²: the largest a fair share of the canvas per row allows at
 * 60%, between 16 and Vega-Lite's 361; the smallest 9 for a quantity, else a quarter of the largest.
 * A theme's range for quantities replaces both, and its smallest area is a floor under the smallest.
 */
export function sizeRange(
    quantitative: boolean, canvas: { width: number; height: number }, rowCount: number,
    house?: { sizeRange?: [number, number]; minSize?: number },
): [number, number] {
    if (house?.sizeRange) return house.sizeRange;
    const fairShare = (canvas.width * canvas.height) / Math.max(rowCount, 1);
    const largest = Math.round(Math.max(16, Math.min(361, fairShare * 0.6)));
    const smallest = quantitative ? 9 : Math.round(largest / 4);
    return [Math.max(smallest, house?.minSize ?? 0), largest];
}

export interface CategoryOrderInputs {
    channel: string;
    encoding: ChartEncoding;
    encodings: Record<string, ChartEncoding>;
    cs: ChannelSemantics | undefined;
    /** The rows as the author gave them. */
    data: any[];
    semanticTypes: Record<string, string | SemanticAnnotation>;
}

/**
 * The order a channel's categories stand in, or undefined to leave the backend's.
 *
 * An author's order wins: by another channel (descending unless asked otherwise, except along
 * itself), by another field's smallest value, by a list of values, or by the categories
 * themselves in a canonical order (months, weekdays) where they have one. Otherwise a discrete
 * axis keeps its canonical order, numbers ascend, and anything else keeps the order the rows
 * first meet it, which keeps "Stage 2" before "Stage 10". Lists keep the field's own value types.
 */
export function categoryOrder(inputs: CategoryOrderInputs): CategoryOrder | undefined {
    const { channel, encoding, encodings, cs, data, semanticTypes } = inputs;
    const fieldName = encoding.field;
    const type = encodedType(channel, encoding, cs);
    const dataFields = new Set(data.flatMap((row) => Object.keys(row)));
    const fieldIsNumeric = fieldName ? data.some((row) => typeof row[fieldName] === 'number') : false;
    const keepTypes = (values: unknown[]): unknown[] => !fieldIsNumeric ? values : values.map((value) => {
        if (typeof value === 'string') {
            const number = Number(value);
            if (!isNaN(number) && String(number) === value.trim()) return number;
        }
        return value;
    });
    // Numbers in time order (years, decades) sort by value: the same order, whatever type each stage holds them in.
    const canonicalOrder = cs?.ordinalSortOrder;
    const ascendingNumbers = fieldIsNumeric && Boolean(canonicalOrder?.length) && canonicalOrder!.every((value, index) =>
        Number.isFinite(Number(value)) && (index === 0 || Number(value) > Number(canonicalOrder![index - 1])));

    if (encoding.sortBy !== undefined || encoding.sortOrder !== undefined) {
        const explicit = inspectEncodingSort(encoding, channel, encodings, dataFields).sort;
        if (encoding.sortBy === undefined) {
            if (!encoding.sortOrder) return undefined;
            const canonical = cs?.ordinalSortOrder;
            if (ascendingNumbers) return { by: 'value', descending: encoding.sortOrder === 'descending' };
            return canonical?.length
                ? { by: 'values', values: keepTypes(encoding.sortOrder === 'descending' ? [...canonical].reverse() : canonical) }
                : { by: 'value', descending: encoding.sortOrder === 'descending' };
        }
        if (encoding.sortBy === 'x' || encoding.sortBy === 'y') {
            const descending = encoding.sortBy === channel ? encoding.sortOrder === 'descending' : encoding.sortOrder !== 'ascending';
            return { by: 'channel', channel: encoding.sortBy, descending };
        }
        if (encoding.sortBy === 'color') {
            return encodings.color?.field ? { by: 'channel', channel: 'color', descending: encoding.sortOrder !== 'ascending' } : undefined;
        }
        if (explicit?.kind === 'field') {
            const descending = encoding.sortOrder === 'descending';
            return explicit.field === fieldName ? { by: 'value', descending } : { by: 'field', field: explicit.field, descending };
        }
        if (explicit?.kind === 'values' && type !== 'temporal' && fieldName) {
            let values: unknown[] = explicit.values;
            const semanticType = toTypeString(semanticTypes[fieldName]);
            if (inferVisCategory(data.map((row) => row[fieldName])) === 'temporal' || semanticType === 'Year' || semanticType === 'Decade') {
                values = values.map((value) => String(value));
            }
            values = keepTypes(values);
            return { by: 'values', values: encoding.sortOrder === 'descending' ? [...values].reverse() : values };
        }
        return undefined;
    }
    if (type !== 'nominal' && type !== 'ordinal') return undefined;
    if (cs?.ordinalSortOrder && cs.ordinalSortOrder.length > 0 && !ascendingNumbers) return { by: 'values', values: keepTypes(cs.ordinalSortOrder) };
    if (fieldIsNumeric && fieldName) return { by: 'value', descending: false };
    return { by: 'data' };
}
