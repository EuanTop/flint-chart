// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { resolveCountry, resolveUsState } from '../chart-types/geo';

/**
 * The kinds of thing a list of values can prove itself to be: closed vocabularies whose every
 * member names its kind — a month is a month, France is a country. Codes (`FR`, `CA`, `FY24`) and
 * open sets (products, sectors, answers) prove nothing.
 */
export type SelfNamingKind = 'month' | 'weekday' | 'quarter' | 'year' | 'date' | 'country' | 'state' | 'continent';

const MONTHS = new Set([
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
]);
const WEEKDAYS = new Set([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
]);
const CONTINENTS = new Set(['africa', 'asia', 'europe', 'north america', 'south america', 'americas', 'oceania', 'antarctica']);

/** A code rather than a name: digits, or two or three capitals (`US`, `FRA`, `CA`). */
const isCode = (text: string) => /^\d+$/.test(text) || /^[A-Z]{2,3}$/.test(text);

const KIND_TESTS: Array<[SelfNamingKind, (text: string, raw: unknown) => boolean]> = [
    ['month', (text) => MONTHS.has(text.toLowerCase().replace(/\.$/, ''))],
    ['weekday', (text) => WEEKDAYS.has(text.toLowerCase().replace(/\.$/, ''))],
    ['quarter', (text) => /^(\d{4}\s*[-\s]?\s*)?Q[1-4](\s*[-\s]?\s*\d{4})?$/i.test(text)],
    ['year', (text) => /^(1[5-9]|20|21)\d{2}$/.test(text)],
    ['date', (text, raw) => raw instanceof Date || /^\d{4}-\d{2}(-\d{2})?([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?)?$/.test(text)],
    ['country', (text) => !isCode(text) && resolveCountry(text) !== undefined],
    ['state', (text) => !isCode(text) && resolveUsState(text) !== undefined],
    ['continent', (text) => CONTINENTS.has(text.toLowerCase())],
];

/**
 * The kind every value is, where all of them prove one: undefined where any does not, or there
 * are none. Empty values are passed over.
 */
export function selfNamingKind(values: Iterable<unknown>): SelfNamingKind | undefined {
    const seen: Array<{ text: string; raw: unknown }> = [];
    const distinct = new Set<string>();
    for (const raw of values) {
        if (raw == null) continue;
        const text = (raw instanceof Date ? raw.toISOString() : String(raw)).trim();
        if (!text || distinct.has(text)) continue;
        distinct.add(text);
        seen.push({ text, raw });
    }
    if (!seen.length) return undefined;
    return KIND_TESTS.find(([, test]) => seen.every(({ text, raw }) => test(text, raw)))?.[0];
}

/** The plain nouns a field of each kind may be called and still say no more than its values do. */
const KIND_NOUNS: Record<SelfNamingKind, string[]> = {
    month: ['month', 'monthofyear'],
    weekday: ['weekday', 'day', 'dayofweek'],
    quarter: ['quarter', 'qtr'],
    year: ['year', 'yr'],
    date: ['date', 'day'],
    country: ['country', 'nation'],
    state: ['state', 'usstate'],
    continent: ['continent', 'region', 'worldregion'],
};

/**
 * Whether a field's name says no more than its values prove: `Country`, `countries`,
 * `country_name` over country names. A name that says more — `Origin`, `Home team` — carries the
 * role the values play, and a key without it loses that.
 */
export function namedAsItsKind(field: string, kind: SelfNamingKind): boolean {
    const bare = field.toLowerCase().replace(/[^a-z]/g, '').replace(/names?$/, '');
    const forms = new Set([bare, bare.replace(/ies$/, 'y'), bare.replace(/s$/, '')]);
    return KIND_NOUNS[kind].some((noun) => forms.has(noun));
}
