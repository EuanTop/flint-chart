/**
 * Number compaction: 1,250,000 → 1.25M. The theme says whether, how and where (its
 * `annotation.numberFormat.compact`); the field says whether it may be — by its semantic type
 * (an amount or a count, never a share, a rank, a year or an id) and by its unit (a value already
 * counted in millions is not compacted again).
 */
import { getRegistryEntry, isRegistered } from './type-registry';

/** How each power of a thousand is written. */
export type CompactStyle = 'short' | 'upper' | 'lower' | 'editorial' | 'si';

/** The suffixes for thousands, millions, billions and trillions. */
export const COMPACT_SUFFIXES: Record<CompactStyle, readonly [string, string, string, string]> = {
    // d3's own, with billions written B rather than SI's G.
    short: ['k', 'M', 'B', 'T'],
    // BI tools: Power BI, Tableau, Excel.
    upper: ['K', 'M', 'B', 'T'],
    // Lower-case throughout (Visa, Government of Canada).
    lower: ['k', 'm', 'b', 't'],
    // The Economist, the FT.
    editorial: ['k', 'm', 'bn', 'tn'],
    si: ['k', 'M', 'G', 'T'],
};

/** Where compaction applies. */
export type CompactTarget = 'axis' | 'labels';

/** A theme's compaction, resolved. */
export interface CompactRule {
    suffixes: readonly [string, string, string, string];
    /** `scale`: one unit for the whole ruler or label set, from its largest value. `value`: each value its own. */
    per: 'scale' | 'value';
    /** The least largest value that is compacted. */
    threshold: number;
    on: CompactTarget[];
    /** The semantic types (or their families) it applies to. */
    types: readonly string[];
    /** Fixed decimals for value labels, from the house's stated precision. */
    decimals?: number;
    /** Leave a set alone where three significant figures would print two values the same (d3's suffix rule). */
    distinct?: boolean;
}

/** The semantic types compacted unless the theme names its own. */
export const DEFAULT_COMPACT_TYPES = ['Amount', 'Price', 'Profit', 'Count', 'Number', 'Quantity'];

