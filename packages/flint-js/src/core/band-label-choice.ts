/**
 * What the names along a banded x axis do when they do not stand flat and whole. Two paths:
 *
 * - a row of names: `wrap` → `rotate45` (where the theme permits it) → `rotate90`;
 * - a sequence that explains itself (times, dates, months, years, ranks): `wrap` → `skip` →
 *   `rotate45` (where permitted) → `rotate90`.
 *
 * Trimming is not a step: any step may trim its names (`truncation: "never"` forbids it), and
 * whether a trimmed step beats moving on is a cost — what a reader loses: the share of each name
 * cut away, the size given up, a turn, a second line, wider bands, names left out. Every step is
 * tried at every size from the stated one down to the floor, so a slightly smaller name beats a
 * turned one. The path's order binds: a sequence that can skip does not turn, and a theme that
 * permits −45° turns names −45° before it stands them upright.
 */
import { fitTwoLineLabels } from './decisions';
import { roundSkip, type SequenceKind } from './label-sequence';
import type { LabelFitStep } from './theme/types';

/** What a turn costs a reader, beyond the characters it cuts: upright reads worse than −45°. */
export const TURN_COST = { rotate45: 0.3, rotate90: 0.34 } as const;
/** The cost of giving up the whole stated size (it scales with the share given up). */
export const SHRINK_COST = 0.25;
/** The cost of leaving out every name but one on a sequence axis (it scales with the share left out). */
export const SKIP_COST = 0.15;
/** The cost of setting every name on two lines (it scales with the share wrapped). */
export const WRAP_COST = 0.04;
/** The cost of widening the bands to fill the plot (it scales with the share of the plot widened), as the band fit charges it. */
export const EXPANSION_COST = 0.18;

/** The thresholds the choice is made against, from the theme's `labels.fit`. */
export interface LabelFitThresholds {
    /** Characters a trimmed name keeps before its ellipsis, below which a trim is not taken. */
    minChars: number;
    /** The widest a turned name runs before it is trimmed, in px. */
    turnedLimit: number;
    /** Space between two straight names, in em; `undefined` is half an em, at least 6px. */
    gapEm?: number;
}

export interface XLabelChoiceInput {
    /** The names as written, and as drawn (cased), in the same order. */
    values: string[];
    shown: string[];
    stated: number;
    floor: number;
    measure: (fontSize: number) => (text: string) => number;
    /** The band each name has now, and the band it would have filling the plot at its base size. */
    step: number;
    fillStep: number;
    /** The plot's span at its base size, which widening is measured against. */
    baseSpan: number;
    /** The names on two lines, or one, in bands the band fit widens (within the stretch budget) to hold them, with its cost; null where it cannot. */
    wrapAt: (fontSize: number, stretch: boolean) => { step: number; width: number; lines: string[][]; lineHeight: number; cost: number } | null;
    /** The steps the path takes, in order. */
    steps: readonly LabelFitStep[];
    sequence?: SequenceKind;
    /** No step may trim (`truncation: "never"`, or names that are codes). */
    noTrim: boolean;
    thresholds: LabelFitThresholds;
}

export interface XLabelChoice {
    /** `fit`: the names stand flat and whole as they are. */
    step: LabelFitStep | 'fit';
    /** The step trims its names to `limit`. */
    trimmed: boolean;
    fontSize: number;
    angle: 0 | -45 | -90;
    /** The band each name gets. */
    band: number;
    limit?: number;
    lines?: string[][];
    lineHeight?: number;
    /** `skip`: the names printed, on round values. */
    shown?: string[];
    /** The widest name as drawn plus the gap two names keep, in px. */
    needed: number;
    cost: number;
}

/** The share of each name a limit cuts away, averaged: 0 where every name runs within it. */
function cutLoss(texts: string[][], widthOf: (text: string) => number, limit: number, fontSize: number): number {
    if (!Number.isFinite(limit)) return 0;
    let sum = 0;
    for (const lines of texts) {
        const full = lines.reduce((total, line) => total + widthOf(line), 0);
        if (full <= 0) continue;
        const kept = lines.reduce((total, line) => total + (widthOf(line) <= limit ? widthOf(line) : Math.max(0, limit - fontSize)), 0);
        sum += Math.max(0, 1 - kept / full);
    }
    return sum / Math.max(1, texts.length);
}

/** The space two straight names keep at a size: the theme's, in em, else half an em and at least 6px. */
function gapAt(thresholds: LabelFitThresholds, size: number): number {
    return thresholds.gapEm !== undefined ? thresholds.gapEm * size : Math.max(6, size / 2);
}

/** Whether a trim to `width` keeps `minChars` characters and an ellipsis. */
function trimKeeps(width: number, fontSize: number, minChars: number): boolean {
    return width >= (minChars + 1) * fontSize * 0.6;
}

