// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * The sign a colour category carries.
 *
 * A house that colours signed values (status inks, a diverging ramp) colours the *categories* by
 * sign only when the categories themselves carry one: a waterfall's increase / decrease, a set of
 * regions that each net a gain or a loss. A measure elsewhere on the chart dipping below zero says
 * nothing about the categories — months on a ridgeline of temperatures are not positive or
 * negative because some days were below freezing. Grounding (which decides) and realization
 * (which paints) read the sign the same way, here.
 */

export const NEGATIVE_WORDS = /\b(below|decrease|decline|loss|losses|negative|down|fall|deficit|shrink|worse)\b/i;
export const POSITIVE_WORDS = /\b(above|increase|growth|gain|gains|positive|up|rise|surplus|grow|better)\b/i;

export type SignRole = 'positive' | 'negative' | 'neutral';

/** Each category's sign: what its name says, else the sign of its measure's sum. */
export function categorySignRoles(
    table: readonly any[] | undefined,
    field: string,
    domain: readonly unknown[],
    measure: string | undefined,
): SignRole[] {
    return domain.map((value) => {
        const label = String(value);
        if (NEGATIVE_WORDS.test(label)) return 'negative';
        if (POSITIVE_WORDS.test(label)) return 'positive';
        if (!measure) return 'neutral';
        let sum = 0; let n = 0;
        for (const row of table ?? []) {
            if (row?.[field] !== value) continue;
            const v = Number(row?.[measure]);
            if (Number.isFinite(v)) { sum += v; n++; }
        }
        if (n === 0) return 'neutral';
        return sum < 0 ? 'negative' : sum > 0 ? 'positive' : 'neutral';
    });
}

/** Do the categories split by sign — at least two of positive, negative and neutral among them? */
export function categoriesSplitBySign(roles: readonly SignRole[]): boolean {
    return new Set(roles).size >= 2;
}