/** Units that already state a scale: a value in them is not compacted again. */
const SCALED_UNITS = /^(k|K|m|M|mn|mm|bn|b|B|tn|t|thousands?|millions?|billions?|trillions?|'?000s?|thousand\b.*|million\b.*|billion\b.*)$/;
/** A field name that states the scale in parentheses: `Population (m)`, `Debt ($bn)`, `Sales (000s)`. */
const SCALED_NAME = /\((?:[^)]*?\s)?\$?(k|K|m|M|mn|bn|tn|thousands?|millions?|billions?|trillions?|'?000s?)\)\s*$/;

/** A headline or deck that says the values are already scaled: `(millions)`, `$bn`, `'000s`. */
const SCALED_TEXT = /\b(thousands|millions|billions|trillions)\b|\(\s*[$£€]?\s*(k|m|mn|bn|tn)\s*\)|[$£€](k|m|mn|bn|tn)\b|\b(mn|bn|tn)\b|'000s?/i;

/**
 * Whether a field may be compacted: its semantic type is one the theme compacts (or, without a
 * registered type, it is a plain quantity), and neither its unit, its name nor the chart's
 * headline and deck already state a scale.
 */
export function compactApplies(
    field: { name?: string; semanticType?: string; unit?: string; isPercent?: boolean; said?: string },
    types: readonly string[],
): boolean {
    if (field.isPercent) return false;
    if (field.said && SCALED_TEXT.test(field.said)) return false;
    const unit = field.unit?.trim();
    if (unit && SCALED_UNITS.test(unit)) return false;
    if (field.name && SCALED_NAME.test(field.name)) return false;
    const type = field.semanticType;
    if (!type || type === 'Unknown' || !isRegistered(type)) return types === DEFAULT_COMPACT_TYPES;
    if (types.includes(type)) return true;
    // A type the theme names by its family (`Amount` covers `Price`).
    const entry = getRegistryEntry(type);
    return types.includes(entry.t1);
}

/** The unit a set of values is compacted to: the largest power of a thousand its largest value reaches. */
export function compactUnit(maxAbs: number, rule: CompactRule): { divisor: number; suffix: string } | undefined {
    if (!(maxAbs >= rule.threshold) || maxAbs < 1000) return undefined;
    const power = Math.min(4, Math.floor(Math.log10(maxAbs) / 3));
    return { divisor: 10 ** (3 * power), suffix: rule.suffixes[power - 1] };
}

/**
 * The decimals a set of values needs once divided: as few as print every value exactly (up to
 * two), for a ruler's ticks; or three significant figures at the top of the scale, for labels.
 */
export function compactDecimals(values: number[], divisor: number, mode: 'exact' | 'significant'): number {
    const scaled = values.filter(Number.isFinite).map((v) => Math.abs(v) / divisor);
    if (!scaled.length) return 0;
    if (mode === 'significant') {
        const top = Math.max(...scaled);
        return top > 0 ? Math.max(0, Math.min(2, 2 - Math.floor(Math.log10(top)))) : 0;
    }
    for (let p = 0; p <= 2; p++) {
        if (scaled.every((v) => Math.abs(v * 10 ** p - Math.round(v * 10 ** p)) < 1e-6)) return p;
    }
    return 2;
}

/** How a compacted set prints: one unit for all (`scale`), or each value its own (`value`). */
export type CompactPrint =
    | { per: 'scale'; divisor: number; suffix: string; decimals: number; trim: boolean }
    | { per: 'value'; suffixes: readonly string[]; threshold: number; below?: string; signed?: boolean; decimals?: number };

/** How a set of values prints under a rule, or undefined where the rule leaves them as they are. */
export function compactPrint(values: number[], rule: CompactRule, mode: 'exact' | 'significant', below?: string): CompactPrint | undefined {
    const maxAbs = Math.max(0, ...values.filter(Number.isFinite).map(Math.abs));
    if (rule.per === 'value') {
        if (!(maxAbs >= Math.max(1000, rule.threshold))) return undefined;
        if (rule.distinct) {
            const distinct = new Set(values.filter(Number.isFinite));
            if (new Set([...distinct].map((v) => Number(v.toPrecision(3)))).size < distinct.size) return undefined;
        }
        // A ruler's ticks keep the digits that tell them apart; labels take the house's stated precision.
        const decimals = mode === 'significant' ? rule.decimals : undefined;
        return { per: 'value', suffixes: rule.suffixes, threshold: Math.max(1000, rule.threshold), ...(below ? { below } : {}), ...(decimals !== undefined ? { decimals } : {}) };
    }
    const unit = compactUnit(maxAbs, rule);
    if (!unit) return undefined;
    const needed = compactDecimals(values, unit.divisor, mode);
    // A stated precision is for labels; a ruler's ticks keep only the digits that tell them apart.
    if (rule.decimals !== undefined && mode === 'significant') return { per: 'scale', ...unit, decimals: rule.decimals, trim: false };
    return { per: 'scale', ...unit, decimals: needed, trim: mode === 'significant' };
}

/** A value as it prints, compacted. */
export function formatCompact(value: number, print: CompactPrint, format: (pattern: string) => (n: number) => string): string {
    if (value === 0) return '0';
    if (print.per === 'scale') {
        return format(`,.${print.decimals}${print.trim ? '~' : ''}f`)(value / print.divisor) + print.suffix;
    }
    const a = Math.abs(value);
    const sign = print.signed ? '+' : '';
    if (a < print.threshold) return format(print.below ?? `${sign},.3~r`)(value);
    const power = Math.min(4, Math.floor(Math.log10(a) / 3));
    return format(print.decimals !== undefined ? `${sign},.${print.decimals}f` : `${sign}.3~r`)(value / 10 ** (3 * power)) + print.suffixes[power - 1];
}

/** The same, as a Vega expression over `value`. */
export function compactExpr(value: string, print: CompactPrint): string {
    const q = JSON.stringify;
    if (print.per === 'scale') {
        return `(${value} === 0 ? '0' : format(${value} / ${print.divisor}, ${q(`,.${print.decimals}${print.trim ? '~' : ''}f`)}) + ${q(print.suffix)})`;
    }
    const sign = print.signed ? '+' : '';
    let expr = `format(${value}, ${q(print.below ?? `${sign},.3~r`)})`;
    for (let power = 1; power <= 4; power++) {
        const at = 10 ** (3 * power);
        const floor = Math.max(at, print.threshold);
        const pattern = print.decimals !== undefined ? `${sign},.${print.decimals}f` : `${sign}.3~r`;
        expr = `(abs(${value}) >= ${floor} ? format(${value} / ${at}, ${q(pattern)}) + ${q(print.suffixes[power - 1])} : ${expr})`;
    }
    return `(${value} === 0 ? '0' : ${expr})`;
}