/** The cheapest way to set the names along the path, or undefined where there are none. */
export function chooseXLabels(input: XLabelChoiceInput): XLabelChoice | undefined {
    const { values, shown, stated, floor, step, fillStep, thresholds } = input;
    if (!shown.length || !(step > 0)) return undefined;
    const may = (way: LabelFitStep) => input.steps.includes(way) && (way !== 'skip' || input.sequence !== undefined);
    const trim = !input.noTrim;
    const count = shown.length;
    const span = Math.max(1, input.baseSpan);
    const widen = (band: number) => EXPANSION_COST * Math.max(0, Math.min(band * count, span) - Math.min(step * count, span)) / span;
    const options: XLabelChoice[] = [];
    const sizes: number[] = [];
    for (let size = stated; size >= floor - 1e-9; size -= 0.5) sizes.push(Math.round(size * 2) / 2);
    if (!sizes.length) sizes.push(stated);

    for (const size of sizes) {
        const widthOf = input.measure(size);
        const widest = Math.max(0, ...shown.map(widthOf));
        const gap = gapAt(thresholds, size);
        const needed = widest + gap;
        const shrink = SHRINK_COST * (stated - size) / stated;
        const one = shown.map((text) => [text]);
        const flatBand = Math.max(step, fillStep);

        // Flat and whole in the bands there are. Wider bands come only from the band fit, which keeps
        // to the stretch budget and to each panel of a facet.
        if (needed <= step) {
            options.push({ step: 'fit', trimmed: false, fontSize: size, angle: 0, band: step, needed, cost: shrink });
            continue;
        }
        // wrap: one line or two in bands the band fit widens; trimmed where its lines still overrun.
        for (const stretch of size === sizes[sizes.length - 1] ? [false, true] : [false]) {
            const held = input.wrapAt(size, stretch);
            if (!held) continue;
            const twoLines = held.lines.some((parts) => parts.length > 1);
            const loss = cutLoss(held.lines, widthOf, held.width, size);
            if (loss > 0 && (!trim || !trimKeeps(held.width, size, thresholds.minChars))) continue;
            if ((twoLines || loss > 0) && !may('wrap')) continue;
            options.push({
                step: twoLines || loss > 0 ? 'wrap' : 'fit', trimmed: loss > 0, fontSize: size, angle: 0, band: held.step, limit: held.width,
                ...(twoLines ? { lines: held.lines, lineHeight: held.lineHeight } : {}),
                needed, cost: held.cost + shrink,
            });
            break;
        }
        // wrap, trimmed to bands filling the plot: two lines where a name breaks, one line where it does not.
        const cutWidth = flatBand - gap;
        if (may('wrap') && trim && trimKeeps(cutWidth, size, thresholds.minChars)) {
            const fit = fitTwoLineLabels(shown, size, cutWidth, true, widthOf);
            const lines = fit?.lines ?? one;
            const wrapped = lines.filter((parts) => parts.length > 1).length / lines.length;
            options.push({
                step: 'wrap', trimmed: true, fontSize: size, angle: 0, band: flatBand, limit: Math.floor(cutWidth),
                ...(wrapped > 0 ? { lines, lineHeight: Math.ceil(size * 1.2) } : {}),
                needed, cost: cutLoss(lines, widthOf, cutWidth, size) + WRAP_COST * wrapped + widen(flatBand) + shrink,
            });
        }
        // skip: a sequence prints only its round values, whole — or trimmed to the room between them.
        if (may('skip') && input.sequence) {
            const whole = roundSkip(input.sequence, values, flatBand, needed);
            const room = trim ? roundSkip(input.sequence, values, flatBand, (thresholds.minChars + 1) * size * 0.6 + gap) : undefined;
            for (const [found, trimmed] of [[whole, false], [whole ? undefined : room, true]] as const) {
                if (!found) continue;
                const limit = Math.floor(found.spacing * flatBand - gap);
                const printed = found.shown.map((name) => [shown[values.indexOf(name)] ?? name]);
                options.push({
                    step: 'skip', trimmed, fontSize: size, angle: 0, band: flatBand, shown: found.shown,
                    ...(trimmed ? { limit } : {}),
                    needed, cost: SKIP_COST * (1 - found.shown.length / values.length) + (trimmed ? cutLoss(printed, widthOf, limit, size) : 0) + widen(flatBand) + shrink,
                });
            }
        }
        // rotate45 / rotate90: turned, whole — or trimmed to the turned limit.
        const line = size * 1.2;
        for (const [way, room] of [['rotate45', line * Math.SQRT2], ['rotate90', line]] as const) {
            if (!may(way) || step < room) continue;
            const loss = trim ? cutLoss(one, widthOf, thresholds.turnedLimit, size) : 0;
            options.push({
                step: way, trimmed: loss > 0, fontSize: size, angle: way === 'rotate45' ? -45 : -90, band: step,
                ...(trim && Number.isFinite(thresholds.turnedLimit) ? { limit: Math.floor(thresholds.turnedLimit) } : {}),
                needed, cost: TURN_COST[way] + loss + shrink,
            });
        }
    }

    // The path's order binds. A step that holds whole shuts out every later step (a trimmed earlier
    // step may still be cheaper); a sequence that can skip does not turn; −45°, where it holds, comes
    // before upright.
    const at = (option: XLabelChoice) => (option.step === 'fit' ? -1 : input.steps.indexOf(option.step));
    const wholeAt = Math.min(...options.filter((option) => !option.trimmed).map(at));
    let open = Number.isFinite(wholeAt) ? options.filter((option) => at(option) <= wholeAt) : options;
    if (open.some((option) => option.step === 'skip')) open = open.filter((option) => option.angle === 0);
    if (open.some((option) => option.angle === -45)) open = open.filter((option) => option.angle !== -90);
    if (open.length) return open.reduce((best, option) => (option.cost < best.cost ? option : best));

    // Nothing on the path holds: every name is still printed, upright and as small as the band needs.
    const size = Math.max(1, Math.min(floor, Math.floor((step / 1.2) * 2) / 2));
    const widthOf = input.measure(size);
    const widest = Math.max(0, ...shown.map(widthOf));
    return {
        step: 'rotate90', trimmed: trim && widest > thresholds.turnedLimit, fontSize: size, angle: -90, band: step,
        ...(trim && Number.isFinite(thresholds.turnedLimit) ? { limit: Math.floor(thresholds.turnedLimit) } : {}),
        needed: widest + gapAt(thresholds, size), cost: Infinity,
    };
}
