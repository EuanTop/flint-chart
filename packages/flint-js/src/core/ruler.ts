const E10 = Math.sqrt(50);
const E5 = Math.sqrt(10);
const E2 = Math.SQRT2;

/** The tick step about `count` intervals over [start, stop] take: positive, or the negated reciprocal below 1. */
function tickIncrement(start: number, stop: number, count: number): number {
    const step = (stop - start) / Math.max(0, count);
    const power = Math.floor(Math.log10(step));
    const error = step / 10 ** power;
    const factor = error >= E10 ? 10 : error >= E5 ? 5 : error >= E2 ? 2 : 1;
    return power >= 0 ? factor * 10 ** power : -(10 ** -power) / factor;
}

/** A domain widened to whole steps of about `count` intervals, as a linear scale's `nice` does. */
export function niceDomain(start: number, stop: number, count: number): [number, number] {
    let lo = start;
    let hi = stop;
    let previous: number | undefined;
    for (let index = 0; index < 10; index += 1) {
        const step = tickIncrement(lo, hi, count);
        if (step === previous || step === 0 || !Number.isFinite(step)) break;
        if (step > 0) {
            lo = Math.floor(lo / step) * step;
            hi = Math.ceil(hi / step) * step;
        } else {
            lo = Math.ceil(lo * step) / step;
            hi = Math.floor(hi * step) / step;
        }
        previous = step;
    }
    return [lo, hi];
}

/** The multiples of a 1, 2 or 5 step within [start, stop], about `count` of them, as a linear scale ticks. */
export function niceTicks(start: number, stop: number, count: number): number[] {
    if (!(count > 0)) return [];
    if (start === stop) return [start];
    const step = tickIncrement(start, stop, count);
    if (!Number.isFinite(step) || step === 0) return [];
    return multiples(start, stop, step);
}

/** The multiples of `step` within [start, stop]; a negative step is the negated reciprocal of a step below 1. */
function multiples(start: number, stop: number, step: number): number[] {
    const out: number[] = [];
    if (step < 0) {
        const inc = -step;
        let i1 = Math.round(start * inc);
        let i2 = Math.round(stop * inc);
        if (i1 / inc < start) i1 += 1;
        if (i2 / inc > stop) i2 -= 1;
        for (let i = i1; i <= i2; i += 1) out.push(i / inc);
    } else {
        let i1 = Math.round(start / step);
        let i2 = Math.round(stop / step);
        if (i1 * step < start) i1 += 1;
        if (i2 * step > stop) i2 -= 1;
        for (let i = i1; i <= i2; i += 1) out.push(i * step);
    }
    return out;
}

/** The ruler Flint draws on a measure axis. */
export interface AxisRuler {
    domain: [number, number];
    values: number[];
}

export interface RulerInputs {
    /** The values the axis must show, before rounding. */
    extent: [number, number];
    /** Ends that stay where they are: semantic bounds, a stack's clean top, a template that turns rounding off. */
    fixed: { min: boolean; max: boolean };
    /** Whether the theme rules a grid, so the plot edge falls on a grid line. */
    grid: boolean;
    /** The tick count the theme asks for along this axis. */
    tickCount: number;
}

/**
 * The ruler a themed measure axis draws, as Vega-Lite draws it today: a gridded axis rounds its
 * free ends to the theme's tick count so the plot edge falls on a grid line, an ungridded one to
 * about ten intervals; ticks are the round steps of about the theme's count inside the domain.
 */
export function countRuler(inputs: RulerInputs): AxisRuler | undefined {
    const { extent, fixed, grid, tickCount } = inputs;
    const [lo, hi] = extent;
    if (!(hi > lo)) return undefined;
    const [niceLo, niceHi] = niceDomain(lo, hi, grid ? tickCount : 10);
    const domain: [number, number] = [fixed.min ? lo : niceLo, fixed.max ? hi : niceHi];
    return { domain, values: niceTicks(domain[0], domain[1], tickCount) };
}

export interface SpacingRulerInputs {
    extent: [number, number];
    /** Ends that stay where they are. */
    fixed: { min: boolean; max: boolean };
    /** Whether free ends round out to the step, so the plot edge falls on a grid line; otherwise they round as the backend's default does. */
    toStep: boolean;
    /** The axis's drawn length, in px. */
    length: number;
    /** The px between labels the theme graduates at. */
    spacing: number;
    /** The fewest px a set of tick values can stand apart without their labels touching. */
    minSpacing: (values: number[]) => number;
    /** The smallest step the axis can name: a whole unit for counts, or what the format prints. */
    minStep: number;
    /** Data units past each end where ticks still fall inside the drawn scale, as a dot's padding opens it. */
    overhang?: number;
}

/** The 1, 2 and 5 steps from below `smallest` up past `largest`. */
function roundSteps(smallest: number, largest: number): number[] {
    const out: number[] = [];
    for (let power = Math.floor(Math.log10(smallest)) - 1; power <= Math.ceil(Math.log10(largest)) + 1; power += 1) {
        for (const factor of [1, 2, 5]) out.push(power >= 0 ? factor * 10 ** power : factor / 10 ** -power);
    }
    return out;
}

/**
 * The ruler of a themed measure axis: the 1, 2 or 5 step nearest, in ratio, to the step that would
 * put the theme's spacing between labels across the data's span on the drawn axis, as a linear
 * scale picks its ticks for a count; with at least three ticks, no closer than labels can stand,
 * and no finer than the axis can name. Free ends round out to the step where a grid is drawn, so the plot
 * edge falls on a grid line; a fixed end takes only steps that land a tick on it, where any does.
 * Without a grid, free ends round as the backend's default does.
 */
export function spacingRuler(inputs: SpacingRulerInputs): AxisRuler | undefined {
    const { extent, fixed, toStep, length, spacing, minSpacing, minStep, overhang = 0 } = inputs;
    const [lo, hi] = extent;
    if (!(hi > lo) || !(length > 0)) return undefined;
    const [defaultLo, defaultHi] = niceDomain(lo, hi, 10);
    const onStep = (value: number, step: number) => Math.abs(value / step - Math.round(value / step)) < 1e-9;
    const desired = ((hi - lo) * spacing) / length;
    const off = (size: number) => Math.abs(Math.log(size / desired));
    // Nearest the desired step first; the first step that passes is the one the axis takes.
    const sizes = roundSteps((hi - lo) / 100, hi - lo)
        .filter((raw) => raw >= minStep - 1e-12)
        .sort((a, b) => off(a) - off(b));
    const lands = (size: number) => (!fixed.min || onStep(lo, size)) && (!fixed.max || onStep(hi, size));
    const ruler = (size: number): AxisRuler | undefined => {
        const step = size >= 1 ? size : -1 / size;
        const domain: [number, number] = [
            fixed.min ? lo : toStep ? +(Math.floor(lo / size + 1e-9) * size).toPrecision(12) : defaultLo,
            fixed.max ? hi : toStep ? +(Math.ceil(hi / size - 1e-9) * size).toPrecision(12) : defaultHi,
        ];
        const values = multiples(domain[0] - overhang, domain[1] + overhang, step).map((value) => +value.toPrecision(12));
        if (values.length < 3) return undefined;
        const px = (length * size) / (domain[1] - domain[0]);
        return px < minSpacing(values) ? undefined : { domain, values };
    };
    // Where a grid is drawn, a step that lands a tick on each fixed end wins over a nearer one that does not.
    if (toStep) {
        for (const size of sizes) {
            const found = lands(size) ? ruler(size) : undefined;
            if (found) return found;
        }
    }
    for (const size of sizes) {
        const found = ruler(size);
        if (found) return found;
    }
    return undefined;
}
